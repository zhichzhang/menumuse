import type { ActionHandler, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { catalogById, cartTotal, lineIdentity, type CartData, type CartLine, type OrderData } from '../data/catalog'
import { runOrderTurn } from '../server/ordering'

const cartIdFor = (userId: string) => `cart-${userId}`

async function ownCart(tools: ActionTools, userId: string): Promise<{ id: string; cart: CartData }> {
  const id = cartIdFor(userId)
  const existing = await tools.query<CartData>('carts', { where: { ownerId: userId }, limit: 1 })
  if (!existing.success) throw new Error(existing.error)
  if (existing.data.records.length) {
    const record = existing.data.records[0]
    if (record.data.ownerId !== userId) throw new Error('Cart ownership mismatch')
    return { id: record.recordId, cart: record.data }
  }

  const cart: CartData = { ownerId: userId, status: 'active', lines: [], revision: 0 }
  const created = await tools.create('carts', cart, id)
  if (!created.success) {
    // Another tab may have created the same deterministic cart concurrently.
    const retry = await tools.get<CartData>('carts', id)
    if (!retry.success || retry.data.record.data.ownerId !== userId) throw new Error(created.error)
    return { id, cart: retry.data.record.data }
  }
  return { id, cart }
}

function validModifiers(itemId: string, input: unknown): Record<string, string> | null {
  const item = catalogById.get(itemId)
  if (!item || !input || typeof input !== 'object' || Array.isArray(input)) return null
  const selections = input as Record<string, unknown>
  if (Object.keys(selections).some((key) => !(key in item.modifiers))) return null
  const result: Record<string, string> = {}
  for (const [group, value] of Object.entries(selections)) {
    if (typeof value !== 'string' || !item.modifiers[group].includes(value)) return null
    result[group] = value
  }
  return result
}

export const actions: Record<string, ActionHandler<Env>> = {
  placeOrder: async ({ userId, tools }) => {
    try {
      const { id, cart } = await ownCart(tools, userId)
      if (cart.status !== 'active' || cart.lines.length === 0) return { success: false, error: 'Add an item before placing an order.' }
      const order: OrderData = {
        ownerId: userId,
        lines: cart.lines.map((line) => ({ ...line, itemName: catalogById.get(line.itemId)?.name, unitPriceCents: catalogById.get(line.itemId)?.priceCents })),
        totalCents: cartTotal(cart.lines), placedAt: new Date().toISOString(),
      }
      const orderId = `order-${userId}-${cart.revision}`
      const created = await tools.create('orders', order, orderId)
      if (!created.success) {
        const earlier = await tools.get<OrderData>('orders', orderId)
        if (!earlier.success || earlier.data.record.data.ownerId !== userId) return { success: false, error: created.error }
      }
      const cleared = await tools.update<CartData>('carts', id, { lines: [], revision: cart.revision + 1 })
      if (!cleared.success) return { success: false, error: `Order ${orderId} was saved, but the cart did not clear. Refresh before ordering again.` }
      return { success: true, data: { orderId } }
    } catch {
      return { success: false, error: 'Could not place your order. Try again.' }
    }
  },
  orderWithAI: async ({ userId, tools, params }) => {
    const message = params.message
    if (typeof message !== 'string' || !message.trim() || message.length > 400) {
      return { success: false, error: 'Enter a request under 400 characters.' }
    }
    try {
      const { id, cart } = await ownCart(tools, userId)
      if (cart.status !== 'active') return { success: false, error: 'This order is closed.' }
      return await runOrderTurn(tools, userId, id, cart, message.trim())
    } catch {
      return { success: false, error: 'Could not open your order. Please try again.' }
    }
  },
  ensureCart: async ({ userId, tools }) => {
    try {
      const { id } = await ownCart(tools, userId)
      return { success: true, data: { cartId: id } }
    } catch {
      return { success: false, error: 'Could not open your cart. Please try again.' }
    }
  },

  editCart: async ({ userId, tools, params }) => {
    const operation = params.operation
    if (!['add', 'setQuantity', 'remove', 'clear'].includes(String(operation))) {
      return { success: false, error: 'Unknown cart operation.' }
    }

    try {
      // The client supplies no trusted owner ID or price. Always load the
      // caller's own record before editing, as action tools bypass record RBAC.
      const { id, cart } = await ownCart(tools, userId)
      if (cart.status !== 'active') return { success: false, error: 'This order is closed.' }
      let lines: CartLine[] = cart.lines.map((line) => ({ ...line, modifiers: { ...line.modifiers } }))

      if (operation === 'add') {
        const itemId = params.itemId
        const quantity = params.quantity ?? 1
        if (typeof itemId !== 'string' || !catalogById.has(itemId)) {
          return { success: false, error: 'This item is not on the menu.' }
        }
        if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 20) {
          return { success: false, error: 'Choose a quantity between 1 and 20.' }
        }
        const modifiers = validModifiers(itemId, params.modifiers ?? {})
        if (!modifiers) return { success: false, error: 'Select available options for this item.' }
        const identity = lineIdentity(itemId, modifiers)
        const existing = lines.find((line) => lineIdentity(line.itemId, line.modifiers) === identity)
        if (existing) {
          if (existing.quantity + Number(quantity) > 20) return { success: false, error: 'Maximum 20 per item.' }
          existing.quantity += Number(quantity)
        } else {
          lines.push({ id: crypto.randomUUID(), itemId, quantity: Number(quantity), modifiers })
        }
      } else if (operation === 'clear') {
        lines = []
      } else {
        const lineId = params.lineId
        const line = lines.find((entry) => entry.id === lineId)
        if (!line) return { success: false, error: 'This cart item no longer exists.' }
        if (operation === 'remove') {
          lines = lines.filter((entry) => entry.id !== line.id)
        } else {
          const quantity = params.quantity
          if (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 20) {
            return { success: false, error: 'Choose a quantity between 1 and 20.' }
          }
          line.quantity = Number(quantity)
        }
      }

      const saved = await tools.update<CartData>('carts', id, { lines, revision: cart.revision + 1 })
      if (!saved.success) return { success: false, error: saved.error }
      return { success: true, data: { cartId: id, revision: cart.revision + 1 } }
    } catch {
      return { success: false, error: 'Could not update your cart. Please try again.' }
    }
  },
}

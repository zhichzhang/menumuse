import type { ActionTools } from 'deepspace/worker'
import { catalog, catalogById, cartTotal, lineIdentity, type CartData, type CartLine, type CatalogItem } from '../data/catalog'
import normalizationPrompt from './prompts/action-normalization-lite.txt?raw'

export type OrderTurn = {
  ownerId: string
  cartId: string
  input: string
  reply: string
  status: string
  requestedAt: string
  steps: Array<{ type: string; item?: string; outcome: string }>
}

type Normalized = { status?: string; question?: string; actions?: unknown[] }
type Proposed = { type?: string; target_text?: string; quantity?: number; modifiers?: Record<string, string>; reference?: { type?: string; action_index?: number; cart_item_id?: string } | null }

function textFromCompletion(value: unknown): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') throw new Error('The assistant returned no response.')
  const body = value as Record<string, unknown>
  const choice = (body.choices as Array<{ message?: { content?: unknown } }> | undefined)?.[0]?.message?.content
  const content = choice ?? body.content ?? body.text ?? body.output
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((part) => typeof part === 'string' ? part : (part as { text?: string }).text ?? '').join('')
  throw new Error('The assistant response format needs checking.')
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\b(a|an|the|some|please|my|order|of)\b/g, ' ').replace(/\s+/g, ' ').trim()
}

function resolveItem(target: unknown): CatalogItem | undefined {
  if (typeof target !== 'string') return undefined
  const needle = normalizeName(target)
  if (!needle) return undefined
  const matches = catalog.filter((item) => {
    const name = normalizeName(item.name)
    return item.id === target || name === needle || name.includes(needle) || needle.includes(name)
  })
  return matches.length === 1 ? matches[0] : undefined
}

function resolveLine(action: Proposed, lines: CartLine[], lastAdded: CartLine | undefined): CartLine | undefined {
  const reference = action.reference
  if (reference?.type === 'previous_action' && lastAdded) return lastAdded
  if (reference?.cart_item_id) return lines.find((line) => line.id === reference.cart_item_id)
  const target = typeof action.target_text === 'string' ? normalizeName(action.target_text) : ''
  if (['it', 'that', 'last one', 'the last one'].includes(target) && lastAdded) return lastAdded
  const item = resolveItem(target)
  const matches = item ? lines.filter((line) => line.itemId === item.id) : []
  return matches.length === 1 ? matches[0] : undefined
}

function checkedModifiers(item: CatalogItem, proposed: unknown): Record<string, string> | undefined {
  if (proposed === undefined || proposed === null) return {}
  if (typeof proposed !== 'object' || Array.isArray(proposed)) return undefined
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(proposed)) {
    if (typeof value !== 'string' || !item.modifiers[key]?.includes(value)) return undefined
    result[key] = value
  }
  return result
}

function execute(actions: unknown[], original: CartLine[]) {
  const lines = original.map((line) => ({ ...line, modifiers: { ...line.modifiers } }))
  const steps: OrderTurn['steps'] = []
  let lastAdded: CartLine | undefined = undefined
  if (actions.length > 4) return { question: 'Please split that into requests of up to four changes.' }
  for (const raw of actions) {
    if (!raw || typeof raw !== 'object') return { question: 'Could you rephrase your order?' }
    const action = raw as Proposed
    if (action.type === 'view_cart') {
      steps.push({ type: 'view_cart', outcome: 'Viewed order' })
      continue
    }
    if (action.type === 'clear_cart') {
      lines.splice(0)
      steps.push({ type: 'clear_cart', outcome: 'Cleared order' })
      continue
    }
    if (action.type === 'add_item') {
      const item = resolveItem(action.target_text)
      if (!item) return { question: `Which menu item did you mean by “${String(action.target_text ?? 'that')}”?` }
      const quantity = action.quantity ?? 1
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return { question: 'How many would you like? Choose 1 to 20.' }
      const modifiers = checkedModifiers(item, action.modifiers)
      if (!modifiers) return { question: `Which available options would you like for ${item.name}?` }
      const found = lines.find((line) => lineIdentity(line.itemId, line.modifiers) === lineIdentity(item.id, modifiers))
      if (found) {
        if (found.quantity + quantity > 20) return { question: 'The limit is 20 of each selection.' }
        found.quantity += quantity
        lastAdded = found
      } else {
        lastAdded = { id: crypto.randomUUID(), itemId: item.id, quantity, modifiers }
        lines.push(lastAdded)
      }
      steps.push({ type: 'add_item', item: item.name, outcome: `Added ${quantity} × ${item.name}` })
      continue
    }
    if (['remove_item', 'update_quantity', 'modify_item'].includes(action.type ?? '')) {
      const line = resolveLine(action, lines, lastAdded)
      if (!line) return { question: `Which item in your order did you mean by “${String(action.target_text ?? 'that')}”?` }
      const item = catalogById.get(line.itemId)!
      if (action.type === 'remove_item') {
        lines.splice(lines.indexOf(line), 1)
        steps.push({ type: action.type, item: item.name, outcome: `Removed ${item.name}` })
      } else if (action.type === 'update_quantity') {
        const quantity = action.quantity
        if (!Number.isInteger(quantity) || quantity! < 1 || quantity! > 20) return { question: 'What total quantity would you like? Choose 1 to 20.' }
        line.quantity = quantity!
        steps.push({ type: action.type, item: item.name, outcome: `Set ${item.name} to ${quantity}` })
      } else {
        const modifiers = checkedModifiers(item, action.modifiers)
        if (!modifiers || !Object.keys(modifiers).length) return { question: `Which available option would you like for ${item.name}?` }
        line.modifiers = { ...line.modifiers, ...modifiers }
        steps.push({ type: 'modify_item', item: item.name, outcome: `Changed ${item.name}` })
      }
      continue
    }
    return { question: 'Could you tell me what you would like to add or change?' }
  }
  return { lines, steps }
}

export async function runOrderTurn(tools: ActionTools, userId: string, cartId: string, cart: CartData, message: string) {
  const now = new Date()
  const existing = await tools.query<OrderTurn>('order-turns', { where: { ownerId: userId }, orderBy: 'requestedAt', orderDir: 'desc', limit: 50 })
  if (!existing.success) return { success: false as const, error: 'Could not check AI usage. Try again.' }
  const today = now.toISOString().slice(0, 10)
  if (existing.data.records.filter((entry) => entry.data.requestedAt?.startsWith(today)).length >= 12) {
    return { success: false as const, error: 'You have used today’s 12 AI requests. The menu and cart still work.' }
  }

  const turn: OrderTurn = { ownerId: userId, cartId, input: message, reply: '', status: 'processing', requestedAt: now.toISOString(), steps: [] }
  const created = await tools.create('order-turns', turn)
  if (!created.success) return { success: false as const, error: 'Could not start this request. Try again.' }
  const turnId = created.data.recordId
  try {
    const context = cart.lines.map((line) => ({ id: line.id, item: catalogById.get(line.itemId)?.name, quantity: line.quantity, modifiers: line.modifiers }))
    const prompt = normalizationPrompt
      .replace('Bistro AI', 'MenuMuse')
      .replace('{{CURRENT_CART_CONTEXT}}', JSON.stringify(context))
      .replace('{{RECENT_ACTION_CONTEXT}}', JSON.stringify(existing.data.records.slice(0, 3).map((entry) => entry.data.steps)))
      .replace('{{USER_MESSAGE}}', message)
    const result = await tools.integration('openai/chat-completion', {
      model: 'gpt-5.4-mini', max_tokens: 700, temperature: 0,
      messages: [
        { role: 'system', content: `You normalize restaurant requests into JSON. Menu: ${JSON.stringify(catalog.map((item) => ({ id: item.id, name: item.name, modifiers: item.modifiers })))}. Use exact menu names for target_text. Never invent an option. At most four actions.` },
        { role: 'user', content: prompt },
      ],
    })
    if (!result.success) throw new Error(result.error)
    const response = textFromCompletion(result.data).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(response) as Normalized
    const plan = parsed.status === 'needs_clarification'
      ? { question: 'Could you clarify your order?' }
      : Array.isArray(parsed.actions) ? execute(parsed.actions, cart.lines) : { question: 'Could you rephrase your order?' }
    if ('question' in plan && plan.question) {
      const reply = parsed.status === 'needs_clarification' && typeof parsed.question === 'string' ? parsed.question.slice(0, 240) : plan.question
      await tools.update<OrderTurn>('order-turns', turnId, { status: 'clarify', reply })
      return { success: true as const, data: { reply, status: 'clarify' } }
    }
    if (!('lines' in plan) || !plan.lines || !('steps' in plan) || !plan.steps) throw new Error('Invalid order plan')
    const reply = plan.steps.length ? `${plan.steps.map((step) => step.outcome).join('. ')}. Subtotal: $${(cartTotal(plan.lines) / 100).toFixed(2)}.` : 'Your order is unchanged.'
    if (JSON.stringify(plan.lines) !== JSON.stringify(cart.lines)) {
      const saved = await tools.update<CartData>('carts', cartId, { lines: plan.lines, revision: cart.revision + 1 })
      if (!saved.success) throw new Error(saved.error)
    }
    await tools.update<OrderTurn>('order-turns', turnId, { status: 'done', reply, steps: plan.steps })
    return { success: true as const, data: { reply, status: 'done' } }
  } catch {
    await tools.update<OrderTurn>('order-turns', turnId, { status: 'failed', reply: 'I could not process that. Please try the menu controls or rephrase.' })
    return { success: false as const, error: 'The assistant could not process that. Please try again.' }
  }
}

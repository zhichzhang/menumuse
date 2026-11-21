import menu from './menu.json'

export type CatalogItem = {
  id: string
  name: string
  category: string
  priceCents: number
  modifiers: Record<string, string[]>
  defaults: Record<string, string>
  surcharges: Record<string, Record<string, number>>
}

export type CartLine = {
  id: string
  itemId: string
  quantity: number
  modifiers: Record<string, string>
  note?: string
}

export type CartData = {
  ownerId: string
  status: 'active' | 'submitted'
  lines: CartLine[]
  revision: number
}

export type OrderLine = CartLine & { itemName?: string; unitPriceCents?: number }
export type OrderData = { ownerId: string; lines: OrderLine[]; totalCents: number; placedAt: string }

// The source menu is the original project's curated catalog. The original
// Drive share-page URLs are replaced with a local nine-photo sheet.
export const categories = menu.categories.map((category) => category.name)

// Dollar amounts are in cents. The source catalog keeps the original nine
// dishes; this table is the bistro's explicit default and add-on pricing policy.
const menuRules: Record<string, { defaults: Record<string, string>; surcharges: Record<string, Record<string, number>>; addOns?: string[] }> = {
  sandwich_beef: { defaults: { size: 'single', cheese: 'no', spice: 'mild', add_on: 'none' }, surcharges: { size: { double: 350 }, cheese: { yes: 75 }, add_on: { bacon: 125 } }, addOns: ['none', 'bacon'] },
  sandwich_chicken: { defaults: { size: 'single', spice: 'mild', add_on: 'none' }, surcharges: { size: { double: 300 }, add_on: { 'extra chicken': 250 } }, addOns: ['none', 'extra chicken'] },
  sandwich_veggie: { defaults: { size: 'single', cheese: 'no', sauce: 'mayo', toasted: 'yes', add_on: 'none' }, surcharges: { size: { double: 250 }, cheese: { yes: 75 }, sauce: { pesto: 50, chipotle: 25 }, add_on: { avocado: 150 } }, addOns: ['none', 'avocado'] },
  fries: { defaults: { size: 'small' }, surcharges: { size: { large: 150 } } },
  chicken_nuggets: { defaults: { sauce: 'bbq' }, surcharges: {} },
  coke: { defaults: { size: 'small', ice: 'with ice' }, surcharges: { size: { medium: 50, large: 100 } } },
  sprite: { defaults: { size: 'small', ice: 'with ice' }, surcharges: { size: { medium: 50, large: 100 } } },
  water: { defaults: { size: 'small', ice: 'with ice' }, surcharges: { size: { medium: 50, large: 100 } } },
  ice_cream: { defaults: { flavor: 'vanilla' }, surcharges: {} },
}

export const catalog: CatalogItem[] = menu.categories.flatMap((category) =>
  category.items.map((item) => {
    const rule = menuRules[item.id]
    return {
      id: item.id,
      name: item.name,
      category: category.name,
      priceCents: Math.round(item.price * 100),
      modifiers: { ...item.modifiers, ...(rule.addOns ? { add_on: rule.addOns } : {}) },
      defaults: rule.defaults,
      surcharges: rule.surcharges,
    }
  }),
)

export const catalogById = new Map(catalog.map((item) => [item.id, item]))

/** One local image sheet keeps all nine menu photos reliable and cacheable. */
export function menuPhotoPosition(itemId: string): string {
  const index = catalog.findIndex((item) => item.id === itemId)
  if (index < 0) return '50% 50%'
  return `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`
}

export function normalizeModifiers(item: CatalogItem, input: unknown): Record<string, string> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const selections = input as Record<string, unknown>
  if (Object.keys(selections).some((group) => !(group in item.modifiers))) return null
  const result = { ...item.defaults }
  for (const [group, choice] of Object.entries(selections)) {
    if (typeof choice !== 'string' || !item.modifiers[group].includes(choice)) return null
    result[group] = choice
  }
  return result
}

export function unitPriceCents(item: CatalogItem, modifiers: Record<string, string>): number {
  const selections = normalizeModifiers(item, modifiers)
  if (!selections) throw new Error('Invalid menu selection')
  return item.priceCents + Object.entries(selections).reduce((total, [group, choice]) =>
    total + (item.surcharges[group]?.[choice] ?? 0), 0)
}

export function optionPriceCents(item: CatalogItem, group: string, choice: string): number {
  return item.surcharges[group]?.[choice] ?? 0
}

export function lineIdentity(itemId: string, modifiers: Record<string, string>, note = ''): string {
  return JSON.stringify([itemId, Object.entries(modifiers).sort(([a], [b]) => a.localeCompare(b)), note])
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => {
    const item = catalogById.get(line.itemId)
    return sum + (item ? unitPriceCents(item, line.modifiers) * line.quantity : 0)
  }, 0)
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

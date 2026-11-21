import menu from './menu.json'

export type CatalogItem = {
  id: string
  name: string
  category: string
  priceCents: number
  modifiers: Record<string, string[]>
}

export type CartLine = {
  id: string
  itemId: string
  quantity: number
  modifiers: Record<string, string>
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

export const catalog: CatalogItem[] = menu.categories.flatMap((category) =>
  category.items.map((item) => ({
    id: item.id,
    name: item.name,
    category: category.name,
    priceCents: Math.round(item.price * 100),
    modifiers: item.modifiers,
  })),
)

export const catalogById = new Map(catalog.map((item) => [item.id, item]))

/** One local image sheet keeps all nine menu photos reliable and cacheable. */
export function menuPhotoPosition(itemId: string): string {
  const index = catalog.findIndex((item) => item.id === itemId)
  if (index < 0) return '50% 50%'
  return `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`
}

export function lineIdentity(itemId: string, modifiers: Record<string, string>): string {
  return JSON.stringify([itemId, Object.entries(modifiers).sort(([a], [b]) => a.localeCompare(b))])
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + (catalogById.get(line.itemId)?.priceCents ?? 0) * line.quantity, 0)
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

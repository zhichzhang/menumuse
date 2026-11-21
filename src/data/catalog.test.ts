import { describe, expect, it } from 'vitest'
import { catalogById, cartTotal, lineIdentity, normalizeModifiers, unitPriceCents } from './catalog'

describe('menu pricing and selections', () => {
  const beef = catalogById.get('sandwich_beef')!

  it('fills every item-specific default and charges for food add-ons', () => {
    const defaults = normalizeModifiers(beef, {})!
    expect(defaults).toEqual({ size: 'single', cheese: 'no', spice: 'mild', add_on: 'none' })
    expect(unitPriceCents(beef, defaults)).toBe(899)
    const extras = normalizeModifiers(beef, { size: 'double', add_on: 'bacon', cheese: 'yes' })!
    expect(unitPriceCents(beef, extras)).toBe(899 + 350 + 125 + 75)
  })

  it('rejects invented choices and prices the full cart', () => {
    expect(normalizeModifiers(beef, { size: 'triple' })).toBeNull()
    const fries = catalogById.get('fries')!
    expect(cartTotal([
      { id: 'a', itemId: beef.id, quantity: 2, modifiers: beef.defaults },
      { id: 'b', itemId: fries.id, quantity: 1, modifiers: { size: 'large' } },
    ])).toBe(2 * 899 + 350 + 150)
  })

  it('keeps differently noted items as separate cart lines', () => {
    expect(lineIdentity(beef.id, beef.defaults, 'No onions')).not.toBe(lineIdentity(beef.id, beef.defaults, ''))
  })
})

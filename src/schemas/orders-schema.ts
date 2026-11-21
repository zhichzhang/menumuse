import type { CollectionSchema } from 'deepspace/schema'

export const ordersSchema: CollectionSchema = {
  name: 'orders',
  ownerField: 'ownerId',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain', userBound: true },
    { name: 'lines', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'totalCents', storage: 'number', interpretation: 'plain' },
    { name: 'placedAt', storage: 'text', interpretation: 'plain' },
  ],
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: true, create: false, update: false, delete: true },
  },
}

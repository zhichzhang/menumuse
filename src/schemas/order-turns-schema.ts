import type { CollectionSchema } from 'deepspace/schema'

export const orderTurnsSchema: CollectionSchema = {
  name: 'order-turns',
  ownerField: 'ownerId',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain', userBound: true },
    { name: 'cartId', storage: 'text', interpretation: 'plain' },
    { name: 'input', storage: 'text', interpretation: 'plain' },
    { name: 'reply', storage: 'text', interpretation: 'plain' },
    { name: 'status', storage: 'text', interpretation: 'plain' },
    { name: 'requestedAt', storage: 'text', interpretation: 'plain' },
    { name: 'steps', storage: 'text', interpretation: { kind: 'json' } },
  ],
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: true, create: false, update: true, delete: true },
  },
}

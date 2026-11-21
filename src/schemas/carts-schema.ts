import type { CollectionSchema } from 'deepspace/schema'

/** Cart writes are server actions so prices and modifier rules cannot be forged. */
export const cartsSchema: CollectionSchema = {
  name: 'carts',
  ownerField: 'ownerId',
  columns: [
    { name: 'ownerId', storage: 'text', interpretation: 'plain', userBound: true },
    { name: 'status', storage: 'text', interpretation: { kind: 'select', options: ['active', 'submitted'] } },
    { name: 'lines', storage: 'text', interpretation: { kind: 'json' } },
    { name: 'revision', storage: 'number', interpretation: 'plain' },
  ],
  permissions: {
    viewer: { read: 'own', create: false, update: false, delete: false },
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: true, create: false, update: true, delete: true },
  },
}

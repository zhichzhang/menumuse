# MenuMuse

MenuMuse is a small full-stack restaurant ordering demo built on DeepSpace. The public `/menu` is a print-inspired bistro menu; signed-in guests can choose modifiers, edit a cart, try a natural-language order from the cart, and place a preview order. Each signed-in user can review their own order history at `/orders`. No payment or restaurant fulfillment is involved.

## Origin and scope

This adapts my earlier AI Bistro Ordering project. I reused its curated nine-item menu and action-normalization prompt, then built a new web interface and adapted the core order flow to DeepSpace server actions and records. The original Expo UI, Express routes, Supabase schema and Gemini adapter are not shipped here. The original Google Drive share-page image URLs were replaced with locally hosted, generated menu and hero artwork so the public menu has dependable visuals. I kept the underlying design principle: the model interprets a request, while trusted server code resolves menu items, validates options and mutates the cart.

## DeepSpace features

- **Auth and user-bound records:** the signed-in route protects ordering. Cart, order, and AI-turn collections use `ownerField` with `userBound`; read permissions restrict members to their own records.
- **Real-time records:** `useQuery` streams the cart and history. Reloading the page restores the same user cart.
- **Server actions:** cart edits, order placement, and AI orchestration run server-side. The client never supplies a trusted owner or price.
- **Integration proxy:** `openai/chat-completion` interprets English ordering requests with `gpt-5.4-mini`; no model key is stored in the repo. Developer billing uses the app owner's credits.

There is no need for an extra external integration: search and payments would add complexity without improving this preview-order workflow.

## Run locally

Use Node 22.15+ with npm 11.6+ (or Node 24). Authenticate with your own DeepSpace account; keep `.dev.vars` local and untracked.

```bash
npm ci
npm run type-check
npm run lint
npm run build
npx deepspace dev start
```

Open the URL printed by the dev server (usually `http://localhost:5173/`). The public home and menu work without signing in; `/order` and `/orders` require an account. The home, menu, ordering, and order-history pages share a consistent navigation style. The ordering page also offers an AI request bar and manual item selection.

## Verification

The project owner reports that the manual flows, automated checks, and deployed-site verification below all passed. These are owner-reported results; command logs are not included in this ZIP.

| Check | Status |
| --- | --- |
| Main ordering flow | Passed manually |
| Basic AI ordering | Passed manually |
| AI ambiguity and clarification | Passed manually |
| Second-account ordering and cart/history isolation | Passed manually with a newly created account |
| TypeScript, lint, build, and automated tests | Passed, as reported by the owner |
| Deployed URL and ordering flow | Passed, as reported by the owner |

To repeat the manual check, use this sequence:

1. Add a sandwich with a modifier, change its quantity, refresh, and confirm the cart persists.
2. Enter “Add two spicy chicken sandwiches and truffle fries” in the assistant bar. Verify both item names, quantities, and subtotal before continuing. AI requests use the app owner's integration credits.
3. Try an ambiguous item request and confirm it asks for clarification without changing the cart.
4. Place a preview order, verify the cart clears, use **Start another order**, and open **My orders** to inspect the saved items and total.
5. Sign in with a second account and confirm the first account's cart and order history are not visible.

The repository contains unit tests and DeepSpace browser tests. `npm run validate` covers TypeScript and unit tests; `npm run lint` checks lint rules; `npm run test:smoke` runs the browser smoke suite. Retain command output separately if submission requires evidence of passing runs.

For future releases, check `git status`, commit the intended changes, and push to the remote already configured for the checkout if its workflow requires it. Run `npx deepspace deploy`, then repeat the manual check at the deployed URL. Never commit `.dev.vars` or local credentials. The uploaded ZIP does not contain Git remote metadata, so this README does not prescribe a particular remote host.

## Main tradeoff

For a five-day exercise, a single user-owned cart record with JSON lines is simpler than porting the entire relational Supabase model and repository layer. This keeps the main product flow understandable and deployable. The current read-modify-write actions do not serialize edits from simultaneous tabs; order placement also spans two writes, so this is a demo checkout rather than a transactional payment system. The AI parser handles at most four actions in one request and may ask for clarification if it cannot unambiguously resolve a menu item or cart line. The daily AI cap is 12 stored attempts per user; concurrent requests can briefly exceed it.

## Authorship and review

An AI coding assistant helped adapt the menu, build the interface, add schemas and actions, wire the DeepSpace model proxy, and draft documentation. The project owner reviewed the interface, requested navigation and layout refinements, and reports passing the main ordering flow, basic and ambiguous AI ordering, second-account isolation, automated checks, and deployed-site verification. Preserve the exact command logs or screenshots separately if the submission asks for them.

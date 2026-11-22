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

The project owner reports completing the main ordering flow manually. The following checks have not been confirmed in that walkthrough:

| Check | Status |
| --- | --- |
| Main ordering flow | Completed manually by the owner; detailed results not recorded here |
| Basic AI ordering | Completed manually by the owner |
| AI ambiguity and clarification | Not tested because integration credits were exhausted |
| Second-account cart and history isolation | Not yet confirmed |
| TypeScript, lint, build, and automated tests | Results not yet recorded |
| Deployed URL | Not yet confirmed |

Update this table with actual outcomes before submission. A check left incomplete because of exhausted credits is not a passing test.

For a repeatable manual check, use this sequence:

1. Add a sandwich with a modifier, change its quantity, refresh, and confirm the cart persists.
2. Enter “Add two spicy chicken sandwiches and truffle fries” in the assistant bar. Verify both item names, quantities, and subtotal before continuing. AI requests use the app owner's integration credits.
3. Try an ambiguous item request and confirm it asks for clarification without changing the cart.
4. Place a preview order, verify the cart clears, use **Start another order**, and open **My orders** to inspect the saved items and total.
5. Sign in with a second account and confirm the first account's cart and order history are not visible.

The repository contains unit tests and DeepSpace browser tests. Run `npm run validate` for TypeScript and unit tests, `npm run lint` for linting, and `npm run test:smoke` for the browser smoke suite when the local test environment is ready. A manual walkthrough does not replace these command results.

For a release, check `git status`, commit the intended changes, and push to the remote already configured for this checkout if its workflow requires it. Run `npx deepspace deploy`, then repeat the manual check at the deployed URL. Never commit `.dev.vars` or local credentials. The uploaded ZIP does not contain Git remote metadata, so this README does not prescribe a particular remote host.

## Main tradeoff

For a five-day exercise, a single user-owned cart record with JSON lines is simpler than porting the entire relational Supabase model and repository layer. This keeps the main product flow understandable and deployable. The current read-modify-write actions do not serialize edits from simultaneous tabs; order placement also spans two writes, so this is a demo checkout rather than a transactional payment system. The AI parser handles at most four actions in one request and may ask for clarification if it cannot unambiguously resolve a menu item or cart line. The daily AI cap is 12 stored attempts per user; concurrent requests can briefly exceed it.

## Authorship and review

An AI coding assistant helped adapt the menu, build the interface, add schemas and actions, wire the DeepSpace model proxy, and draft documentation. The project owner reviewed the interface, requested navigation and layout refinements, and manually tested the main ordering flow and basic AI ordering. Further AI scenarios remain untested because integration credits were exhausted. Before submission, record the results of the commands above and any review of menu mapping, owner validation, modifier rules, and model-output guardrails that was actually performed.

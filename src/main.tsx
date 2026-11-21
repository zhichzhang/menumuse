import { createRoot, hydrateRoot } from 'react-dom/client'
import type { ComponentType } from 'react'
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router'
import App, { Catch } from './pages/_app'
import Landing from './pages/index'
import { installStaleChunkRecovery } from './stale-chunk-recovery'
import './styles.css'

// Keep the public pages and the authenticated group in one explicit tree.
// The file-router still generates typed paths, but its runtime catch-all was
// matching /menu and /signin in the local build. React Router ranks these
// concrete paths before the final wildcard. Dynamic pages stay code-split.
function RootRoute() {
  // Match src/prerender-entry.tsx exactly when hydrating the landing page.
  return <><App />{' '}<></></>
}

const page = (load: () => Promise<{ default: ComponentType }>) =>
  async () => ({ Component: (await load()).default })

const routes: RouteObject[] = [{
  path: '/',
  Component: RootRoute,
  ErrorBoundary: Catch,
  children: [
    { index: true, Component: Landing },
    { path: 'menu', lazy: page(() => import('./pages/menu')) },
    {
      lazy: page(() => import('./pages/(app)/_layout')),
      children: [
        { path: 'home', lazy: page(() => import('./pages/(app)/home')) },
        { path: 'signin', lazy: page(() => import('./pages/(app)/signin')) },
        {
          lazy: page(() => import('./pages/(app)/(protected)/_layout')),
          children: [
            { path: 'order', lazy: page(() => import('./pages/(app)/(protected)/order')) },
            { path: 'orders', lazy: page(() => import('./pages/(app)/(protected)/orders')) },
            { path: 'settings', lazy: page(() => import('./pages/(app)/(protected)/settings')) },
            { path: 'api-status', lazy: page(() => import('./pages/(app)/(protected)/api-status')) },
          ],
        },
      ],
    },
    { path: '*', lazy: page(() => import('./pages/[...all]')) },
  ],
}]

async function main() {
  const root = document.getElementById('root')!
  const router = createBrowserRouter(routes)
  installStaleChunkRecovery(router)

  // Let the router finish loading the first route's code-split module before
  // rendering. Until then it renders only a loading fallback — and on a page
  // prerender.ts wrote at build (the landing), React must hydrate the
  // HTML already on screen with the real page, or it discards that markup and
  // repaints.
  if (!router.state.initialized) {
    await new Promise<void>((done) => {
      const stop = router.subscribe((state) => {
        if (state.initialized) {
          stop()
          done()
        }
      })
    })
  }

  const app = <RouterProvider router={router} />
  // A prerendered page marks the route it holds; everything else (client routes
  // are served the empty shell) renders from scratch.
  if (root.dataset.prerendered === window.location.pathname && !router.state.errors) {
    hydrateRoot(root, app, {
      // React recovers from a mismatch by repainting from scratch, so the page
      // still works — but the visitor saw a flicker and the cause is invisible
      // in `deepspace dev`, which never prerenders. Name it.
      onRecoverableError(error) {
        console.error(
          `[prerender] The static HTML for ${window.location.pathname} did not match what React rendered, so React repainted it. ` +
            'Public pages must render the same markup without a browser: no Date.now(), Math.random(), window, or matchMedia during render.',
          error,
        )
      },
    })
  } else {
    root.replaceChildren()
    createRoot(root).render(app)
  }
}

void main()

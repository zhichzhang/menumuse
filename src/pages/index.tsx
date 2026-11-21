/**
 * Landing page — a STATIC page.
 *
 * It lives at the top level of src/pages/ (not under (app)/), so it renders
 * with no DeepSpace providers: no auth session fetch, no records WebSocket.
 * That makes it cheap to serve and safe for logged-out / crawler traffic.
 *
 * Need live data or auth here? Move this file to src/pages/(app)/index.tsx
 * and it becomes a dynamic page. Conversely, any page you want to keep static
 * (marketing, docs, legal) belongs at this top level.
 *
 * Top-level pages are also prerendered to static HTML at build
 * (prerender.ts, via vite.config.ts) so crawlers read real content.
 * Keep them renderable without a browser: no window/document during render,
 * prose in HTML text, reveal animations in CSS keyframes rather than JS-driven
 * initial states. `<Seo>` comes first and reads src/seo.ts.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'
import { PublicAuthActions, useOrderSignIn } from '../components/OrderSignIn'

export default function Landing() {
  const { begin, modal } = useOrderSignIn()
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="landing">
        <nav className="landing-nav"><Link to="/" className="landing-brand"><span className="brand-mark">M</span><strong>{APP_NAME}</strong></Link>
          <PublicAuthActions page="landing" begin={begin} /></nav>
        <main className="landing-content">
          <div className="landing-copy"><p className="eyebrow">MenuMuse Bistro</p>
            <h1><span className="hero-copy-line hero-copy-first">Good food.<br /><em>Made yours.</em></span>
              <span className="hero-copy-line hero-copy-second" aria-hidden="true">Your order.<br /><em>In your words.</em></span></h1>
            <div className="landing-actions"><Link className="landing-choice landing-choice-menu" to="/menu"><span>See the menu</span><span aria-hidden="true">↗</span></Link>
              <button type="button" className="landing-choice landing-choice-order" onClick={() => begin()}><span>Make it yours</span><span aria-hidden="true">↗</span></button></div>
          </div>
          <div className="landing-art" aria-hidden="true">
            <div className="landing-float"><div className="combo-tray" />
              <div className="combo-piece combo-burger" /><div className="combo-piece combo-chicken" />
              <div className="combo-piece combo-fries" /><div className="combo-piece combo-cola" />
            </div>
          </div>
        </main>
        <footer className="site-credit">© 2026 Zhicheng Zhang. All rights reserved.</footer>
      </div>
      {modal}
    </>
  )
}

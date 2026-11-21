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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'
import { PublicAuthActions, useOrderSignIn } from '../components/OrderSignIn'

const heroLines = [
  ['Good food.', 'Made yours.'],
  ['Your order.', 'In your words.'],
  ['Fresh bites.', 'Your way.'],
  ['Pick a plate.', 'Make it yours.'],
] as const

type HeroFrame = { index: number; count: number; phase: 'intro' | 'type' | 'hold' | 'erase' }

function HeroHeadline() {
  const [frame, setFrame] = useState<HeroFrame>({ index: 0, count: heroLines[0].join('').length, phase: 'intro' })

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const [first, second] = heroLines[frame.index]
    const total = first.length + second.length
    const delay = frame.phase === 'intro' ? 900 : frame.phase === 'hold' ? 2200 : frame.phase === 'type' ? 75 : 38
    const timer = window.setTimeout(() => {
      if (frame.phase === 'intro') setFrame({ index: 0, count: 0, phase: 'type' })
      else if (frame.phase === 'type') setFrame(frame.count < total
        ? { ...frame, count: frame.count + 1 }
        : { ...frame, phase: 'hold' })
      else if (frame.phase === 'hold') setFrame({ ...frame, phase: 'erase' })
      else setFrame(frame.count > 0
        ? { ...frame, count: frame.count - 1 }
        : { index: (frame.index + 1) % heroLines.length, count: 0, phase: 'type' })
    }, delay)
    return () => window.clearTimeout(timer)
  }, [frame])

  const [first, second] = heroLines[frame.index]
  return <h1><span className="sr-only">Good food. Made yours.</span><span aria-hidden="true" className="hero-typed">
    <span className="hero-typed-line">{first.slice(0, frame.count)}{frame.count <= first.length && frame.phase !== 'intro' && <span className="hero-caret" />}</span>
    <em className="hero-typed-line">{second.slice(0, Math.max(0, frame.count - first.length))}{frame.count > first.length && frame.phase !== 'intro' && <span className="hero-caret" />}</em>
  </span></h1>
}

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
            <HeroHeadline />
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

import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants'

export default function NotFound() {
  return <div className="not-found-page">
    <title>{`Page not found | ${APP_NAME}`}</title>
    <meta name="robots" content="noindex" />
    <header className="not-found-nav"><Link to="/" className="landing-brand"><span className="brand-mark">M</span><strong>{APP_NAME}</strong></Link></header>
    <main className="not-found-content">
      <p className="eyebrow">A WRONG TURN</p>
      <h1>Lost your <em>place?</em></h1>
      <p>That page isn't on the menu.</p>
      <div className="not-found-actions">
        <Link to="/menu">See the menu <span aria-hidden="true">↗</span></Link>
        <Link to="/">Back to home <span aria-hidden="true">↗</span></Link>
      </div>
      <span className="not-found-number" aria-hidden="true">404</span>
    </main>
    <footer className="site-credit">© 2026 Zhicheng Zhang. All rights reserved.</footer>
  </div>
}

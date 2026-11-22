import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady } from 'deepspace'
import { APP_NAME, type Role } from '../constants'
import { nav } from '../nav'
import { PublicProfileMenu } from './OrderSignIn'

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const location = useLocation()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const profileReady = !isSignedIn || (!userLoading && !!user)
  const userRole = (user?.role ?? 'anonymous') as Role | 'anonymous'

  // Keep the three primary links in the same order as the public home page.
  const extraNav = nav.filter((item) => {
    if (['/menu', '/orders', '/order'].includes(item.path)) return false
    if (item.devOnly && !import.meta.env.DEV) return false
    if (!item.roles) return true
    if (!profileReady) return false
    return userRole === 'admin' || item.roles.includes(userRole as Role)
  })

  return (
    <>
      <nav data-testid="app-navigation" className="landing-nav order-site-nav">
        <Link to="/" className="landing-brand" onClick={() => { try { sessionStorage.removeItem('menumuse:sign-in-destination') } catch { /* Storage may be disabled. */ } }}>
          <span className="brand-mark">M</span><strong>{APP_NAME}</strong>
        </Link>
        <div className="landing-nav-actions">
          <Link className="landing-menu-link header-action" to="/menu" aria-current={location.pathname === '/menu' ? 'page' : undefined}>Menu ↗</Link>
          {isLoaded && isSignedIn ? <>
            <Link className="header-action public-orders-link" to="/orders" aria-current={location.pathname === '/orders' ? 'page' : undefined}>My orders ↗</Link>
            <Link className="header-action" to="/order" aria-current={location.pathname === '/order' ? 'page' : undefined}>Order ↗</Link>
          </> : null}
          {extraNav.map((item) => <Link key={item.path} className="header-action" to={item.path}>{item.label} ↗</Link>)}
          {!isLoaded ? null : isSignedIn && !profileReady ? (
            <span className="public-account-loading" aria-label="Loading account" />
          ) : isSignedIn && user ? (
            <PublicProfileMenu user={{ name: user.name, email: user.email, imageUrl: user.imageUrl }} navigationTestIds />
          ) : (
            <button type="button" data-testid="nav-sign-in-button" className="header-action" onClick={() => setShowAuthModal(true)}>Sign in ↗</button>
          )}
        </div>
      </nav>
      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthOverlay, DeepSpaceAuthProvider, signOut, useAuthStatus, useAuthUser } from 'deepspace'

type PublicProfile = { name?: string | null; email?: string | null; imageUrl?: string | null }

function profileText(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const field = value as Record<string, unknown>
    if (typeof field.emailAddress === 'string') return field.emailAddress
    if (typeof field.url === 'string') return field.url
  }
  return null
}

const PENDING_ORDER = 'menumuse:sign-in-destination'

function safeDestination(value: string | null): string {
  return value?.startsWith('/') && !value.startsWith('//') && !value.startsWith('/signin') ? value : '/order'
}

function remember(destination: string) {
  try { sessionStorage.setItem(PENDING_ORDER, destination) } catch { /* Storage may be disabled. */ }
}

function clearRemembered() {
  try { sessionStorage.removeItem(PENDING_ORDER) } catch { /* Storage may be disabled. */ }
}

function SignInContent({ destination, onClose }: { destination: string; onClose: () => void }) {
  const { isLoaded, isSignedIn } = useAuthStatus()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    clearRemembered()
    navigate(destination)
  }, [destination, isLoaded, isSignedIn, navigate])

  if (!isLoaded || isSignedIn) return null
  return <AuthOverlay onClose={onClose} />
}

export function useOrderSignIn() {
  const [destination, setDestination] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    let pending: string | null = null
    try { pending = sessionStorage.getItem(PENDING_ORDER) } catch { /* Storage may be disabled. */ }
    if (params.has('signin') || pending) {
      const next = safeDestination(params.get('next') ?? pending)
      remember(next)
      setDestination(next)
    }
  }, [location.search])

  function begin(next = '/order') {
    const target = safeDestination(next)
    remember(target)
    setDestination(target)
  }

  function close() {
    clearRemembered()
    setDestination(null)
    if (new URLSearchParams(location.search).has('signin')) navigate(location.pathname, { replace: true })
  }

  return {
    begin,
    modal: destination && <DeepSpaceAuthProvider><SignInContent destination={destination} onClose={close} /></DeepSpaceAuthProvider>,
  }
}

export function PublicAuthActions({ page, begin }: { page: 'landing' | 'menu'; begin: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <PublicActions page={page} begin={begin} signedIn={false} />
  return <DeepSpaceAuthProvider><LivePublicActions page={page} begin={begin} /></DeepSpaceAuthProvider>
}

function LivePublicActions({ page, begin }: { page: 'landing' | 'menu'; begin: () => void }) {
  const { isLoaded, isSignedIn, user } = useAuthUser()
  const account = user as unknown as Record<string, unknown> | null
  const profile = account ? {
    name: profileText(account.fullName) ?? profileText(account.name) ?? profileText(account.firstName),
    email: profileText(account.primaryEmailAddress) ?? profileText(account.email),
    imageUrl: profileText(account.imageUrl) ?? profileText(account.image),
  } : null
  return <PublicActions page={page} begin={begin} signedIn={isLoaded && isSignedIn} profile={profile} />
}

function PublicProfileMenu({ user }: { user: PublicProfile }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  return <div className="public-account" ref={root}>
    <button type="button" className="public-account-trigger" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      {user.imageUrl ? <img src={user.imageUrl} alt="" referrerPolicy="no-referrer" /> : <span className="public-account-initial">{(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}</span>}
      <span className="public-account-name">{user.name || user.email || 'Account'}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="public-account-menu">
      <div><strong>{user.name || 'Signed in'}</strong><small>{user.email}</small></div>
      <button type="button" onClick={() => { setOpen(false); void signOut() }}>↪ Sign out</button>
    </div>}
  </div>
}

function PublicActions({ page, begin, signedIn, profile }: { page: 'landing' | 'menu'; begin: () => void; signedIn: boolean; profile?: PublicProfile | null }) {
  const account = signedIn && (profile ? <PublicProfileMenu user={profile} /> : <span className="public-account-loading" aria-label="Loading account" />)
  if (page === 'landing') return <div className="landing-nav-actions">
    <Link className="landing-menu-link header-action" to="/menu">Menu ↗</Link>
    {signedIn ? <><Link className="header-action public-orders-link" to="/orders">My orders ↗</Link><Link className="header-action" to="/order">Order ↗</Link>{account}</>
      : <button type="button" className="landing-signin-link header-action" onClick={() => begin()}>Sign in ↗</button>}
  </div>

  return <div className="public-menu-actions">
    {signedIn ? <><Link className="header-action public-orders-link" to="/orders">My orders ↗</Link><Link className="header-action" to="/order">Order ↗</Link>{account}</>
      : <button type="button" className="header-action" onClick={() => begin()}>Start an order ↗</button>}
  </div>
}

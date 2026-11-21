import { AuthGate } from 'deepspace'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function ProtectedLayout() {
  return (
    <AuthGate fallback={<SignInRedirect />}>
      <Outlet />
    </AuthGate>
  )
}

function SignInRedirect() {
  const location = useLocation()
  const next = `${location.pathname}${location.search}`
  return <Navigate to={`/signin?next=${encodeURIComponent(next)}`} replace />
}

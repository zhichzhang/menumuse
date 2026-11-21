import { AuthOverlay, useAuthProfileReady } from 'deepspace'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'

export default function SignInPage() {
  const { isSignedIn } = useAuthProfileReady({ requireUser: true })
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const requested = search.get('next') ?? '/order'
  const next = requested.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/signin')
    ? requested : '/order'

  if (isSignedIn) return <Navigate to={next} replace />

  return <div className="signin-direct" aria-label="Sign in to MenuMuse">
    <AuthOverlay onClose={() => navigate('/')} />
  </div>
}

import { Navigate, useSearchParams } from 'react-router-dom'

export default function SignInPage() {
  const [search] = useSearchParams()
  const next = search.get('next') ?? '/order'
  return <Navigate to={`/?signin=1&next=${encodeURIComponent(next)}`} replace />
}

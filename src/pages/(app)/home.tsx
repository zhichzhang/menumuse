/**
 * Placeholder home page — replace this with the app's real home.
 *
 * This is intentionally unstyled scaffolding, not a design to build on.
 * Design the app's own look (layout, theme tokens, typography) from your
 * product's point of view instead of extending this page.
 */

import { Navigate } from 'react-router-dom'

export default function HomePage() {
  return <Navigate to="/order" replace />
}

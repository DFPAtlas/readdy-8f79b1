import { StrictMode } from 'react'
import './i18n'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installSessionGuard } from '@/lib/session-guard'
import { installReadOnlyErrorInterceptor } from '@/lib/readonly'

// Install the stale-session guard before anything renders or creates the Supabase
// client, so an invalid refresh token signs the user out cleanly instead of
// surfacing an unhandled auth error.
installSessionGuard()

// Turn a server-side read-only refusal into the same friendly message the UI uses.
installReadOnlyErrorInterceptor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
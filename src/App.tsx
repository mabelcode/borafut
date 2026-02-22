import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Login from '@/pages/Login'

/**
 * App shell.
 *
 * Auth state machine:
 *   loading → session? → show Home | Login
 *
 * TODO: replace <div>Authenticated</div> with the real Home/Dashboard component
 * once it exists. Also add an Onboarding guard (redirect when displayName is null).
 */
function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Grab the current session (handles the OAuth callback token in the URL)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // 2. Keep session in sync for the lifetime of the app
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-2xl animate-bounce">⚽</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-primary-text font-sans">
      <div className="mx-auto max-w-md px-4 py-8">
        {session ? (
          // TODO: swap with <Home /> (dashboard) and add Onboarding guard
          <div className="flex flex-col gap-4">
            <p className="text-sm text-secondary-text">
              Logado como <span className="font-medium text-primary-text">{session.user.email}</span>
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-brand-red underline underline-offset-2"
            >
              Sair
            </button>
          </div>
        ) : (
          <Login />
        )}
      </div>
    </div>
  )
}

export default App

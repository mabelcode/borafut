import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'

/**
 * Auth state machine:
 *
 *   loading
 *     └─ no session            → <Login />
 *     └─ session, no profile   → <Onboarding />
 *     └─ session + profile     → <Home />  (TODO)
 */

type AppState = 'loading' | 'login' | 'onboarding' | 'home'

async function resolveAppState(session: Session | null): Promise<AppState> {
  if (!session) return 'login'

  const { data } = await supabase
    .from('users')
    .select('displayName')
    .eq('id', session.user.id)
    .maybeSingle()

  return data?.displayName ? 'home' : 'onboarding'
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [appState, setAppState] = useState<AppState>('loading')

  async function bootstrap(session: Session | null) {
    const state = await resolveAppState(session)
    setSession(session)
    setAppState(state)
  }

  useEffect(() => {
    // Initial session (also processes the OAuth callback token in the URL)
    supabase.auth.getSession().then(({ data }) => bootstrap(data.session))

    // Keep in sync for the app's lifetime
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      bootstrap(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-3xl animate-bounce">⚽</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-primary-text font-sans">
      <div className="mx-auto max-w-md px-4 py-8">

        {appState === 'login' && <Login />}

        {appState === 'onboarding' && session && (
          <Onboarding
            session={session}
            onComplete={() => setAppState('home')}
          />
        )}

        {appState === 'home' && (
          // TODO: replace with <Home /> dashboard
          <div className="flex flex-col gap-4 animate-fade-in">
            <h1 className="text-4xl font-extrabold tracking-tight text-primary-text">
              bora<span className="text-brand-green">fut</span>
            </h1>
            <p className="text-secondary-text text-sm">Dashboard em construção 🚧</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-brand-red underline underline-offset-2 text-left"
            >
              Sair
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

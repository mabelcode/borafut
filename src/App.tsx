import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'
import Home from '@/pages/Home'
import CreateMatch from '@/pages/CreateMatch'
import MatchDetail from '@/pages/MatchDetail'
import AdminSettings from '@/pages/AdminSettings'

/**
 * Auth + navigation state machine:
 *
 *   loading
 *     └─ no session           → login
 *     └─ session, no profile  → onboarding
 *     └─ session + profile    → home
 *                                ├─ admin FAB      → create-match → home
 *                                ├─ card tap       → match-detail → home
 *                                └─ admin gear ⚙   → admin-settings → home
 */

type AppState =
  | 'loading'
  | 'login'
  | 'onboarding'
  | 'home'
  | 'create-match'
  | 'match-detail'
  | 'admin-settings'

interface UserMeta {
  isAdmin: boolean
}

async function resolveAppState(session: Session | null): Promise<'login' | 'onboarding' | 'home'> {
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
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [userMeta, setUserMeta] = useState<UserMeta>({ isAdmin: false })

  async function bootstrap(session: Session | null) {
    if (!session) {
      setSession(null)
      setAppState('login')
      return
    }
    const { data } = await supabase
      .from('users')
      .select('displayName, isAdmin')
      .eq('id', session.user.id)
      .maybeSingle()

    setSession(session)
    setUserMeta({ isAdmin: data?.isAdmin ?? false })
    setAppState(data?.displayName ? 'home' : 'onboarding')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => bootstrap(data.session))
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
          <Onboarding session={session} onComplete={() => setAppState('home')} />
        )}

        {appState === 'home' && (
          <Home
            onSignOut={() => setAppState('login')}
            onCreateMatch={() => setAppState('create-match')}
            onSelectMatch={(id) => { setSelectedMatchId(id); setAppState('match-detail') }}
            onSettings={() => setAppState('admin-settings')}
          />
        )}

        {appState === 'create-match' && session && (
          <CreateMatch
            session={session}
            onBack={() => setAppState('home')}
            onCreated={() => setAppState('home')}
          />
        )}

        {appState === 'match-detail' && session && selectedMatchId && (
          <MatchDetail
            matchId={selectedMatchId}
            session={session}
            isAdmin={userMeta.isAdmin}
            onBack={() => setAppState('home')}
          />
        )}

        {appState === 'admin-settings' && session && (
          <AdminSettings
            session={session}
            onBack={() => setAppState('home')}
          />
        )}

      </div>
    </div>
  )
}

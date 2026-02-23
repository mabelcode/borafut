import * as Sentry from '@sentry/react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'
import Home from '@/pages/Home'
import CreateMatch from '@/pages/CreateMatch'
import MatchDetail from '@/pages/MatchDetail'
import AdminSettings from '@/pages/AdminSettings'
import WaitingForInvite from '@/pages/WaitingForInvite'
import JoinGroup from '@/pages/JoinGroup'
import { useCurrentUser } from '@/hooks/useCurrentUser'

/**
 * Auth + navigation state machine
 *
 *   loading
 *    ├─ no session           → login
 *    └─ session
 *        ├─ no profile       → onboarding
 *        │     └─ token?     → join-group → home (or waiting-for-invite)
 *        └─ has profile
 *              ├─ token?     → join-group → home
 *              ├─ no groups  → waiting-for-invite
 *              └─ has groups → home
 *                               ├─ FAB           → create-match → home
 *                               ├─ card tap      → match-detail → home
 *                               └─ admin gear ⚙  → admin-settings → home
 */

type AppState =
  | 'loading'
  | 'login'
  | 'onboarding'
  | 'join-group'
  | 'waiting-for-invite'
  | 'home'
  | 'create-match'
  | 'match-detail'
  | 'admin-settings'

/** Reads ?token= from the current URL without changing history */
function getInviteToken(): string | null {
  return new URLSearchParams(window.location.search).get('token')
}

/** Remove the token from URL without a page reload */
function clearTokenFromUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete('token')
  window.history.replaceState({}, '', url.toString())
}

// Inner component that has access to useCurrentUser
function AppInner({
  session,
  inviteToken,
  initialAppState,
}: {
  session: Session
  inviteToken: string | null
  initialAppState: AppState
}) {
  const { groups, isAdminInAnyGroup, adminGroups, loading, refetch } = useCurrentUser()
  const [appState, setAppState] = useState<AppState>(initialAppState)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  // Once user data loads, route correctly
  useEffect(() => {
    if (loading) return
    if (appState !== 'loading') return // already routed

    if (inviteToken) {
      setAppState('join-group')
    } else if (groups.length === 0) {
      setAppState('waiting-for-invite')
    } else {
      setAppState('home')
    }
  }, [loading, groups, inviteToken, appState])

  // If still loading initial state
  if (loading && appState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-3xl animate-bounce">⚽</span>
      </div>
    )
  }

  // Admin's active group for CreateMatch + AdminSettings
  const activeAdminGroupId = adminGroups[0]?.groupId ?? groups[0]?.groupId ?? ''

  // Match detail: determine if user is admin in the match's group
  // (passed from Home → App → MatchDetail via session + group membership check inside MatchDetail)

  return (
    <div className="min-h-screen bg-background text-primary-text font-sans">
      <div className="mx-auto max-w-md px-4 py-8">

        {appState === 'join-group' && inviteToken && (
          <JoinGroup
            token={inviteToken}
            session={session}
            onSuccess={() => {
              clearTokenFromUrl()
              refetch().then(() => setAppState('home'))
            }}
            onError={() => {
              clearTokenFromUrl()
              setAppState(groups.length > 0 ? 'home' : 'waiting-for-invite')
            }}
          />
        )}

        {appState === 'waiting-for-invite' && (
          <WaitingForInvite
            onRefresh={() => refetch().then(() => {
              if (groups.length > 0) setAppState('home')
            })}
          />
        )}

        {appState === 'home' && (
          <Home
            onSignOut={() => setAppState('login')}
            onCreateMatch={() => setAppState('create-match')}
            onSelectMatch={(id) => { setSelectedMatchId(id); setAppState('match-detail') }}
            onSettings={() => setAppState('admin-settings')}
          />
        )}

        {appState === 'create-match' && (
          <CreateMatch
            session={session}
            groupId={activeAdminGroupId}
            onBack={() => setAppState('home')}
            onCreated={() => setAppState('home')}
          />
        )}

        {appState === 'match-detail' && selectedMatchId && (
          <MatchDetail
            matchId={selectedMatchId}
            session={session}
            isAdmin={isAdminInAnyGroup}
            onBack={() => setAppState('home')}
          />
        )}

        {appState === 'admin-settings' && (
          <AdminSettings
            session={session}
            adminGroups={adminGroups}
            onBack={() => setAppState('home')}
          />
        )}

      </div>
    </div>
  )
}

// Root component handles auth only
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [appState, setAppState] = useState<AppState>('loading')
  const [inviteToken] = useState<string | null>(getInviteToken)

  async function bootstrap(newSession: Session | null) {
    if (!newSession) {
      setSession(null)
      setAppState('login')
      Sentry.setUser(null)
      return
    }

    setSession(newSession)
    Sentry.setUser({
      id: newSession.user.id,
      email: newSession.user.email,
    })

    // Check if user has a profile (displayName set = completed onboarding)
    const { data } = await supabase
      .from('users')
      .select('displayName')
      .eq('id', newSession.user.id)
      .maybeSingle()

    if (!data?.displayName) {
      setAppState('onboarding')
    } else {
      setAppState('loading') // AppInner will route based on groups
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => bootstrap(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      bootstrap(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (appState === 'loading' && !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-3xl animate-bounce">⚽</span>
      </div>
    )
  }

  if (appState === 'login') {
    return (
      <div className="min-h-screen bg-background text-primary-text font-sans">
        <div className="mx-auto max-w-md px-4 py-8">
          <Login />
        </div>
      </div>
    )
  }

  if (appState === 'onboarding' && session) {
    return (
      <div className="min-h-screen bg-background text-primary-text font-sans">
        <div className="mx-auto max-w-md px-4 py-8">
          <Onboarding
            session={session}
            onComplete={() => setAppState('loading')}
            onSignOut={() => setAppState('login')}
          />
        </div>
      </div>
    )
  }

  if (session) {
    return (
      <AppInner
        session={session}
        inviteToken={inviteToken}
        initialAppState={appState}
      />
    )
  }

  return null
}

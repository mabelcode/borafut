import * as Sentry from '@sentry/react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Session } from '@supabase/supabase-js'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'
import Home from '@/pages/Home'
import CreateMatch from '@/pages/CreateMatch'
import MatchDetail from '@/pages/MatchDetail'
import AdminSettings from '@/pages/AdminSettings'
import WaitingForInvite from '@/pages/WaitingForInvite'
import JoinGroup from '@/pages/JoinGroup'
import SuperAdmin from './pages/SuperAdmin'
import GroupDetailsView from './pages/admin/GroupDetailsView'
import UserDetailsView from './pages/admin/UserDetailsView'
import Layout from '@/components/Layout'
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
  | 'super-admin'
  | 'super-admin-group'
  | 'super-admin-user'

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

const STATE_TITLES: Record<AppState, string | undefined> = {
  'home': 'Partidas',
  'super-admin': 'Painel Super Admin',
  'super-admin-group': 'Detalhes do Grupo',
  'super-admin-user': 'Detalhes do Usuário',
  'create-match': 'Nova Partida',
  'match-detail': 'Detalhes da Partida',
  'admin-settings': 'Configurações do Grupo',
  'waiting-for-invite': 'Início',
  'join-group': 'Entrar no Grupo',
  'loading': undefined,
  'login': undefined,
  'onboarding': 'Seja bem-vindo',
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
  const { user, groups, isAdminInAnyGroup, adminGroups, loading, refetch } = useCurrentUser()
  const [appState, setAppState] = useState<AppState>(initialAppState)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // Once user data loads, route correctly if not already on a specific page
  useEffect(() => {
    if (loading) return

    // Read page from URL
    const params = new URLSearchParams(window.location.search)
    const pageFromUrl = params.get('page') as AppState

    if (appState === 'loading') {
      queueMicrotask(() => {
        if (inviteToken) {
          logger.debug('Invite token detected', { inviteToken })
          setAppState('join-group')
        } else if (pageFromUrl && STATE_TITLES[pageFromUrl]) {
          // Allow restoring state from URL if valid
          if (pageFromUrl === 'super-admin-group') {
            const groupId = params.get('groupId')
            if (groupId) {
              setSelectedGroupId(groupId)
              setAppState('super-admin-group')
            } else {
              setAppState('super-admin')
            }
          } else if (pageFromUrl === 'super-admin-user') {
            const userId = params.get('userId')
            if (userId) {
              setSelectedUserId(userId)
              setAppState('super-admin-user')
            } else {
              setAppState('super-admin')
            }
          } else {
            setAppState(pageFromUrl)
          }
        } else if (groups.length === 0) {
          setAppState('waiting-for-invite')
        } else {
          setAppState('home')
        }
      })
    }
  }, [loading, groups, inviteToken, appState])

  // Sync URL with appState
  useEffect(() => {
    if (appState === 'loading' || appState === 'login' || appState === 'onboarding') return

    const url = new URL(window.location.href)
    if (appState === 'home') {
      url.searchParams.delete('page')
      url.searchParams.delete('groupId')
    } else {
      url.searchParams.set('page', appState)
      if (appState === 'super-admin-group' && selectedGroupId) {
        url.searchParams.set('groupId', selectedGroupId)
      } else {
        url.searchParams.delete('groupId')
      }

      if (appState === 'super-admin-user' && selectedUserId) {
        url.searchParams.set('userId', selectedUserId)
      } else {
        url.searchParams.delete('userId')
      }

      // If we are navigating away from super-admin entirely, clear the tab
      if (!appState.startsWith('super-admin')) {
        url.searchParams.delete('tab')
      }
    }
    window.history.replaceState({}, '', url.toString())
  }, [appState])

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

  return (
    <Layout
      title={STATE_TITLES[appState]}
      user={user}
      onHome={() => setAppState('home')}
      onSignOut={async () => {
        await supabase.auth.signOut()
        setAppState('login')
      }}
      onSuperAdmin={() => setAppState('super-admin')}
    >
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
          onCreateMatch={() => setAppState('create-match')}
          onSelectMatch={(id: string) => { setSelectedMatchId(id); setAppState('match-detail') }}
          onSettings={() => setAppState('admin-settings')}
        />
      )}

      {appState === 'super-admin' && (
        user?.isSuperAdmin ? (
          <SuperAdmin
            onSelectGroup={(id) => {
              setSelectedGroupId(id)
              setAppState('super-admin-group')
            }}
            onSelectUser={(id) => {
              setSelectedUserId(id)
              setAppState('super-admin-user')
            }}
          />
        ) : (
          <Home
            onCreateMatch={() => setAppState('create-match')}
            onSelectMatch={(id: string) => { setSelectedMatchId(id); setAppState('match-detail') }}
            onSettings={() => setAppState('admin-settings')}
          />
        )
      )}

      {appState === 'super-admin-group' && selectedGroupId && user?.isSuperAdmin && (
        <GroupDetailsView
          groupId={selectedGroupId}
          onBack={() => setAppState('super-admin')}
        />
      )}

      {appState === 'super-admin-user' && selectedUserId && user?.isSuperAdmin && (
        <UserDetailsView
          userId={selectedUserId}
          onBack={() => setAppState('super-admin')}
          governanceLevel="SYSTEM"
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
    </Layout>
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

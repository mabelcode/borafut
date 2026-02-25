import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppInner } from './App'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// Mock dependencies
vi.mock('@/hooks/useCurrentUser', () => ({
    useCurrentUser: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            signOut: vi.fn()
        }
    }
}))

vi.mock('./pages/Home', () => ({
    default: () => <div data-testid="page-home">Home Page</div>
}))

vi.mock('./pages/SuperAdmin', () => ({
    default: () => <div data-testid="page-super-admin">Super Admin Page</div>
}))

vi.mock('./pages/GroupAdmin', () => ({
    default: () => <div data-testid="page-group-admin">Group Admin Page</div>
}))

describe('App Routing Security', () => {
    const mockSession = { user: { id: 'user-123' } } as any

    beforeEach(() => {
        vi.clearAllMocks()
            // Default mock for a regular player
            ; (useCurrentUser as any).mockReturnValue({
                user: { id: 'user-123', isSuperAdmin: false },
                groups: [{ groupId: 'g1', role: 'PLAYER' }],
                isAdminInAnyGroup: false,
                adminGroups: [],
                loading: false,
                refetch: vi.fn().mockResolvedValue({})
            })

        // Reset URL
        window.history.replaceState({}, '', '/')
    })

    it('redirects unauthorized regular player from super-admin to home', async () => {
        // Simulating ?page=super-admin in URL
        const url = new URL(window.location.href)
        url.searchParams.set('page', 'super-admin')
        window.history.replaceState({}, '', url.toString())

        render(
            <AppInner
                session={mockSession}
                inviteToken={null}
                initialAppState="loading"
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('page-home')).toBeInTheDocument()
            expect(screen.queryByTestId('page-super-admin')).not.toBeInTheDocument()
        })
    })

    it('redirects unauthorized regular player from group-admin to home', async () => {
        const url = new URL(window.location.href)
        url.searchParams.set('page', 'group-admin')
        window.history.replaceState({}, '', url.toString())

        render(
            <AppInner
                session={mockSession}
                inviteToken={null}
                initialAppState="loading"
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('page-home')).toBeInTheDocument()
            expect(screen.queryByTestId('page-group-admin')).not.toBeInTheDocument()
        })
    })

    it('allows super admin to access super-admin panel', async () => {
        ; (useCurrentUser as any).mockReturnValue({
            user: { id: 'admin-123', isSuperAdmin: true },
            groups: [],
            isAdminInAnyGroup: true,
            adminGroups: [],
            loading: false,
            refetch: vi.fn().mockResolvedValue({})
        })

        const url = new URL(window.location.href)
        url.searchParams.set('page', 'super-admin')
        window.history.replaceState({}, '', url.toString())

        render(
            <AppInner
                session={mockSession}
                inviteToken={null}
                initialAppState="loading"
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('page-super-admin')).toBeInTheDocument()
        })
    })

    it('allows group admin to access group-admin panel', async () => {
        ; (useCurrentUser as any).mockReturnValue({
            user: { id: 'group-admin-123', isSuperAdmin: false },
            groups: [{ groupId: 'g1', role: 'ADMIN' }],
            isAdminInAnyGroup: true,
            adminGroups: [{ groupId: 'g1' }],
            loading: false,
            refetch: vi.fn().mockResolvedValue({})
        })

        const url = new URL(window.location.href)
        url.searchParams.set('page', 'group-admin')
        window.history.replaceState({}, '', url.toString())

        render(
            <AppInner
                session={mockSession}
                inviteToken={null}
                initialAppState="loading"
            />
        )

        await waitFor(() => {
            expect(screen.getByTestId('page-group-admin')).toBeInTheDocument()
        })
    })
})

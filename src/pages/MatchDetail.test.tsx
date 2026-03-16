import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MatchDetail from './MatchDetail'
import { useMatchDetail } from '@/hooks/useMatchDetail'
import { useMatchEvaluations } from '@/hooks/useMatchEvaluations'
import { useMatchMvp } from '@/hooks/useMatchMvp'
import { useDraftState } from '@/hooks/useDraftState'
import { useCurrentUser } from '@/hooks/useCurrentUser'

vi.mock('@/hooks/useMatchDetail', () => ({
    useMatchDetail: vi.fn()
}))

vi.mock('@/hooks/useMatchEvaluations', () => ({
    useMatchEvaluations: vi.fn()
}))

vi.mock('@/hooks/useMatchMvp', () => ({
    useMatchMvp: vi.fn()
}))

vi.mock('@/hooks/useDraftState', () => ({
    useDraftState: vi.fn()
}))

vi.mock('@/hooks/useCurrentUser', () => ({
    useCurrentUser: vi.fn()
}))

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { pixKey: 'admin@pix.com' }, error: null })
        }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null })
    }
}))

const mockSession = {
    user: { id: 'u1', user_metadata: { full_name: 'Marcos' } }
} as any

const mockMatchData = {
    id: 'm1',
    title: 'Test Match',
    scheduledAt: '2024-03-01T20:00:00Z',
    maxPlayers: 10,
    price: 20,
    status: 'OPEN',
    managerId: 'admin-1',
    groupId: 'g1',
    myRegistration: null,
    registrations: [
        { id: 'r1', userId: 'u1', status: 'CONFIRMED', subscriptionType: 'AVULSO', users: { displayName: 'Marcos', mainPosition: 'ATTACK', globalScore: 4.5 } }
    ]
}

describe('MatchDetail Page', () => {
    beforeEach(() => {
        vi.clearAllMocks()

            ; (useMatchDetail as any).mockReturnValue({
                data: mockMatchData,
                loading: false,
                error: null,
                refetch: vi.fn()
            })

            ; (useMatchEvaluations as any).mockReturnValue({
                hasEvaluated: false,
                fetchMyEvaluations: vi.fn(),
                loading: false,
                error: null,
                ratingsMap: {}
            })

            ; (useMatchMvp as any).mockReturnValue({
                mvps: [],
                loading: false,
                evaluatorCount: 0,
                computeMvps: vi.fn(),
                isComputing: false
            })

            ; (useDraftState as any).mockReturnValue({
                numTeams: 2,
                setNumTeams: vi.fn(),
                teams: [],
                isDraftGenerated: false,
                generateDraft: vi.fn(),
                selectedPlayer: null,
                handlePlayerClick: vi.fn()
            })

            // Default: not admin of any group
            ; (useCurrentUser as any).mockReturnValue({
                user: { isSuperAdmin: false },
                groups: [{ groupId: 'g1', role: 'PLAYER', subscriptionType: 'AVULSO' }],
            })
    })

    it('renders match information correctly', async () => {
        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)

        expect(await screen.findByText('Test Match')).toBeInTheDocument()

        // Use custom function matchers to find text even if broken by multiple elements or hidden by non-breaking spaces
        // Time
        expect(screen.getByText((_, element) => {
            const hasText = (node: Element) => !!node.textContent?.match(/\d{2}:00/)
            const nodeHasText = hasText(element!)
            const childrenDoNotHaveText = Array.from(element?.children || []).every(child => !hasText(child as Element))
            return nodeHasText && childrenDoNotHaveText
        })).toBeInTheDocument()

        // Price (20,00 or 20.00)
        expect(screen.getByText((_, element) => {
            const hasText = (node: Element) => !!(node.textContent?.includes('20') && node.textContent?.match(/[.,]00/))
            const nodeHasText = hasText(element!)
            const childrenDoNotHaveText = Array.from(element?.children || []).every(child => !hasText(child as Element))
            return nodeHasText && childrenDoNotHaveText
        })).toBeInTheDocument()

        // Capacity (1/10)
        expect(screen.getByText((_, element) => {
            const text = element?.textContent?.replace(/\s+/g, '') || ''
            return text.includes('1/10') && Array.from(element?.children || []).every(child => !child.textContent?.includes('1/10'))
        })).toBeInTheDocument()
    })

    it('shows admin actions only to admins', async () => {
        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)
        await waitFor(() => expect(screen.queryByText('CONFIGURAR E SORTEAR TIMES')).not.toBeInTheDocument())

            // Now mock as admin of THIS group
            ; (useCurrentUser as any).mockReturnValue({
                user: { isSuperAdmin: false },
                groups: [{ groupId: 'g1', role: 'ADMIN', subscriptionType: 'AVULSO' }],
            })
        // Force re-render by re-rendering with fresh component
        const { unmount } = render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)
        expect(await screen.findByText('CONFIGURAR E SORTEAR TIMES')).toBeInTheDocument()
        unmount()
    })

    it('shows evaluation button for finished matches where user participated', async () => {
        const finishedMatch = { ...mockMatchData, status: 'FINISHED', myRegistration: { status: 'CONFIRMED' } }
            ; (useMatchDetail as any).mockReturnValue({ data: finishedMatch, loading: false })

        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)

        expect(await screen.findByText('AVALIAR JOGADORES')).toBeInTheDocument()
    })

    it('shows MVP computing panel for finished matches to admin', async () => {
        const finishedMatch = { ...mockMatchData, status: 'FINISHED' }
            ; (useMatchDetail as any).mockReturnValue({ data: finishedMatch, loading: false })

            // Mock as admin of this group for MVP panel
            ; (useCurrentUser as any).mockReturnValue({
                user: { isSuperAdmin: false },
                groups: [{ groupId: 'g1', role: 'ADMIN', subscriptionType: 'AVULSO' }],
            })
        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)

        expect(await screen.findByText(/Craque da Partida/i)).toBeInTheDocument()
        expect(screen.getByText('CALCULAR CRAQUE(S)')).toBeInTheDocument()
    })

    it('opens evaluation flow when clicking button', async () => {
        const finishedMatch = {
            ...mockMatchData,
            status: 'FINISHED',
            myRegistration: { status: 'CONFIRMED' },
            registrations: [
                ...mockMatchData.registrations,
                { id: 'r2', userId: 'u2', status: 'CONFIRMED', subscriptionType: 'AVULSO', users: { displayName: 'Player 2', mainPosition: 'DEFENSE', globalScore: 3.0 } }
            ]
        }
            ; (useMatchDetail as any).mockReturnValue({ data: finishedMatch, loading: false })

        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)

        const evalBtn = await screen.findByText('AVALIAR JOGADORES')
        fireEvent.click(evalBtn)

        expect(screen.getByText('Avaliar Jogadores')).toBeInTheDocument()
        expect(screen.getByText('SALVAR AVALIAÇÕES')).toBeInTheDocument()
    })

    it('handles back navigation', async () => {
        const onBackMock = vi.fn()
        render(<MatchDetail matchId="m1" session={mockSession} onBack={onBackMock} />)

        const backBtn = await screen.findByLabelText('Voltar')
        fireEvent.click(backBtn)
        expect(onBackMock).toHaveBeenCalled()
    })

    it('handles duplicate registration (error 23505) gracefully', async () => {
        const { supabase } = await import('@/lib/supabase')
        const refetchMock = vi.fn()
            ; (useMatchDetail as any).mockReturnValue({
                data: mockMatchData,
                loading: false,
                error: null,
                refetch: refetchMock
            })

        // Mock supabase.from().insert() to return the duplicate key error
        const mockInsert = vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })
            ; (supabase.from as any).mockReturnValue({
                insert: mockInsert,
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { pixKey: 'admin@pix.com' }, error: null })
            })

        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)

        const registerBtn = await screen.findByText('Tô Dentro!')
        fireEvent.click(registerBtn)

        await waitFor(() => {
            // Should call refetch (onAction) instead of showing error
            expect(refetchMock).toHaveBeenCalled()
            expect(screen.queryByText('duplicate key')).not.toBeInTheDocument()
        })
    })

    it('shows Mensalista PRO button when user is Mensalista', async () => {
        ; (useCurrentUser as any).mockReturnValue({
            user: { isSuperAdmin: false },
            groups: [{ groupId: 'g1', role: 'PLAYER', subscriptionType: 'MENSALISTA' }],
        })

        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)

        expect(await screen.findByText('Tô Dentro! (PRO)')).toBeInTheDocument()
    })

    it('shows regular Tô Dentro button for Avulso', async () => {
        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)

        expect(await screen.findByText('Tô Dentro!')).toBeInTheDocument()
        expect(screen.queryByText('Tô Dentro! (PRO)')).not.toBeInTheDocument()
    })

    it('shows PRO badge on mensalista player in registration list', async () => {
        const matchWithMensalista = {
            ...mockMatchData,
            registrations: [
                { id: 'r1', userId: 'u1', status: 'CONFIRMED', subscriptionType: 'MENSALISTA', users: { displayName: 'Carlos PRO', mainPosition: 'ATTACK', globalScore: 4.5, avatarUrl: null } },
                { id: 'r2', userId: 'u2', status: 'CONFIRMED', subscriptionType: 'AVULSO', users: { displayName: 'João Avulso', mainPosition: 'DEFENSE', globalScore: 3.0, avatarUrl: null } },
            ]
        }
        ; (useMatchDetail as any).mockReturnValue({ data: matchWithMensalista, loading: false, error: null, refetch: vi.fn() })

        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)

        // PRO badge should appear for mensalista only
        const proBadges = await screen.findAllByText('PRO')
        expect(proBadges.length).toBe(1)
    })

    it('shows mensalista success message when confirmed as mensalista', async () => {
        const matchConfirmedMensalista = {
            ...mockMatchData,
            myRegistration: { id: 'r-me', userId: 'u1', status: 'CONFIRMED', subscriptionType: 'MENSALISTA' },
        }
        ; (useMatchDetail as any).mockReturnValue({ data: matchConfirmedMensalista, loading: false, error: null, refetch: vi.fn() })

        render(<MatchDetail matchId="m1" session={mockSession} onBack={vi.fn()} />)

        expect(await screen.findByText(/Mensalista/)).toBeInTheDocument()
        expect(screen.getByText(/entrada garantida/)).toBeInTheDocument()
    })
})

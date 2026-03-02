import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MatchDetail from './MatchDetail'
import { useMatchDetail } from '@/hooks/useMatchDetail'
import { useMatchEvaluations } from '@/hooks/useMatchEvaluations'
import { useMatchMvp } from '@/hooks/useMatchMvp'
import { useDraftState } from '@/hooks/useDraftState'

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
    myRegistration: null,
    registrations: [
        { id: 'r1', userId: 'u1', status: 'CONFIRMED', users: { displayName: 'Marcos', mainPosition: 'ATTACK', globalScore: 4.5 } }
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
    })

    it('renders match information correctly', async () => {
        render(<MatchDetail matchId="m1" session={mockSession} isAdmin={false} onBack={vi.fn()} />)

        expect(await screen.findByText('Test Match')).toBeInTheDocument()
        // Use regex for time and currency because of timezone and non-breaking space
        expect(screen.getByText(/1[7-9]:00/)).toBeInTheDocument()
        expect(screen.getByText(/R\$.*20,00/)).toBeInTheDocument()
        expect(screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' && content.includes('1') && content.includes('/10')
        })).toBeInTheDocument()
    })

    it('shows admin actions only to admins', async () => {
        const { rerender } = render(<MatchDetail matchId="m1" session={mockSession} isAdmin={false} onBack={vi.fn()} />)
        await waitFor(() => expect(screen.queryByText('CONFIGURAR E SORTEAR TIMES')).not.toBeInTheDocument())

        rerender(<MatchDetail matchId="m1" session={mockSession} isAdmin={true} onBack={vi.fn()} />)
        expect(await screen.findByText('CONFIGURAR E SORTEAR TIMES')).toBeInTheDocument()
    })

    it('shows evaluation button for finished matches where user participated', async () => {
        const finishedMatch = { ...mockMatchData, status: 'FINISHED', myRegistration: { status: 'CONFIRMED' } }
            ; (useMatchDetail as any).mockReturnValue({ data: finishedMatch, loading: false })

        render(<MatchDetail matchId="m1" session={mockSession} isAdmin={false} onBack={vi.fn()} />)

        expect(await screen.findByText('AVALIAR JOGADORES')).toBeInTheDocument()
    })

    it('shows MVP computing panel for finished matches to admin', async () => {
        const finishedMatch = { ...mockMatchData, status: 'FINISHED' }
            ; (useMatchDetail as any).mockReturnValue({ data: finishedMatch, loading: false })

        render(<MatchDetail matchId="m1" session={mockSession} isAdmin={true} onBack={vi.fn()} />)

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
                { id: 'r2', userId: 'u2', status: 'CONFIRMED', users: { displayName: 'Player 2', mainPosition: 'DEFENSE', globalScore: 3.0 } }
            ]
        }
            ; (useMatchDetail as any).mockReturnValue({ data: finishedMatch, loading: false })

        render(<MatchDetail matchId="m1" session={mockSession} isAdmin={false} onBack={vi.fn()} />)

        const evalBtn = await screen.findByText('AVALIAR JOGADORES')
        fireEvent.click(evalBtn)

        expect(screen.getByText('Avaliar Jogadores')).toBeInTheDocument()
        expect(screen.getByText('SALVAR AVALIAÇÕES')).toBeInTheDocument()
    })

    it('handles back navigation', async () => {
        const onBackMock = vi.fn()
        render(<MatchDetail matchId="m1" session={mockSession} isAdmin={false} onBack={onBackMock} />)

        const backBtn = await screen.findByLabelText('Voltar')
        fireEvent.click(backBtn)
        expect(onBackMock).toHaveBeenCalled()
    })
})

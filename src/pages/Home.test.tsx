import { render, screen, fireEvent } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Home from './Home'
import type { Match } from '@/hooks/useMatches'

/* ── Mocks ─────────────────────────────────────────────────────── */

const mockUseCurrentUser = vi.fn()
const mockUseMatches = vi.fn()
const mockUseMyRegistrations = vi.fn()
const mockUseMyEvaluatedMatches = vi.fn()

vi.mock('@/hooks/useCurrentUser', () => ({
    useCurrentUser: () => mockUseCurrentUser()
}))

vi.mock('@/hooks/useMatches', () => ({
    useMatches: () => mockUseMatches()
}))

vi.mock('@/hooks/useMyRegistrations', () => ({
    useMyRegistrations: () => mockUseMyRegistrations()
}))

vi.mock('@/hooks/useMyEvaluatedMatches', () => ({
    useMyEvaluatedMatches: () => mockUseMyEvaluatedMatches()
}))

/* ── Helpers ────────────────────────────────────────────────────── */

function makeMatch(overrides: Partial<Match> & { id: string }): Match {
    return {
        groupId: 'group-1',
        title: 'Partida Teste',
        scheduledAt: '2026-03-05T20:00:00Z',
        maxPlayers: 14,
        price: 20,
        status: 'OPEN',
        managerId: 'manager-1',
        createdAt: '2026-03-01T10:00:00Z',
        ...overrides,
    }
}

const defaultProps = {
    onCreateMatch: vi.fn(),
    onSelectMatch: vi.fn(),
    onSettings: vi.fn(),
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('Home Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        window.history.replaceState({}, '', '/')
        mockUseCurrentUser.mockReturnValue({ isAdminInAnyGroup: false })
        mockUseMyRegistrations.mockReturnValue({ data: {} })
        mockUseMyEvaluatedMatches.mockReturnValue({ evaluatedMatchIds: new Set<string>() })
    })

    /* ── Loading / Error / Empty ── */

    it('shows loader while loading', () => {
        mockUseMatches.mockReturnValue({ matches: [], loading: true, error: null })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Partidas')).toBeInTheDocument()
        // Loader2 spinner should be in DOM (it has the animate-spin class)
        expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('shows error message on error', () => {
        mockUseMatches.mockReturnValue({ matches: [], loading: false, error: 'Falha ao carregar' })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Falha ao carregar')).toBeInTheDocument()
    })

    it('shows empty state when no matches', () => {
        mockUseMatches.mockReturnValue({ matches: [], loading: false, error: null })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Nenhuma partida por aqui')).toBeInTheDocument()
    })

    /* ── Section Headers ── */

    it('shows "Próximas" section for OPEN matches', () => {
        mockUseMatches.mockReturnValue({
            matches: [makeMatch({ id: 'm1', status: 'OPEN', title: 'Fut Sábado' })],
            loading: false,
            error: null,
        })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Próximas')).toBeInTheDocument()
        expect(screen.getByText('Fut Sábado')).toBeInTheDocument()
    })

    it('shows "Encerradas" section for CLOSED/FINISHED matches', () => {
        mockUseMatches.mockReturnValue({
            matches: [
                makeMatch({ id: 'm1', status: 'CLOSED', title: 'Jogo Antigo' }),
                makeMatch({ id: 'm2', status: 'FINISHED', title: 'Jogo Finalizado' }),
            ],
            loading: false,
            error: null,
        })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Encerradas')).toBeInTheDocument()
        expect(screen.getByText('Jogo Antigo')).toBeInTheDocument()
        expect(screen.getByText('Jogo Finalizado')).toBeInTheDocument()
    })

    it('shows both sections when there are OPEN and CLOSED matches', () => {
        mockUseMatches.mockReturnValue({
            matches: [
                makeMatch({ id: 'm1', status: 'OPEN', title: 'Próxima Partida' }),
                makeMatch({ id: 'm2', status: 'CLOSED', title: 'Partida Passada' }),
            ],
            loading: false,
            error: null,
        })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Próximas')).toBeInTheDocument()
        expect(screen.getByText('Encerradas')).toBeInTheDocument()
    })

    /* ── Ordering ── */

    it('orders OPEN matches by scheduledAt ascending (nearest first)', () => {
        mockUseMatches.mockReturnValue({
            matches: [
                makeMatch({ id: 'm-far', status: 'OPEN', title: 'Longe', scheduledAt: '2026-03-10T20:00:00Z' }),
                makeMatch({ id: 'm-close', status: 'OPEN', title: 'Perto', scheduledAt: '2026-03-04T20:00:00Z' }),
                makeMatch({ id: 'm-mid', status: 'OPEN', title: 'Meio', scheduledAt: '2026-03-07T20:00:00Z' }),
            ],
            loading: false,
            error: null,
        })
        render(<Home {...defaultProps} />)

        const cards = screen.getAllByRole('heading', { level: 3 })
        expect(cards[0]).toHaveTextContent('Perto')
        expect(cards[1]).toHaveTextContent('Meio')
        expect(cards[2]).toHaveTextContent('Longe')
    })

    it('orders CLOSED/FINISHED matches by scheduledAt descending (most recent first)', () => {
        mockUseMatches.mockReturnValue({
            matches: [
                makeMatch({ id: 'm-old', status: 'CLOSED', title: 'Antiga', scheduledAt: '2026-02-20T20:00:00Z' }),
                makeMatch({ id: 'm-recent', status: 'CLOSED', title: 'Recente', scheduledAt: '2026-03-01T20:00:00Z' }),
            ],
            loading: false,
            error: null,
        })
        render(<Home {...defaultProps} />)

        const cards = screen.getAllByRole('heading', { level: 3 })
        expect(cards[0]).toHaveTextContent('Recente')
        expect(cards[1]).toHaveTextContent('Antiga')
    })

    /* ── Collapsible Past Section ── */

    it('collapses past matches beyond 3 with a "Ver mais" button', () => {
        const pastMatches = Array.from({ length: 5 }, (_, i) =>
            makeMatch({
                id: `past-${i}`,
                status: 'CLOSED',
                title: `Partida ${i + 1}`,
                scheduledAt: `2026-02-${String(20 + i).padStart(2, '0')}T20:00:00Z`,
            })
        )
        mockUseMatches.mockReturnValue({ matches: pastMatches, loading: false, error: null })
        render(<Home {...defaultProps} />)

        // Only 3 visible initially (DESC order: Partida 5, 4, 3)
        expect(screen.getByText('Partida 5')).toBeInTheDocument()
        expect(screen.getByText('Partida 4')).toBeInTheDocument()
        expect(screen.getByText('Partida 3')).toBeInTheDocument()
        expect(screen.queryByText('Partida 2')).not.toBeInTheDocument()
        expect(screen.queryByText('Partida 1')).not.toBeInTheDocument()

        // "Ver mais" button with count
        expect(screen.getByText('Ver mais 2 partidas')).toBeInTheDocument()
    })

    it('expands past matches when "Ver mais" is clicked', () => {
        const pastMatches = Array.from({ length: 5 }, (_, i) =>
            makeMatch({
                id: `past-${i}`,
                status: 'CLOSED',
                title: `Partida ${i + 1}`,
                scheduledAt: `2026-02-${String(20 + i).padStart(2, '0')}T20:00:00Z`,
            })
        )
        mockUseMatches.mockReturnValue({ matches: pastMatches, loading: false, error: null })
        render(<Home {...defaultProps} />)

        fireEvent.click(screen.getByText('Ver mais 2 partidas'))

        // All 5 should be visible now
        expect(screen.getByText('Partida 1')).toBeInTheDocument()
        expect(screen.getByText('Partida 2')).toBeInTheDocument()
        expect(screen.getByText('Mostrar menos')).toBeInTheDocument()
    })

    it('does not show collapse toggle when 3 or fewer past matches', () => {
        const pastMatches = Array.from({ length: 3 }, (_, i) =>
            makeMatch({
                id: `past-${i}`,
                status: 'CLOSED',
                title: `Partida ${i + 1}`,
                scheduledAt: `2026-02-${String(20 + i).padStart(2, '0')}T20:00:00Z`,
            })
        )
        mockUseMatches.mockReturnValue({ matches: pastMatches, loading: false, error: null })
        render(<Home {...defaultProps} />)

        expect(screen.queryByText(/Ver mais/)).not.toBeInTheDocument()
    })

    /* ── Match Card interactions ── */

    it('calls onSelectMatch when a card is clicked', () => {
        mockUseMatches.mockReturnValue({
            matches: [makeMatch({ id: 'match-123', status: 'OPEN', title: 'Clicável' })],
            loading: false,
            error: null,
        })
        render(<Home {...defaultProps} />)

        fireEvent.click(screen.getByText('Clicável'))

        expect(defaultProps.onSelectMatch).toHaveBeenCalledWith('match-123')
    })

    it('shows "Tô Dentro" button for OPEN match without registration', () => {
        mockUseMatches.mockReturnValue({
            matches: [makeMatch({ id: 'm1', status: 'OPEN' })],
            loading: false,
            error: null,
        })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Tô Dentro')).toBeInTheDocument()
    })

    it('shows "Confirmado" badge when user is confirmed', () => {
        mockUseMatches.mockReturnValue({
            matches: [makeMatch({ id: 'm1', status: 'OPEN' })],
            loading: false,
            error: null,
        })
        mockUseMyRegistrations.mockReturnValue({ data: { m1: 'CONFIRMED' } })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Confirmado ✓')).toBeInTheDocument()
    })

    it('shows "Aguardando pagamento" badge when status is RESERVED', () => {
        mockUseMatches.mockReturnValue({
            matches: [makeMatch({ id: 'm1', status: 'OPEN' })],
            loading: false,
            error: null,
        })
        mockUseMyRegistrations.mockReturnValue({ data: { m1: 'RESERVED' } })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
    })

    it('shows "Avaliações Enviadas" for evaluated closed matches', () => {
        mockUseMatches.mockReturnValue({
            matches: [makeMatch({ id: 'm1', status: 'CLOSED' })],
            loading: false,
            error: null,
        })
        mockUseMyRegistrations.mockReturnValue({ data: { m1: 'CONFIRMED' } })
        mockUseMyEvaluatedMatches.mockReturnValue({ evaluatedMatchIds: new Set(['m1']) })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Avaliações Enviadas')).toBeInTheDocument()
    })

    it('shows "Avaliar Jogadores" button for unevaluated closed matches', () => {
        mockUseMatches.mockReturnValue({
            matches: [makeMatch({ id: 'm1', status: 'CLOSED' })],
            loading: false,
            error: null,
        })
        mockUseMyRegistrations.mockReturnValue({ data: { m1: 'CONFIRMED' } })
        mockUseMyEvaluatedMatches.mockReturnValue({ evaluatedMatchIds: new Set<string>() })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Avaliar Jogadores')).toBeInTheDocument()
    })

    /* ── Admin features ── */

    it('shows Admin badge and settings button for admin users', () => {
        mockUseCurrentUser.mockReturnValue({ isAdminInAnyGroup: true })
        mockUseMatches.mockReturnValue({ matches: [], loading: false, error: null })
        render(<Home {...defaultProps} />)

        expect(screen.getByText('Admin')).toBeInTheDocument()
        expect(screen.getByLabelText('Painel do Admin')).toBeInTheDocument()
        expect(screen.getByLabelText('Criar partida')).toBeInTheDocument()
    })

    it('hides Admin badge and FAB for non-admin users', () => {
        mockUseCurrentUser.mockReturnValue({ isAdminInAnyGroup: false })
        mockUseMatches.mockReturnValue({ matches: [], loading: false, error: null })
        render(<Home {...defaultProps} />)

        expect(screen.queryByText('Admin')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Criar partida')).not.toBeInTheDocument()
    })

    it('calls onSettings when settings button is clicked', () => {
        mockUseCurrentUser.mockReturnValue({ isAdminInAnyGroup: true })
        mockUseMatches.mockReturnValue({ matches: [], loading: false, error: null })
        render(<Home {...defaultProps} />)

        fireEvent.click(screen.getByLabelText('Painel do Admin'))

        expect(defaultProps.onSettings).toHaveBeenCalledTimes(1)
    })

    it('calls onCreateMatch when FAB is clicked', () => {
        mockUseCurrentUser.mockReturnValue({ isAdminInAnyGroup: true })
        mockUseMatches.mockReturnValue({ matches: [], loading: false, error: null })
        render(<Home {...defaultProps} />)

        fireEvent.click(screen.getByLabelText('Criar partida'))

        expect(defaultProps.onCreateMatch).toHaveBeenCalledTimes(1)
    })

    /* ── Visual variant ── */

    it('applies green left border to upcoming match cards', () => {
        mockUseMatches.mockReturnValue({
            matches: [makeMatch({ id: 'm1', status: 'OPEN', title: 'Futebol' })],
            loading: false,
            error: null,
        })
        render(<Home {...defaultProps} />)

        const card = screen.getByText('Futebol').closest('div[class*="border-l-brand-green"]')
        expect(card).toBeInTheDocument()
    })

    it('does not apply green left border to past match cards', () => {
        mockUseMatches.mockReturnValue({
            matches: [makeMatch({ id: 'm1', status: 'CLOSED', title: 'Antigo' })],
            loading: false,
            error: null,
        })
        render(<Home {...defaultProps} />)

        const card = screen.getByText('Antigo').closest('div[class*="border-l-brand-green"]')
        expect(card).toBeNull()
    })
})

import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MatchStatusShare from './MatchStatusShare'

const mockMatchData = {
    title: 'Pelada de Quinta',
    scheduledAt: '2026-03-08T23:00:00Z',
    maxPlayers: 10,
    price: 25,
    confirmationDeadlineHours: 48,
    createdAt: '2026-03-06T01:00:00Z',
    registrations: [
        { status: 'CONFIRMED' as const, displayName: 'João Silva' },
        { status: 'CONFIRMED' as const, displayName: 'Pedro Santos' },
        { status: 'RESERVED' as const, displayName: 'Carlos Lima' },
    ],
}

describe('MatchStatusShare', () => {
    const onCloseMock = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders header and preview text', () => {
        render(
            <MatchStatusShare
                matchData={mockMatchData}
                matchTitle="Pelada de Quinta"
                onClose={onCloseMock}
            />,
        )

        expect(screen.getByText('Compartilhar Status')).toBeInTheDocument()
        expect(screen.getByText(/Pelada de Quinta/)).toBeInTheDocument()
        expect(screen.getByText(/BORAFUT/)).toBeInTheDocument()
    })

    it('shows confirmed and reserved players in preview', () => {
        render(
            <MatchStatusShare
                matchData={mockMatchData}
                matchTitle="Pelada de Quinta"
                onClose={onCloseMock}
            />,
        )

        expect(screen.getByText(/João Silva/)).toBeInTheDocument()
        expect(screen.getByText(/Pedro Santos/)).toBeInTheDocument()
        expect(screen.getByText(/Carlos Lima/)).toBeInTheDocument()
    })

    it('has WhatsApp and Copy buttons', () => {
        render(
            <MatchStatusShare
                matchData={mockMatchData}
                matchTitle="Pelada de Quinta"
                onClose={onCloseMock}
            />,
        )

        expect(screen.getByText('Enviar no WhatsApp')).toBeInTheDocument()
        expect(screen.getByText('Copiar')).toBeInTheDocument()
    })

    it('copies text to clipboard', async () => {
        Object.assign(navigator, {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        })

        render(
            <MatchStatusShare
                matchData={mockMatchData}
                matchTitle="Pelada de Quinta"
                onClose={onCloseMock}
            />,
        )

        fireEvent.click(screen.getByText('Copiar'))

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalled()
        })
    })

    it('calls onClose when close button is clicked', () => {
        render(
            <MatchStatusShare
                matchData={mockMatchData}
                matchTitle="Pelada de Quinta"
                onClose={onCloseMock}
            />,
        )

        const closeBtn = screen.getByLabelText('Fechar')
        fireEvent.click(closeBtn)
        expect(onCloseMock).toHaveBeenCalled()
    })

    it('opens WhatsApp link when button is clicked', () => {
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

        render(
            <MatchStatusShare
                matchData={mockMatchData}
                matchTitle="Pelada de Quinta"
                onClose={onCloseMock}
            />,
        )

        fireEvent.click(screen.getByText('Enviar no WhatsApp'))

        expect(openSpy).toHaveBeenCalledWith(
            expect.stringContaining('wa.me'),
            '_blank',
            'noopener,noreferrer',
        )

        openSpy.mockRestore()
    })
})

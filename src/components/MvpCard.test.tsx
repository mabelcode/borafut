import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MvpCard from '@/components/MvpCard'

// Mock html-to-image so we don't need real canvas support in jsdom
vi.mock('html-to-image', () => ({
    toPng: vi.fn().mockResolvedValue('data:image/png;base64,mock')
}))

describe('MvpCard Component', () => {
    const mockMvps = [
        { userId: '1', displayName: 'Neymar Jr', avatarUrl: null, avgScore: 4.88, evaluateCount: 5, rank: 1, mainPosition: 'ATTACK' }
    ]

    it('should format and render the primary MVP properly', () => {
        render(
            <MvpCard
                mvps={mockMvps}
                matchTitle="Final da Champions"
                matchDate="2026-03-01T15:00:00Z"
                onClose={vi.fn()}
            />
        )
        expect(screen.getByText('Neymar Jr')).toBeInTheDocument()
        // Should round 4.88 to 4.9
        expect(screen.getByText('4.9')).toBeInTheDocument()
        expect(screen.getByText('Final da Champions')).toBeInTheDocument()
    })

    it('should show both MVPs if there is a tie', () => {
        const tieMvps = [
            { userId: '1', displayName: 'Jogador A', avatarUrl: null, avgScore: 4.8, evaluateCount: 5, rank: 1, mainPosition: 'DEFENSE' },
            { userId: '2', displayName: 'Jogador B', avatarUrl: null, avgScore: 4.8, evaluateCount: 5, rank: 1, mainPosition: 'ATTACK' }
        ]
        render(
            <MvpCard
                mvps={tieMvps}
                matchTitle="Empate"
                matchDate="2026-03-01T15:00:00Z"
                onClose={vi.fn()}
            />
        )
        expect(screen.getByText('Jogador A')).toBeInTheDocument()
        expect(screen.getByText('Jogador B')).toBeInTheDocument()
    })
})

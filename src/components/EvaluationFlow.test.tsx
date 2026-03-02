import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EvaluationFlow from '@/components/EvaluationFlow'
import * as evaluationsHook from '@/hooks/useMatchEvaluations'

// Mock the hook that talks to Supabase
vi.mock('@/hooks/useMatchEvaluations', () => ({
    useMatchEvaluations: vi.fn()
}))

describe('EvaluationFlow Component', () => {
    const mockUseMatchEvaluations = evaluationsHook.useMatchEvaluations as any

    beforeEach(() => {
        // Default hook return state
        mockUseMatchEvaluations.mockReturnValue({
            ratingsMap: {},
            loading: false,
            submitting: false,
            submitted: false,
            error: null,
            fetchMyEvaluations: vi.fn(),
            submitEvaluations: vi.fn().mockResolvedValue(true)
        })
    })

    const mockRegistrations = [
        { userId: 'user-2', status: 'CONFIRMED', users: { displayName: 'Carlos Silva', mainPosition: 'ATTACK' } },
        { userId: 'user-3', status: 'CONFIRMED', users: { displayName: 'Roberto', mainPosition: 'DEFENSE' } }
    ] as any

    it('should render the list of confirmed players excluding current user', () => {
        render(
            <EvaluationFlow
                matchId="match-123"
                currentUserId="user-1" // Different from mock users
                confirmedRegistrations={mockRegistrations}
                onClose={vi.fn()}
            />
        )

        expect(screen.getByText('Carlos Silva')).toBeInTheDocument()
        expect(screen.getByText('Roberto')).toBeInTheDocument()
    })

    it('should disable submit button initially until all players are rated', () => {
        render(
            <EvaluationFlow
                matchId="match-123"
                currentUserId="user-1"
                confirmedRegistrations={mockRegistrations}
                onClose={vi.fn()}
            />
        )

        const saveButton = screen.getByRole('button', { name: /salvar avaliações/i })
        expect(saveButton).toBeDisabled()
    })
})

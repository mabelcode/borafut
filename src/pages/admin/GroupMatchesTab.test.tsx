import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GroupMatchesTab from './GroupMatchesTab'
import { supabase } from '@/lib/supabase'
import { useMatches } from '@/hooks/useMatches'

// Mock useMatches hook
vi.mock('@/hooks/useMatches', () => ({
    useMatches: vi.fn()
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        trace: vi.fn()
    }
}))

const mockMatches = [
    {
        id: 'match-1',
        title: 'Bora de Terça',
        scheduledAt: '2026-02-25T19:00:00Z',
        maxPlayers: 12,
        price: 30,
        status: 'OPEN',
        match_registrations: { count: 8 }
    }
]

describe('GroupMatchesTab Component', () => {
    const mockGroupId = 'group-123'

    beforeEach(() => {
        vi.clearAllMocks()
            ; (useMatches as any).mockReturnValue({
                matches: mockMatches,
                loading: false,
                error: null,
                refetch: vi.fn()
            })

            // Mock default supabase chain
            ; (supabase.from as any).mockReturnValue({
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
                insert: vi.fn().mockResolvedValue({ error: null }),
                update: vi.fn().mockResolvedValue({ error: null })
            })
    })

    it('renders match list correctly', () => {
        render(<GroupMatchesTab groupId={mockGroupId} />)

        expect(screen.getByText('Bora de Terça')).toBeInTheDocument()
    })

    it('opens create modal when clicking the "nova" button', async () => {
        render(<GroupMatchesTab groupId={mockGroupId} />)

        const novaBtn = screen.getByText(/NOVA/i)
        fireEvent.click(novaBtn)

        await waitFor(() => {
            expect(screen.getByText(/Nova Partida/i, { selector: 'h3' })).toBeInTheDocument()
        })
    })

    it('handles match deletion with confirmation modal', async () => {
        render(<GroupMatchesTab groupId={mockGroupId} />)

        // Find by aria-label
        const deleteBtn = screen.getByLabelText(/Excluir partida/i)
        fireEvent.click(deleteBtn)

        // Modal should appear - Note: no question mark in the source code header
        await waitFor(() => {
            expect(screen.getByText(/Excluir Partida/i, { selector: 'h2' })).toBeInTheDocument()
        })

        // Mock supabase delete
        const mockDelete = vi.fn().mockReturnThis()
        const mockEq = vi.fn().mockResolvedValue({ error: null })
            ; (supabase.from as any).mockReturnValue({
                delete: mockDelete,
                eq: mockEq
            })

        // Confirm deletion
        const confirmBtn = screen.getByRole('button', { name: /Sim, Excluir/i })
        fireEvent.click(confirmBtn)

        await waitFor(() => {
            expect(mockDelete).toHaveBeenCalled()
            expect(mockEq).toHaveBeenCalledWith('id', 'match-1')
        })
    })
})

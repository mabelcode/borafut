import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GroupFinanceTab from './GroupFinanceTab'
import { supabase } from '@/lib/supabase'

const mockPendingRegs = [
    {
        id: 'reg-1',
        matchId: 'match-1',
        status: 'RESERVED',
        match: { title: 'Pelada de Terça', scheduledAt: '2026-02-25T19:00:00Z', groupId: 'group-123' },
        user: { id: 'user-1', displayName: 'João Silva', phoneNumber: '5511999999999' }
    }
]

describe('GroupFinanceTab Component', () => {
    const mockGroupId = 'group-123'

    beforeEach(() => {
        vi.clearAllMocks()

            // Mock auth.getUser
            ; (supabase.auth.getUser as any).mockResolvedValue({
                data: { user: { id: 'admin-123' } },
                error: null
            })

            // Mock generic from chain
            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { pixKey: 'test@pix.com' }, error: null }),
                update: vi.fn().mockResolvedValue({ error: null })
            })
    })

    it('fetches and displays the PIX key on mount', async () => {
        render(<GroupFinanceTab groupId={mockGroupId} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('test@pix.com')).toBeInTheDocument()
        })
    })

    it('disables save button if PIX key is not changed', async () => {
        render(<GroupFinanceTab groupId={mockGroupId} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('test@pix.com')).toBeInTheDocument()
        })

        const saveBtn = screen.getByText('Salvar')
        expect(saveBtn).toBeDisabled()
    })

    it('enables save button when PIX key is modified', async () => {
        render(<GroupFinanceTab groupId={mockGroupId} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('test@pix.com')).toBeInTheDocument()
        })

        const input = screen.getByPlaceholderText(/Chave Pix/)
        fireEvent.change(input, { target: { value: 'new@pix.com' } })

        const saveBtn = screen.getByText('Salvar')
        expect(saveBtn).not.toBeDisabled()
    })

    it('handles PIX key update', async () => {
        const mockUpdate = vi.fn().mockReturnThis()
            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { pixKey: 'test@pix.com' }, error: null }),
                update: mockUpdate,
                then: (onSuccess: any) => onSuccess({ error: null })
            })

        render(<GroupFinanceTab groupId={mockGroupId} />)

        const input = await screen.findByDisplayValue('test@pix.com')
        fireEvent.change(input, { target: { value: 'updated@pix.com' } })

        fireEvent.click(screen.getByText('Salvar'))

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith({ pixKey: 'updated@pix.com' })
        })
    })

    it('renders pending registrations for the group', async () => {
        // Mock registrations fetch
        ; (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'users') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { pixKey: 'test@pix.com' } })
                }
            }
            if (table === 'match_registrations') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    then: (onSuccess: any) => onSuccess({ data: mockPendingRegs, error: null })
                }
            }
        })

        render(<GroupFinanceTab groupId={mockGroupId} />)

        await waitFor(() => {
            expect(screen.getByText('João Silva')).toBeInTheDocument()
            expect(screen.getByText('Pelada de Terça')).toBeInTheDocument()
        })
    })

    it('applies status guard when confirming payment', async () => {
        const mockEq = vi.fn().mockReturnThis()
        const mockUpdate = vi.fn().mockReturnThis()
        const mockThen = vi.fn((onSuccess) => onSuccess({ error: null }))

            ; (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'users') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: { pixKey: 'test@pix.com' } })
                    }
                }
                if (table === 'match_registrations') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        update: mockUpdate,
                        then: (onSuccess: any) => onSuccess({ data: mockPendingRegs, error: null })
                    }
                }
            })

        // Re-mock separate chain for handleConfirmPayment
        mockUpdate.mockReturnValue({
            eq: mockEq,
        })
        mockEq.mockReturnValue({
            eq: mockEq,
            then: mockThen
        })

        render(<GroupFinanceTab groupId={mockGroupId} />)

        const confirmBtn = await screen.findByText('CONFIRMAR PIX')
        fireEvent.click(confirmBtn)

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith({ status: 'CONFIRMED' })
            expect(mockEq).toHaveBeenCalledWith('status', 'RESERVED')
            expect(mockEq).toHaveBeenCalledWith('id', 'reg-1')
        })
    })
})

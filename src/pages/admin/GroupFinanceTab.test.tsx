import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
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

        // Factory for clean promises
        function createSupabaseChain(resolvedValue: any, overrides = {}) {
            const chain: any = {
                then: (resolve: any) => resolve(resolvedValue),
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                ...overrides
            }
            return chain
        }

        // Default generic mock
        ; (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'users') {
                return createSupabaseChain({ data: { pixKey: 'test@pix.com' }, error: null })
            }
            if (table === 'groups') {
                return createSupabaseChain({ data: { pixKey: 'test@pix.com' }, error: null })
            }
            if (table === 'group_members') {
                return createSupabaseChain({ data: [], error: null })
            }
            if (table === 'match_registrations') {
                return createSupabaseChain({ data: mockPendingRegs, error: null })
            }
            return createSupabaseChain({ data: [], error: null })
        })
    })

    it('fetches and displays the PIX key on mount', async () => {
        render(<GroupFinanceTab groupId={mockGroupId} />)
        const input = await screen.findByDisplayValue('test@pix.com')
        expect(input).toBeInTheDocument()
    })

    it('disables save button if PIX key is not changed', async () => {
        render(<GroupFinanceTab groupId={mockGroupId} />)
        await screen.findByDisplayValue('test@pix.com')
        const saveBtn = screen.getByText('Salvar')
        expect(saveBtn).toBeDisabled()
    })

    it('enables save button when PIX key is modified', async () => {
        render(<GroupFinanceTab groupId={mockGroupId} />)
        const input = await screen.findByDisplayValue('test@pix.com')
        fireEvent.change(input, { target: { value: 'new@pix.com' } })
        const saveBtn = screen.getByText('Salvar')
        expect(saveBtn).not.toBeDisabled()
    })

    it('handles PIX key update', async () => {
        const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                then: (res: any) => res({ error: null })
            })
        })

            ; (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'users') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockReturnThis(),
                        maybeSingle: vi.fn().mockReturnThis(),
                        update: mockUpdate,
                        then: (res: any) => res({ data: { pixKey: 'test@pix.com' }, error: null })
                    }
                }
                if (table === 'group_members') {
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (res: any) => res({ data: [], error: null }) }
                }
                return {
                    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (res: any) => res({ data: mockPendingRegs, error: null })
                }
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
        render(<GroupFinanceTab groupId={mockGroupId} />)
        await waitFor(() => {
            expect(screen.getByText('João Silva')).toBeInTheDocument()
            expect(screen.getByText('Pelada de Terça')).toBeInTheDocument()
        })
    })

    it('applies status guard when confirming payment', async () => {
        const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            then: (res: any) => res({ error: null })
        })

            ; (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'match_registrations') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockReturnThis(),
                        update: mockUpdate,
                        then: (res: any) => res({ data: mockPendingRegs, error: null })
                    }
                }
                if (table === 'users') {
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(), then: (res: any) => res({ data: { pixKey: 'test@pix.com' }, error: null }) }
                }
                if (table === 'group_members') {
                    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), then: (res: any) => res({ data: [], error: null }) }
                }
            })

        render(<GroupFinanceTab groupId={mockGroupId} />)

        const confirmBtn = await screen.findByText('CONFIRMAR PIX')
        fireEvent.click(confirmBtn)

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith({ status: 'CONFIRMED' })
        })
    })
})

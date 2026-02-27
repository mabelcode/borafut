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
            const chain = Promise.resolve(resolvedValue) as any
            const chainMethods = {
                select: vi.fn().mockReturnValue(chain),
                eq: vi.fn().mockReturnValue(chain),
                order: vi.fn().mockReturnValue(chain),
                single: vi.fn().mockReturnValue(chain),
                maybeSingle: vi.fn().mockReturnValue(chain),
                update: vi.fn().mockReturnValue(chain),
                ...overrides
            }
            Object.assign(chain, chainMethods)
            return chain
        }

        // Default generic mock
        ; (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'users') {
                const chain = Promise.resolve({ data: { id: 'admin-123', pixKey: 'test@pix.com' }, error: null }) as any
                chain.select = vi.fn().mockReturnValue(chain)
                chain.eq = vi.fn().mockReturnValue(chain)
                chain.single = vi.fn().mockReturnValue(chain)
                chain.maybeSingle = vi.fn().mockReturnValue(chain)
                chain.update = vi.fn().mockReturnValue(chain)
                return chain
            }
            if (table === 'groups') {
                return createSupabaseChain({ data: { id: 'group-123', pixKey: 'test@pix.com' }, error: null })
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
        const mockChain = Promise.resolve({ error: null }) as any
        mockChain.eq = vi.fn().mockReturnValue(mockChain)
        mockChain.select = vi.fn().mockReturnValue(mockChain)
        const mockUpdate = vi.fn().mockReturnValue(mockChain)

            ; (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'users') {
                    const chain = Promise.resolve({ data: { id: 'admin-123', pixKey: 'test@pix.com' }, error: null }) as any
                    chain.select = vi.fn().mockReturnValue(chain)
                    chain.eq = vi.fn().mockReturnValue(chain)
                    chain.single = vi.fn().mockReturnValue(chain)
                    chain.maybeSingle = vi.fn().mockReturnValue(chain)
                    chain.update = mockUpdate
                    return chain
                }
                if (table === 'group_members') {
                    const chain = Promise.resolve({ data: [], error: null }) as any
                    chain.select = vi.fn().mockReturnValue(chain)
                    chain.eq = vi.fn().mockReturnValue(chain)
                    return chain
                }
                const pendingChain = Promise.resolve({ data: mockPendingRegs, error: null }) as any
                pendingChain.select = vi.fn().mockReturnValue(pendingChain)
                pendingChain.eq = vi.fn().mockReturnValue(pendingChain)
                return pendingChain
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
        const updateChain = Promise.resolve({ error: null }) as any
        updateChain.eq = vi.fn().mockReturnValue(updateChain)
        updateChain.select = vi.fn().mockReturnValue(updateChain)
        const mockUpdate = vi.fn().mockReturnValue(updateChain)

            ; (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'match_registrations') {
                    const chain = Promise.resolve({ data: mockPendingRegs, error: null }) as any
                    chain.select = vi.fn().mockReturnValue(chain)
                    chain.eq = vi.fn().mockReturnValue(chain)
                    chain.order = vi.fn().mockReturnValue(chain)
                    chain.update = mockUpdate
                    return chain
                }
                if (table === 'users') {
                    const chain = Promise.resolve({ data: { pixKey: 'test@pix.com' }, error: null }) as any
                    chain.select = vi.fn().mockReturnValue(chain)
                    chain.eq = vi.fn().mockReturnValue(chain)
                    chain.maybeSingle = vi.fn().mockReturnValue(chain)
                    return chain
                }
                if (table === 'group_members') {
                    const chain = Promise.resolve({ data: [], error: null }) as any
                    chain.select = vi.fn().mockReturnValue(chain)
                    chain.eq = vi.fn().mockReturnValue(chain)
                    return chain
                }
            })

        render(<GroupFinanceTab groupId={mockGroupId} />)

        const confirmBtn = await screen.findByText('CONFIRMAR PIX')
        fireEvent.click(confirmBtn)

        await waitFor(() => {
            expect(updateChain.eq).toHaveBeenCalledWith('status', 'RESERVED')
            expect(mockUpdate).toHaveBeenCalledWith({ status: 'CONFIRMED' })
        })
    })
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import UserDetailsView from './UserDetailsView'
import { supabase } from '@/lib/supabase'

const mockUser = {
    id: 'user-1',
    displayName: 'Carlos',
    phoneNumber: '11999999999',
    globalScore: 3.5,
    mainPosition: 'DEFENSE',
    isSuperAdmin: false,
    createdAt: '2026-02-20T10:00:00Z'
}

const mockMemberships = [
    {
        id: 'member-1',
        groupId: 'group-1',
        role: 'PLAYER',
        joinedAt: '2026-02-21T10:00:00Z',
        group: { name: 'Futebol da Quinta' }
    }
]

describe('UserDetailsView Component', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    function mockSupabaseResponse(user: any = mockUser, memberships: any = mockMemberships) {
        const mockUsersChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: user, error: null })
        }
        mockUsersChain.select.mockReturnValue(mockUsersChain)
        mockUsersChain.eq.mockReturnValue(mockUsersChain)

        const mockGroupMembersChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: memberships, error: null }),
            delete: vi.fn().mockReturnThis()
        }
        mockGroupMembersChain.select.mockReturnValue(mockGroupMembersChain)
        mockGroupMembersChain.delete.mockReturnValue(mockGroupMembersChain)

            ; (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'users') return mockUsersChain
                if (table === 'group_members') return mockGroupMembersChain
            })
    }

    it('renders loading state initially', () => {
        ; (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnValue(new Promise(() => { }))
        })

        const { container } = render(<UserDetailsView userId="user-1" onBack={vi.fn()} />)
        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders user profile and memberships correctly', async () => {
        mockSupabaseResponse()
        render(<UserDetailsView userId="user-1" onBack={vi.fn()} governanceLevel="VIEW" />)

        await waitFor(() => {
            expect(screen.getAllByText('Carlos')[0]).toBeInTheDocument()
        })
        expect(screen.getByText('11999999999')).toBeInTheDocument()
        expect(screen.getByText(/Futebol da Quinta/i)).toBeInTheDocument()

        // Moderação do Super Admin should not be visible in VIEW mode
        expect(screen.queryByText(/Moderação do Super Admin/i)).not.toBeInTheDocument()
    })

    it('enables the SAVE button only when changes are made (SYSTEM level)', async () => {
        mockSupabaseResponse()
        render(<UserDetailsView userId="user-1" onBack={vi.fn()} governanceLevel="SYSTEM" />)

        await waitFor(() => {
            expect(screen.getAllByText('Carlos')[0]).toBeInTheDocument()
        })

        const btnSave = screen.getByRole('button', { name: /SALVAR ALTERAÇÕES/i })
        expect(btnSave).toBeDisabled()

        // The score input is type=number, default 3.5
        const scoreInput = screen.getByRole('spinbutton')
        fireEvent.change(scoreInput, { target: { value: '4.5' } })

        expect(btnSave).not.toBeDisabled()

        // Revert to original
        fireEvent.change(scoreInput, { target: { value: '3.5' } })
        expect(btnSave).toBeDisabled()
    })

    it('calls admin_update_user_profile RPC on save', async () => {
        mockSupabaseResponse()
        const rpcMock = vi.fn().mockResolvedValue({ error: null })
        supabase.rpc = rpcMock

        render(<UserDetailsView userId="user-1" onBack={vi.fn()} governanceLevel="SYSTEM" />)

        await waitFor(() => {
            expect(screen.getAllByText('Carlos')[0]).toBeInTheDocument()
        })

        const scoreInput = screen.getByRole('spinbutton')
        fireEvent.change(scoreInput, { target: { value: '4.5' } })

        const btnSave = screen.getByRole('button', { name: /SALVAR ALTERAÇÕES/i })
        fireEvent.click(btnSave)

        expect(rpcMock).toHaveBeenCalledWith('admin_update_user_profile', {
            p_user_id: 'user-1',
            p_global_score: 4.5,
            p_main_position: 'DEFENSE' // Original
        })
    })

    it('opens confirm modal when clicking to remove member from group', async () => {
        mockSupabaseResponse()
        render(<UserDetailsView userId="user-1" onBack={vi.fn()} governanceLevel="SYSTEM" />)

        await waitFor(() => {
            expect(screen.getByText(/Futebol da Quinta/i)).toBeInTheDocument()
        })

        const removeBtns = screen.getAllByTitle('Remover do Grupo')
        fireEvent.click(removeBtns[0])

        expect(screen.getByText('Esta ação não pode ser desfeita')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Sim, Remover/i })).toBeInTheDocument()
    })
})

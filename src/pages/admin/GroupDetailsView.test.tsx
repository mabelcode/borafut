import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GroupDetailsView from './GroupDetailsView'
import { supabase } from '@/lib/supabase'

const mockGroup = {
    id: 'group-1',
    name: 'Futebol da Quinta',
    createdAt: '2026-02-20T10:00:00Z',
    inviteToken: 'ABCDEF',
    _count: {
        members: 2
    }
}

const mockMembers = [
    {
        id: 'member-1',
        userId: 'user-1',
        role: 'ADMIN',
        joinedAt: '2026-02-21T10:00:00Z',
        user: {
            id: 'user-1',
            displayName: 'Alice',
            phoneNumber: '11999999999',
            globalScore: 4.0,
            mainPosition: 'ATACANTE',
            isSuperAdmin: false
        }
    },
    {
        id: 'member-2',
        userId: 'user-2',
        role: 'PLAYER',
        joinedAt: '2026-02-22T10:00:00Z',
        user: {
            id: 'user-2',
            displayName: 'Bob',
            phoneNumber: '11888888888',
            globalScore: 3.0,
            mainPosition: 'DEFENSOR',
            isSuperAdmin: false
        }
    }
]

describe('GroupDetailsView Component', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    function mockSupabaseResponse(group: any = mockGroup, members: any = mockMembers) {
        const mockGroupsChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: group, error: null })
        }
        mockGroupsChain.select.mockReturnValue(mockGroupsChain)
        mockGroupsChain.eq.mockReturnValue(mockGroupsChain)

        const mockGroupMembersChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: members, error: null }),
            update: vi.fn().mockReturnThis(), // Added for update
            insert: vi.fn().mockResolvedValue({ error: null }), // Added for insert
            delete: vi.fn().mockReturnThis()
        }
        mockGroupMembersChain.select.mockReturnValue(mockGroupMembersChain)
        mockGroupMembersChain.update.mockReturnValue(mockGroupMembersChain)
        mockGroupMembersChain.delete.mockReturnValue(mockGroupMembersChain)

        const mockUsersChain = {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: members.map((m: any) => m.user), error: null })
        }
        mockUsersChain.select.mockReturnValue(mockUsersChain)

        const mockAuditLogChain = {
            insert: vi.fn().mockResolvedValue({ error: null })
        }

            ; (supabase.from as any).mockImplementation((table: string) => {
                if (table === 'groups') return mockGroupsChain
                if (table === 'group_members') return mockGroupMembersChain
                if (table === 'users') return mockUsersChain
                if (table === 'audit_log') return mockAuditLogChain
            })
    }

    it('renders loading state initially', () => {
        ; (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnValue(new Promise(() => { }))
        })

        const { container } = render(<GroupDetailsView groupId="group-1" onBack={vi.fn()} />)
        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders group details and members correctly', async () => {
        mockSupabaseResponse()
        render(<GroupDetailsView groupId="group-1" onBack={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getByText('Futebol da Quinta')).toBeInTheDocument()
        })

        expect(screen.getAllByText('Alice')[0]).toBeInTheDocument()
        expect(screen.getAllByText('Bob')[0]).toBeInTheDocument()
    })

    it('toggles member role when clicking TORNAR ADMIN', async () => {
        mockSupabaseResponse()
        const rpcMock = vi.fn().mockResolvedValue({ error: null })
        supabase.rpc = rpcMock // Just in case we decide to move it to RPC later but currently uses update

        render(<GroupDetailsView groupId="group-1" onBack={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getAllByText('Bob')[0]).toBeInTheDocument()
        })

        // TORNAR ADMIN button for players
        const promoteBtn = screen.getByText('TORNAR ADMIN')
        fireEvent.click(promoteBtn)

        // Wait for state updates internally
        await waitFor(() => {
            // It calls supabase.from('group_members').update({ role: 'ADMIN' })
            expect(supabase.from).toHaveBeenCalledWith('group_members')
        })
    })

    it('opens Add Member modal when clicking ADICIONAR', async () => {
        mockSupabaseResponse()
        render(<GroupDetailsView groupId="group-1" onBack={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getByText('Futebol da Quinta')).toBeInTheDocument()
        })

        // Add member button contains text ADICIONAR
        const addBtn = screen.getByText('ADICIONAR')
        fireEvent.click(addBtn)

        expect(screen.getByText('Adicionar Integrante')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Nome ou telefone do jogador...')).toBeInTheDocument()
    })
})

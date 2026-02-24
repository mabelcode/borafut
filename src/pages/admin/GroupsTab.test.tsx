import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GroupsTab from './GroupsTab'
import { supabase } from '@/lib/supabase'

// Mock useCurrentUser
vi.mock('@/hooks/useCurrentUser', () => ({
    useCurrentUser: () => ({ user: { id: 'admin-123' } })
}))

const mockGroups = [
    {
        id: 'group-1',
        name: 'Pelada de Terça',
        group_members: [{ count: 12 }],
        createdAt: '2026-02-23T10:00:00Z'
    },
    {
        id: 'group-2',
        name: 'Society do FDS',
        group_members: [{ count: 5 }],
        createdAt: '2026-02-24T10:00:00Z'
    }
]

describe('GroupsTab Component', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    function mockSupabaseResponse(data: any = mockGroups) {
        ; (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data, error: null }),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'new-id', name: 'New Group' }, error: null })
        })
    }

    it('renders loading state initially', () => {
        const mockSelect = vi.fn().mockReturnThis()
        const mockOrder = vi.fn().mockReturnValue(new Promise(() => { })) // pending promise
            ; (supabase.from as any).mockReturnValue({
                select: mockSelect,
                order: mockOrder
            })

        const { container } = render(<GroupsTab onSelectGroup={vi.fn()} />)
        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders groups list after loading', async () => {
        mockSupabaseResponse()
        render(<GroupsTab onSelectGroup={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getByText('Pelada de Terça')).toBeInTheDocument()
            expect(screen.getByText('Society do FDS')).toBeInTheDocument()
        })
        expect(screen.getByText('12 Membros')).toBeInTheDocument()
        expect(screen.getByText('5 Membros')).toBeInTheDocument()
    })

    it('filters groups based on search input', async () => {
        mockSupabaseResponse()
        render(<GroupsTab onSelectGroup={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getByText('Pelada de Terça')).toBeInTheDocument()
            expect(screen.getByText('Society do FDS')).toBeInTheDocument()
        })

        const searchInput = screen.getByPlaceholderText('Buscar grupo...')
        fireEvent.change(searchInput, { target: { value: 'Terça' } })

        expect(screen.getByText('Pelada de Terça')).toBeInTheDocument()
        expect(screen.queryByText('Society do FDS')).not.toBeInTheDocument()
    })

    it('opens create modal when clicking the add button', async () => {
        mockSupabaseResponse()
        render(<GroupsTab onSelectGroup={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getByText('Pelada de Terça')).toBeInTheDocument()
        })

        // Find the plus button using getByRole and selecting the one containing the Plus icon via class or index
        const buttons = screen.getAllByRole('button')
        // The first button in the document is the "Add" button next to search
        fireEvent.click(buttons[0])

        expect(screen.getByText('Novo Grupo')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Ex: Pelada dos Amigos')).toBeInTheDocument()
    })
})

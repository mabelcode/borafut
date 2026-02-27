import { render, screen, fireEvent, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import UsersTab from './UsersTab'
import { supabase } from '@/lib/supabase'

const mockUsers = [
    {
        id: 'user-1',
        displayName: 'Alice Silva',
        phoneNumber: '11999999999',
        mainPosition: 'ATACANTE',
        globalScore: 4.5,
        isSuperAdmin: true,
        createdAt: '2026-02-20T10:00:00Z',
        group_members: [{ count: 3 }]
    },
    {
        id: 'user-2',
        displayName: 'Bruno Costa',
        phoneNumber: '11888888888',
        mainPosition: 'DEFENSOR',
        globalScore: 3.2,
        isSuperAdmin: false,
        createdAt: '2026-02-22T10:00:00Z',
        group_members: [{ count: 1 }]
    }
]

describe('UsersTab Component', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    function mockSupabaseResponse(data: any = mockUsers) {
        ; (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data, error: null })
        })
    }

    it('renders loading state initially', () => {
        const mockSelect = vi.fn().mockReturnThis()
        const mockOrder = vi.fn().mockReturnValue(new Promise(() => { }))
            ; (supabase.from as any).mockReturnValue({
                select: mockSelect,
                order: mockOrder
            })

        const { container } = render(<UsersTab onSelectUser={vi.fn()} />)
        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders users list after loading', async () => {
        mockSupabaseResponse()
        render(<UsersTab onSelectUser={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument()
            expect(screen.getByText('Bruno Costa')).toBeInTheDocument()
        })
        expect(screen.getByText('11999999999')).toBeInTheDocument()
        expect(screen.getByText('Score: 4.5')).toBeInTheDocument()
        expect(screen.getByText('3 grupos')).toBeInTheDocument()
    })

    it('filters users based on search input (name or phone)', async () => {
        mockSupabaseResponse()
        render(<UsersTab onSelectUser={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument()
        })

        const searchInput = screen.getByPlaceholderText(/Buscar usuário/i)

        // Search by name
        fireEvent.change(searchInput, { target: { value: 'Bruno' } })
        expect(screen.getByText('Bruno Costa')).toBeInTheDocument()
        expect(screen.queryByText('Alice Silva')).not.toBeInTheDocument()

        // Search by phone
        fireEvent.change(searchInput, { target: { value: '999999' } })
        expect(screen.getByText('Alice Silva')).toBeInTheDocument()
        expect(screen.queryByText('Bruno Costa')).not.toBeInTheDocument()
    })

    it('sorts users when SortSelector changes (Score)', async () => {
        mockSupabaseResponse()
        render(<UsersTab onSelectUser={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument()
        })

        const scoreSortButton = screen.getByText('NÍVEL')
        fireEvent.click(scoreSortButton)

        // Since Alice has 4.5 and Bruno has 3.2, Alice should appear first (b.score - a.score)
        const names = screen.getAllByRole('heading', { level: 3 })
        expect(names[0]).toHaveTextContent('Alice Silva')
        expect(names[1]).toHaveTextContent('Bruno Costa')
    })

    it('calls onSelectUser when a user row arrow is clicked', async () => {
        mockSupabaseResponse()
        const handleSelect = vi.fn()
        render(<UsersTab onSelectUser={handleSelect} />)

        await waitFor(() => {
            expect(screen.getByText('Alice Silva')).toBeInTheDocument()
        })

        // Use getAllByRole to find the specific arrow buttons next to users
        const buttons = screen.getAllByRole('button')
        // The first 4 buttons are usually from SortSelector. We'll pick a button containing ArrowRight.
        // Or we can query inside a specific row if we wrap it in data-testid,
        // but let's click the last button which belongs to Bruno
        fireEvent.click(buttons[buttons.length - 1])

        expect(handleSelect).toHaveBeenCalledTimes(1)
        expect(handleSelect).toHaveBeenCalledWith('user-2')
    })
})

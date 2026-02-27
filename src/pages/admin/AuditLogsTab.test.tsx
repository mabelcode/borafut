import { render, screen, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AuditLogsTab from './AuditLogsTab'
import { supabase } from '@/lib/supabase'

const mockLogs = [
    {
        id: '1',
        action: 'CREATED_FOO', // Unmapped action
        createdAt: '2026-02-24T12:00:00Z',
        actor: { displayName: 'Admin One' },
        targetType: 'user',
        targetId: 'user-123',
        metadata: { some: 'data' }
    },
    {
        id: '2',
        action: 'MEMBER_UPDATED', // Mapped action
        createdAt: '2026-02-24T13:00:00Z',
        actor: null, // System
        targetType: null,
        targetId: null,
        metadata: null
    }
]

describe('AuditLogsTab Component', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders loading state initially', () => {
        const mockSelect = vi.fn().mockReturnThis()
        const mockOrder = vi.fn().mockReturnThis()
        const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })

            ; (supabase.from as any).mockReturnValue({
                select: mockSelect,
                order: mockOrder,
                limit: mockLimit
            })

        // We can check if Loader2 is present (SVG)
        // Since we don't have text, maybe we check for 'Nenhum log registrado' not to be there yet
        const { container } = render(<AuditLogsTab />)
        expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders empty state when no logs are found', async () => {
        ; (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null })
        })

        render(<AuditLogsTab />)

        await waitFor(() => {
            expect(screen.getByText('Nenhum log registrado')).toBeInTheDocument()
        })
    })

    it('renders logs and formats mapped/unmapped actions correctly', async () => {
        ; (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: mockLogs, error: null })
        })

        render(<AuditLogsTab />)

        await waitFor(() => {
            expect(screen.getByText('CREATED_FOO')).toBeInTheDocument()
            expect(screen.getByText('Atualizou perfil do usuário')).toBeInTheDocument()
        })

        // Check actor display
        expect(screen.getByText('Admin One')).toBeInTheDocument()
        expect(screen.getByText('Sistema')).toBeInTheDocument()

        // Check target
        expect(screen.getByText('user: user')).toBeInTheDocument()

        // Metadata renders as JSON (stringify without spaces by default)
        expect(screen.getByText((content) => content.includes('"some":"data"'))).toBeInTheDocument()
    })
})

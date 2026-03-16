import { renderHook, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMatches } from './useMatches'
import { supabase } from '@/lib/supabase'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
    }
}))

describe('useMatches Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('filters by groupId if provided', async () => {
        const mockEq = vi.fn().mockResolvedValue({ data: [], error: null })
            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                eq: mockEq
            })

        renderHook(() => useMatches('group-123'))

        await waitFor(() => {
            expect(mockEq).toHaveBeenCalledWith('groupId', 'group-123')
        })
    })

    it('does not execute query if groupId is an empty string', async () => {
        const mockEq = vi.fn().mockReturnThis()
        const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })

            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                order: mockOrder,
                eq: mockEq
            })

        const { result } = renderHook(() => useMatches(''))

        // Espera rodar o hook, e verifica que não foi chamado (enabled: false evita a execução da query)
        await waitFor(() => {
            expect(result.current.loading).toBe(false) // em v5, query desativada começa com loading falso
        })
        expect(mockEq).not.toHaveBeenCalled()
    })

    it('does not filter by groupId if it is undefined', async () => {
        const mockEq = vi.fn().mockReturnThis()
        const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })

            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                order: mockOrder,
                eq: mockEq
            })

        renderHook(() => useMatches(undefined))

        await waitFor(() => {
            expect(mockEq).not.toHaveBeenCalled()
        })
    })
})

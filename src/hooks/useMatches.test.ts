import { renderHook, waitFor } from '@testing-library/react'
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

    it('filters by groupId even if it is an empty string', async () => {
        const mockEq = vi.fn().mockResolvedValue({ data: [], error: null })
            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                eq: mockEq
            })

        renderHook(() => useMatches(''))

        await waitFor(() => {
            expect(mockEq).toHaveBeenCalledWith('groupId', '')
        })
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

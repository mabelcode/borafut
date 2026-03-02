import { renderHook, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMatchEvaluations } from './useMatchEvaluations'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn()
    }
}))

describe('useMatchEvaluations Hook', () => {
    const matchId = 'match-123'
    const userId = 'user-1'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('initializes with default values', () => {
        const { result } = renderHook(() => useMatchEvaluations(matchId, userId))
        expect(result.current.loading).toBe(false)
        expect(result.current.submitting).toBe(false)
        expect(result.current.error).toBe(null)
        expect(result.current.ratingsMap).toEqual({})
        expect(result.current.hasEvaluated).toBe(false)
    })

    it('fetches my evaluations correctly', async () => {
        const mockData = [
            { evaluatedId: 'user-2', scoreGiven: 5 },
            { evaluatedId: 'user-3', scoreGiven: 4 }
        ]

        const mockEq2 = vi.fn().mockResolvedValue({ data: mockData, error: null })
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 })

        vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

        const { result } = renderHook(() => useMatchEvaluations(matchId, userId))

        await result.current.fetchMyEvaluations()

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
            expect(result.current.ratingsMap).toEqual({ 'user-2': 5, 'user-3': 4 })
            expect(result.current.hasEvaluated).toBe(true)
        })

        expect(supabase.from).toHaveBeenCalledWith('evaluations')
        expect(mockSelect).toHaveBeenCalledWith('*')
        expect(mockEq1).toHaveBeenCalledWith('matchId', matchId)
        expect(mockEq2).toHaveBeenCalledWith('evaluatorId', userId)
    })

    it('handles fetch error gracefully', async () => {
        const mockError = new Error('Database error')
        const mockEq2 = vi.fn().mockResolvedValue({ data: null, error: mockError })
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 })

        vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

        const { result } = renderHook(() => useMatchEvaluations(matchId, userId))

        await result.current.fetchMyEvaluations()

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
            expect(result.current.error).toBe('Database error')
        })
    })

    it('submits evaluations successfully', async () => {
        const evaluations = [{ evaluatedId: 'user-2', scoreGiven: 5 }]
        vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any)

        // Mock fetch behavior (refetch called after success)
        const mockEq2 = vi.fn().mockResolvedValue({ data: evaluations, error: null })
        const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 })
        vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

        const { result } = renderHook(() => useMatchEvaluations(matchId, userId))

        let success = false
        success = await result.current.submitEvaluations(evaluations)

        expect(success).toBe(true)
        expect(supabase.rpc).toHaveBeenCalledWith('submit_match_evaluations', {
            p_match_id: matchId,
            p_evaluations: evaluations
        })

        await waitFor(() => {
            expect(result.current.submitted).toBe(true)
        })
    })

    it('handles submission error', async () => {
        const evaluations = [{ evaluatedId: 'user-2', scoreGiven: 5 }]
        vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'Submission failed' } } as any)

        const { result } = renderHook(() => useMatchEvaluations(matchId, userId))

        let success = true
        success = await result.current.submitEvaluations(evaluations)

        expect(success).toBe(false)
        await waitFor(() => {
            expect(result.current.error).toBe('Submission failed')
            expect(result.current.submitting).toBe(false)
        })
    })
})

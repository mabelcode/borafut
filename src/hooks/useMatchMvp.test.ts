import { renderHook, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMatchMvp } from './useMatchMvp'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn()
    }
}))

describe('useMatchMvp Hook', () => {
    const matchId = 'match-123'
    const matchStatus = 'FINISHED'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches MVPs and maps data correctly', async () => {
        const mockMvpRows = [
            {
                userId: 'u1',
                avgScore: 4.8,
                user: { displayName: 'Marcos', mainPosition: 'ATTACK', avatarUrl: 'url1' }
            }
        ]

        const mockOrder = vi.fn().mockResolvedValue({ data: mockMvpRows, error: null })
        const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'match_mvps') {
                return { select: mockSelect } as any
            }
            // For other tables in this hook (evaluations)
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null })
                })
            } as any
        })

        const { result } = renderHook(() => useMatchMvp(matchId, matchStatus))

        await waitFor(() => {
            expect(result.current.mvps).toHaveLength(1)
            expect(result.current.mvps[0]).toEqual({
                userId: 'u1',
                avgScore: 4.8,
                displayName: 'Marcos',
                mainPosition: 'ATTACK',
                avatarUrl: 'url1'
            })
        })
    })

    it('calculates the unique evaluator count correctly', async () => {
        const mockEvaluations = [
            { evaluatorId: 'user-A' },
            { evaluatorId: 'user-B' },
            { evaluatorId: 'user-A' } // Duplicate
        ]

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'evaluations') {
                return {
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ data: mockEvaluations, error: null })
                    })
                } as any
            }
            return {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data: [], error: null })
                    })
                })
            } as any
        })

        const { result } = renderHook(() => useMatchMvp(matchId, matchStatus))

        await waitFor(() => {
            expect(result.current.evaluatorCount).toBe(2)
        })
    })

    it('successfully computes MVPs using RPC', async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: 1, error: null } as any)

        const { result } = renderHook(() => useMatchMvp(matchId, matchStatus))

        const count = await result.current.computeMvps()

        expect(count).toBe(1)
        expect(supabase.rpc).toHaveBeenCalledWith('compute_match_mvps', { p_match_id: matchId })
    })

    it('does not fetch if matchId is missing or status is not appropriate', () => {
        renderHook(() => useMatchMvp('', 'PENDING'))
        expect(supabase.from).not.toHaveBeenCalled()
    })
})

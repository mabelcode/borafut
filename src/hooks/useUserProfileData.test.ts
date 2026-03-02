import { renderHook, waitFor } from '@/test/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUserProfileData } from './useUserProfileData'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    }
}))

describe('useUserProfileData Hook', () => {
    const userId = 'user-123'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches groups and history and formats them correctly', async () => {
        const mockGroups = [
            {
                role: 'ADMIN',
                joinedAt: '2024-01-01T00:00:00Z',
                groups: { id: 'g1', name: 'Elite Futebol' }
            }
        ]

        const mockMatches = [
            {
                id: 'reg1',
                matches: {
                    id: 'm1',
                    title: 'Final da Copa',
                    scheduledAt: '2024-02-01T20:00:00Z',
                    groupId: 'g1',
                    status: 'FINISHED',
                    groups: { name: 'Elite Futebol' },
                    match_mvps: [
                        { users: { displayName: 'Marcos Admin', avatarUrl: 'avatar-url' } }
                    ]
                }
            }
        ]

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'group_members') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: mockGroups, error: null })
                } as any
            }
            if (table === 'match_registrations') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue({ data: mockMatches, error: null })
                } as any
            }
            return {
                select: vi.fn().mockResolvedValue({ data: [], error: null })
            } as any
        })

        const { result } = renderHook(() => useUserProfileData(userId))

        await waitFor(() => {
            expect(result.current.loading).toBe(false)
            expect(result.current.groups).toHaveLength(1)
            expect(result.current.groups[0]).toEqual({
                id: 'g1',
                name: 'Elite Futebol',
                role: 'ADMIN',
                joinedAt: '2024-01-01T00:00:00Z'
            })
            expect(result.current.history).toHaveLength(1)
            expect(result.current.history[0].title).toBe('Final da Copa')
            expect(result.current.history[0].mvps![0].displayName).toBe('Marcos Admin')
        })
    })

    it('handles leave group mutation correctly', async () => {
        const mockDelete = vi.fn().mockReturnThis()
        const mockEq1 = vi.fn().mockReturnThis()
        const mockEq2 = vi.fn().mockResolvedValue({ error: null })

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'group_members') {
                return { delete: mockDelete } as any
            }
            return { select: vi.fn().mockReturnThis() } as any
        })
        mockDelete.mockReturnValue({ eq: mockEq1 })
        mockEq1.mockReturnValue({ eq: mockEq2 })

        const { result } = renderHook(() => useUserProfileData(userId))

        const success = await result.current.leaveGroup('group-777')

        expect(success).toBe(true)
        expect(supabase.from).toHaveBeenCalledWith('group_members')
        expect(mockDelete).toHaveBeenCalled()
        expect(mockEq1).toHaveBeenCalledWith('groupId', 'group-777')
        expect(mockEq2).toHaveBeenCalledWith('userId', userId)
    })

    it('returns false if leave group fails', async () => {
        vi.mocked(supabase.from).mockReturnValue({
            delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: { message: 'Network error' } })
                })
            })
        } as any)

        const { result } = renderHook(() => useUserProfileData(userId))

        const success = await result.current.leaveGroup('group-any')
        expect(success).toBe(false)
    })
})

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useUserProfileData')

export interface ProfileGroup {
    id: string
    name: string
    role: string
    joinedAt: string
}

export interface ProfileMatch {
    id: string
    title: string | null
    scheduledAt: string
    groupId: string
    groupName: string
}

export function useUserProfileData(userId?: string) {
    const queryClient = useQueryClient()

    const { data, isLoading: loading, error: queryError, refetch: fetchData } = useQuery({
        queryKey: ['userProfile', userId],
        // Set enabled: !!userId so it doesn't fetch if no user is passed
        enabled: !!userId,
        queryFn: async () => {
            // 1. Fetch User Groups (where they are a member)
            const { data: groupData, error: groupErr } = await supabase
                .from('group_members')
                .select(`
                    role,
                    joinedAt,
                    groups (id, name)
                `)
                .eq('userId', userId)
                .order('joinedAt', { ascending: false })

            if (groupErr) throw groupErr

            // Type assertions because the join returns arrays/objects
            const formattedGroups: ProfileGroup[] = (groupData || [])
                .filter((gm: any) => gm.groups)
                .map((gm: any) => ({
                    id: gm.groups.id,
                    name: gm.groups.name,
                    role: gm.role,
                    joinedAt: gm.joinedAt
                }))

            // 2. Fetch Match History (Registrations where status === 'CONFIRMED')
            // Limited to the last 10 for the profile page
            const { data: matchData, error: matchErr } = await supabase
                .from('match_registrations')
                .select(`
                    id,
                    matches!inner(id, title, scheduledAt, groupId, status, groups(name))
                `)
                .eq('userId', userId)
                .eq('status', 'CONFIRMED')
                .order('matches(scheduledAt)', { ascending: false })
                .limit(10)

            if (matchErr) throw matchErr

            const formattedHistory: ProfileMatch[] = (matchData || [])
                .map((reg: any) => ({
                    id: reg.matches?.id ?? '',
                    title: reg.matches?.title ?? null,
                    scheduledAt: reg.matches?.scheduledAt ?? '',
                    groupId: reg.matches?.groupId ?? '',
                    groupName: reg.matches?.groups?.name ?? 'Unknown Group'
                }))

            return { groups: formattedGroups, history: formattedHistory }
        }
    })

    const groups = data?.groups ?? []
    const history = data?.history ?? []
    const error = queryError ? queryError.message : null

    const leaveGroupMutation = useMutation({
        mutationFn: async (groupId: string) => {
            if (!userId) throw new Error('No userId provided')
            const { error: err } = await supabase
                .from('group_members')
                .delete()
                .eq('groupId', groupId)
                .eq('userId', userId)

            if (err) throw err
            return groupId
        },
        onSuccess: (groupId) => {
            logger.info('User left group', { groupId, userId })
            queryClient.setQueryData(['userProfile', userId], (oldData: any) => {
                if (!oldData) return oldData
                return {
                    ...oldData,
                    groups: oldData.groups.filter((g: any) => g.id !== groupId)
                }
            })
            // We also invalidate currentUser to reflect the left group in Admin access right away
            queryClient.invalidateQueries({ queryKey: ['currentUser'] })
        },
        onError: (err: any, groupId) => {
            logger.error('Error leaving group', { groupId, error: err })
        }
    })

    const leaveGroup = async (groupId: string) => {
        try {
            await leaveGroupMutation.mutateAsync(groupId)
            return true
        } catch {
            return false
        }
    }

    return {
        groups,
        history,
        loading,
        error,
        fetchData,
        leaveGroup
    }
}

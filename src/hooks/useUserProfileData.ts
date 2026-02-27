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

interface GroupMemberRow {
    role: string
    joinedAt: string
    groups: { id: string; name: string } | null
}

interface MatchRegistrationRow {
    id: string
    matches: {
        id: string
        title: string | null
        scheduledAt: string
        groupId: string
        status: string
        groups: { name: string } | null
    } | null
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
                .filter((gm: unknown) => (gm as GroupMemberRow).groups !== null)
                .map((gm: unknown) => {
                    const row = gm as GroupMemberRow
                    return {
                        id: row.groups!.id,
                        name: row.groups!.name,
                        role: row.role,
                        joinedAt: row.joinedAt
                    }
                })

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
                .map((reg: unknown) => {
                    const row = reg as MatchRegistrationRow
                    return {
                        id: row.matches?.id ?? '',
                        title: row.matches?.title ?? null,
                        scheduledAt: row.matches?.scheduledAt ?? '',
                        groupId: row.matches?.groupId ?? '',
                        groupName: row.matches?.groups?.name ?? 'Unknown Group'
                    }
                })

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
            queryClient.setQueryData<{ groups: ProfileGroup[]; history: ProfileMatch[] }>(['userProfile', userId], (oldData) => {
                if (!oldData) return oldData
                return {
                    ...oldData,
                    groups: oldData.groups.filter((g) => g.id !== groupId)
                }
            })
            // We also invalidate currentUser to reflect the left group in Admin access right away
            queryClient.invalidateQueries({ queryKey: ['currentUser'] })
        },
        onError: (err: Error, groupId) => {
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

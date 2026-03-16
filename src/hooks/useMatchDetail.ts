import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Registration {
    id: string
    userId: string
    status: 'RESERVED' | 'CONFIRMED' | 'WAITLIST'
    teamNumber: number | null
    subscriptionType: 'MENSALISTA' | 'AVULSO'
    users: {
        displayName: string | null
        mainPosition: string | null
        globalScore: number
        avatarUrl: string | null
    } | null
}

export interface MatchDetailData {
    id: string
    groupId: string
    title: string | null
    scheduledAt: string
    maxPlayers: number
    price: number
    status: 'OPEN' | 'CLOSED' | 'FINISHED'
    managerId: string
    confirmationDeadlineHours: number
    createdAt: string
    registrations: Registration[]
    myRegistration: Registration | null
    group: {
        name: string
        inviteToken: string
        inviteExpiresAt: string | null
    }
}

export function useMatchDetail(matchId: string) {
    const { data, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: ['matchDetail', matchId],
        enabled: !!matchId,
        queryFn: async () => {
            const response = await supabase.auth.getUser()
            if (response.error) throw response.error
            const authUser = response.data.user
            if (!authUser) throw new Error('User not authenticated')

            const [matchRes, regRes] = await Promise.all([
                supabase.from('matches').select('*, groups(name, inviteToken, inviteExpiresAt)').eq('id', matchId).single(),
                supabase
                    .from('match_registrations')
                    .select('id, userId, status, teamNumber, users(displayName, mainPosition, globalScore, avatarUrl)')
                    .eq('matchId', matchId)
                    .in('status', ['RESERVED', 'CONFIRMED', 'WAITLIST'])
                    .order('createdAt', { ascending: true }),
            ])

            if (matchRes.error) throw new Error(matchRes.error.message)
            if (regRes.error) throw new Error(regRes.error.message)

            // Fetch subscription types for all registered users in this group
            const groupId = matchRes.data.groupId
            const userIds = (regRes.data ?? []).map((r: any) => r.userId).filter(Boolean)
            const subscriptionMap: Record<string, string> = {}
            if (userIds.length > 0) {
                const { data: membersData } = await supabase
                    .from('group_members')
                    .select('userId, subscriptionType')
                    .eq('groupId', groupId)
                    .in('userId', userIds)
                for (const m of membersData ?? []) {
                    subscriptionMap[(m as any).userId] = (m as any).subscriptionType ?? 'AVULSO'
                }
            }

            const registrations = ((regRes.data ?? []) as unknown as Registration[]).map(r => ({
                ...r,
                subscriptionType: (subscriptionMap[r.userId] ?? 'AVULSO') as 'MENSALISTA' | 'AVULSO',
            }))
            const myRegistration = registrations.find(r => r.userId === authUser.id) ?? null

            const { groups, ...matchData } = matchRes.data;
            return {
                ...matchData,
                registrations,
                myRegistration,
                group: groups
            } as MatchDetailData
        }
    })

    const error = queryError ? queryError.message : null

    return { data: data ?? null, loading, error, refetch }
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Registration {
    id: string
    userId: string
    status: 'RESERVED' | 'CONFIRMED' | 'WAITLIST'
    teamNumber: number | null
    users: {
        displayName: string | null
        mainPosition: string | null
        globalScore: number
    } | null
}

export interface MatchDetailData {
    id: string
    title: string | null
    scheduledAt: string
    maxPlayers: number
    price: number
    status: 'OPEN' | 'CLOSED' | 'FINISHED'
    managerId: string
    registrations: Registration[]
    myRegistration: Registration | null
}

export function useMatchDetail(matchId: string) {
    const { data, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: ['matchDetail', matchId],
        enabled: !!matchId,
        queryFn: async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) throw new Error('User not authenticated')

            const [matchRes, regRes] = await Promise.all([
                supabase.from('matches').select('*').eq('id', matchId).single(),
                supabase
                    .from('match_registrations')
                    .select('id, userId, status, teamNumber, users(displayName, mainPosition, globalScore)')
                    .eq('matchId', matchId)
                    .in('status', ['RESERVED', 'CONFIRMED', 'WAITLIST'])
                    .order('createdAt', { ascending: true }),
            ])

            if (matchRes.error) throw new Error(matchRes.error.message)
            if (regRes.error) throw new Error(regRes.error.message)

            const registrations = (regRes.data ?? []) as unknown as Registration[]
            const myRegistration = registrations.find(r => r.userId === authUser.id) ?? null

            return { ...matchRes.data, registrations, myRegistration } as MatchDetailData
        }
    })

    const error = queryError ? queryError.message : null

    return { data: data ?? null, loading, error, refetch }
}

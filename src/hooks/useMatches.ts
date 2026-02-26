import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Match {
    id: string
    groupId: string
    title: string | null
    scheduledAt: string
    maxPlayers: number
    price: number
    status: 'OPEN' | 'CLOSED' | 'FINISHED'
    managerId: string
    createdAt: string
}

export function useMatches(groupId?: string) {
    const { data: matches, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: ['matches', groupId],
        queryFn: async () => {
            let query = supabase
                .from('matches')
                .select('*')
                .order('scheduledAt', { ascending: true })

            if (groupId !== undefined) {
                query = query.eq('groupId', groupId)
            }

            const { data, error } = await query
            if (error) throw error
            return data as Match[]
        }
    })

    const error = queryError ? queryError.message : null

    return { matches: matches ?? [], loading, error, refetch }
}

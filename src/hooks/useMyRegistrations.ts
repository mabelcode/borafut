import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Map of matchId → user's registration status in that match */
export type MyRegistrationsMap = Record<string, 'RESERVED' | 'CONFIRMED' | 'WAITLIST'>

export function useMyRegistrations() {
    const { data: queryData, isLoading: loading, error: queryError } = useQuery({
        queryKey: ['myRegistrations'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return {}

            const { data: rows, error } = await supabase
                .from('match_registrations')
                .select('matchId, status')
                .eq('userId', user.id)

            if (error) throw new Error(error.message)

            const map: MyRegistrationsMap = {}
            for (const row of rows ?? []) map[row.matchId] = row.status
            return map
        }
    })

    const data = queryData ?? {}
    const error = queryError ? queryError.message : null

    return { data, loading, error }
}

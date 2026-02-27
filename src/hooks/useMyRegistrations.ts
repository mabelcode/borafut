import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/hooks/useCurrentUser'

/** Map of matchId → user's registration status in that match */
export type MyRegistrationsMap = Record<string, 'RESERVED' | 'CONFIRMED' | 'WAITLIST'>

export function useMyRegistrations() {
    const { authUser } = useCurrentUser()
    const userId = authUser?.id

    const { data: queryData, isLoading: loading, error: queryError } = useQuery({
        queryKey: ['myRegistrations', userId],
        enabled: !!userId,
        queryFn: async () => {
            if (!userId) return {}

            const { data: rows, error } = await supabase
                .from('match_registrations')
                .select('matchId, status')
                .eq('userId', userId)

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

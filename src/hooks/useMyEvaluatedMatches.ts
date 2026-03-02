import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/hooks/useCurrentUser'

/**
 * Hook to fetch all match IDs where the current user has submitted at least one evaluation.
 * Returns a Set of matchIds for O(1) lookups.
 */
export function useMyEvaluatedMatches() {
    const { authUser } = useCurrentUser()
    const userId = authUser?.id

    const { data: evaluatedMatchIds, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: ['myEvaluatedMatches', userId],
        // Only fetch if we have a user
        enabled: !!userId,
        queryFn: async () => {
            if (!userId) return new Set<string>()

            // We only need the distinct matchIds where this user was the evaluator.
            const { data, error } = await supabase
                .from('evaluations')
                .select('matchId')
                .eq('evaluatorId', userId)

            if (error) throw new Error(error.message)

            const matchIds = new Set<string>()
            for (const row of data || []) {
                matchIds.add(row.matchId)
            }
            return matchIds
        }
    })

    const error = queryError ? queryError.message : null

    return {
        evaluatedMatchIds: evaluatedMatchIds ?? new Set<string>(),
        loading,
        error,
        refetch
    }
}

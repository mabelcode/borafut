import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useMatchMvp')

export interface MvpPlayer {
    userId: string
    avgScore: number
    displayName: string | null
    mainPosition: string | null
    avatarUrl: string | null
}

interface MvpRow {
    userId: string
    avgScore: number
    user: {
        displayName: string | null
        mainPosition: string | null
        avatarUrl: string | null
    } | null
}

export function useMatchMvp(matchId: string, matchStatus?: string) {
    const queryClient = useQueryClient()
    const enabled = !!matchId && (matchStatus === 'CLOSED' || matchStatus === 'FINISHED')

    const { data: mvps, isLoading: loading } = useQuery({
        queryKey: ['matchMvps', matchId],
        enabled,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('match_mvps')
                .select('userId, avgScore, user:users(displayName, mainPosition, avatarUrl)')
                .eq('matchId', matchId)
                .order('avgScore', { ascending: false })

            if (error) throw new Error(error.message)

            return ((data ?? []) as unknown as MvpRow[]).map(row => ({
                userId: row.userId,
                avgScore: row.avgScore,
                displayName: row.user?.displayName ?? 'Jogador',
                mainPosition: row.user?.mainPosition ?? null,
                avatarUrl: row.user?.avatarUrl ?? null,
            })) as MvpPlayer[]
        },
    })

    // Count distinct evaluators for this match
    const { data: evaluatorCount } = useQuery({
        queryKey: ['matchEvaluatorCount', matchId],
        enabled,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('evaluations')
                .select('evaluatorId')
                .eq('matchId', matchId)

            if (error) throw new Error(error.message)

            const uniqueEvaluators = new Set((data ?? []).map(e => (e as { evaluatorId: string }).evaluatorId))
            return uniqueEvaluators.size
        },
    })

    const computeMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('compute_match_mvps', { p_match_id: matchId })
            if (error) throw new Error(error.message)
            return (data as number) ?? 0
        },
        onSuccess: (count) => {
            logger.info('MVPs computed for match', { matchId, count })
            queryClient.invalidateQueries({ queryKey: ['matchMvps', matchId] })
        },
        onError: (err) => {
            logger.error('Error computing MVPs', err)
        },
    })

    return {
        mvps: mvps ?? [],
        loading,
        computeMvps: computeMutation.mutateAsync,
        isComputing: computeMutation.isPending,
        evaluatorCount: evaluatorCount ?? 0,
    }
}

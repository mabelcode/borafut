import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useMatchEvaluations')

export interface EvaluationInput {
    evaluatedId: string
    scoreGiven: number
}

export interface ExistingEvaluation {
    id: string
    matchId: string
    evaluatorId: string
    evaluatedId: string
    scoreGiven: number
    createdAt: string
}

/**
 * Hook for managing match evaluations.
 * Returns evaluations as a map (evaluatedId -> scoreGiven) for easy consumption.
 */
export function useMatchEvaluations(matchId: string, userId: string) {
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [ratingsMap, setRatingsMap] = useState<Record<string, number>>({})
    const [submitted, setSubmitted] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)

    const fetchMyEvaluations = useCallback(async () => {
        if (!userId) return

        try {
            setLoading(true)
            setError(null)

            const { data, error: err } = await supabase
                .from('evaluations')
                .select('*')
                .eq('matchId', matchId)
                .eq('evaluatorId', userId)

            if (err) throw err

            // Build a map of evaluatedId -> scoreGiven
            const map: Record<string, number> = {}
            for (const ev of (data || []) as ExistingEvaluation[]) {
                map[ev.evaluatedId] = ev.scoreGiven
            }
            setRatingsMap(map)
            setHasFetched(true)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar avaliações.'
            logger.error('Erro ao buscar avaliações da partida', { error: err })
            setError(message)
        } finally {
            setLoading(false)
        }
    }, [matchId, userId])

    const submitEvaluations = async (evaluationsData: EvaluationInput[]) => {
        try {
            setSubmitting(true)
            setError(null)

            const { error: err } = await supabase.rpc('submit_match_evaluations', {
                p_match_id: matchId,
                p_evaluations: evaluationsData
            })

            if (err) {
                throw new Error(err.message || 'Erro ao enviar avaliações.')
            }

            logger.info('Avaliações enviadas com sucesso', { matchId, count: evaluationsData.length })
            setSubmitted(true)
            await fetchMyEvaluations()
            return true
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao enviar avaliações.'
            logger.error('Erro ao enviar avaliações', { error: err })
            setError(message)
            return false
        } finally {
            setSubmitting(false)
        }
    }

    return {
        /** Map of evaluatedId -> scoreGiven (from server) */
        ratingsMap,
        /** Whether the user has previously submitted evaluations for this match */
        hasEvaluated: hasFetched && Object.keys(ratingsMap).length > 0,
        loading,
        submitting,
        submitted,
        error,
        fetchMyEvaluations,
        submitEvaluations,
    }
}

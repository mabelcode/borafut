import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/react'

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

export function useMatches() {
    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function fetchMatches() {
        setLoading(true)
        setError(null)

        try {
            // RLS automatically filters to the user's groups — no extra filter needed
            const { data, error } = await supabase
                .from('matches')
                .select('*')
                .order('scheduledAt', { ascending: true })

            if (error) throw error
            setMatches(data ?? [])
        } catch (err: any) {
            const msg = err.message || 'Erro desconhecido ao buscar partidas'
            logger.error('Erro ao buscar partidas', err)
            setError(msg)
            Sentry.captureException(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchMatches() }, [])

    return { matches, loading, error, refetch: fetchMatches }
}

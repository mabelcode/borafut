import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

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
    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function fetchMatches() {
        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('matches')
                .select('*')
                .order('scheduledAt', { ascending: true })

            if (groupId !== undefined) {
                query = query.eq('groupId', groupId)
            }

            const { data, error } = await query

            if (error) throw error
            setMatches(data ?? [])
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro desconhecido ao buscar partidas'
            logger.error('Erro ao buscar partidas', err)
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchMatches() }, [groupId])

    return { matches, loading, error, refetch: fetchMatches }
}

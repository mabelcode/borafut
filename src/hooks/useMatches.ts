import { useEffect, useState } from 'react'
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

export function useMatches() {
    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function fetchMatches() {
        setLoading(true)
        // RLS automatically filters to the user's groups — no extra filter needed
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .order('scheduledAt', { ascending: true })

        if (error) {
            setError(error.message)
        } else {
            setMatches(data ?? [])
        }
        setLoading(false)
    }

    useEffect(() => { fetchMatches() }, [])

    return { matches, loading, error, refetch: fetchMatches }
}

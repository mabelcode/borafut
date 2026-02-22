import { useEffect, useState } from 'react'
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
    const [data, setData] = useState<MatchDetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function fetch() {
        setLoading(true)
        setError(null)

        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { setLoading(false); return }

        const [matchRes, regRes] = await Promise.all([
            supabase.from('matches').select('*').eq('id', matchId).single(),
            supabase
                .from('match_registrations')
                .select('id, userId, status, teamNumber, users(displayName, mainPosition, globalScore)')
                .eq('matchId', matchId)
                .in('status', ['RESERVED', 'CONFIRMED', 'WAITLIST'])
                .order('createdAt', { ascending: true }),
        ])

        if (matchRes.error) { setError(matchRes.error.message); setLoading(false); return }

        const registrations = (regRes.data ?? []) as unknown as Registration[]
        const myRegistration = registrations.find(r => r.userId === authUser.id) ?? null

        setData({ ...matchRes.data, registrations, myRegistration })
        setLoading(false)
    }

    useEffect(() => { fetch() }, [matchId])

    return { data, loading, error, refetch: fetch }
}

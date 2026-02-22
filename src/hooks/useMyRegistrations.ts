import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/** Map of matchId → user's registration status in that match */
export type MyRegistrationsMap = Record<string, 'RESERVED' | 'CONFIRMED' | 'WAITLIST'>

export function useMyRegistrations() {
    const [data, setData] = useState<MyRegistrationsMap>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { setLoading(false); return }

            const { data: rows } = await supabase
                .from('match_registrations')
                .select('matchId, status')
                .eq('userId', user.id)

            const map: MyRegistrationsMap = {}
            for (const row of rows ?? []) map[row.matchId] = row.status
            setData(map)
            setLoading(false)
        })
    }, [])

    return { data, loading }
}

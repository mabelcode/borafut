import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/react'

/** Map of matchId → user's registration status in that match */
export type MyRegistrationsMap = Record<string, 'RESERVED' | 'CONFIRMED' | 'WAITLIST'>

export function useMyRegistrations() {
    const [data, setData] = useState<MyRegistrationsMap>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        async function fetchRegistrations() {
            try {
                setLoading(true)
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: rows, error } = await supabase
                    .from('match_registrations')
                    .select('matchId, status')
                    .eq('userId', user.id)

                if (error) throw error

                if (isMounted) {
                    const map: MyRegistrationsMap = {}
                    for (const row of rows ?? []) map[row.matchId] = row.status
                    setData(map)
                }
            } catch (err: any) {
                logger.error('Erro ao buscar reservas do usuário', err)
                Sentry.captureException(err)
                if (isMounted) setError(err.message)
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchRegistrations()
        return () => { isMounted = false }
    }, [])

    return { data, loading, error }
}

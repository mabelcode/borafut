import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
    id: string
    phoneNumber: string | null
    displayName: string | null
    mainPosition: 'GOALKEEPER' | 'DEFENSE' | 'ATTACK' | null
    globalScore: number
    isAdmin: boolean
    createdAt: string
}

export function useCurrentUser() {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
            if (!authUser) { setLoading(false); return }

            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single()

            setUser(data ?? null)
            setLoading(false)
        })
    }, [])

    return { user, loading }
}

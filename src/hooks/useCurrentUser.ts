import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
    id: string
    phoneNumber: string | null
    displayName: string | null
    mainPosition: 'GOALKEEPER' | 'DEFENSE' | 'ATTACK' | null
    globalScore: number
    isSuperAdmin: boolean
    pixKey: string | null
    createdAt: string
}

export interface GroupMembership {
    groupId: string
    groupName: string
    role: 'ADMIN' | 'PLAYER'
    inviteToken: string
    inviteExpiresAt: string | null
}

export function useCurrentUser() {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [groups, setGroups] = useState<GroupMembership[]>([])
    const [loading, setLoading] = useState(true)

    async function fetchUser() {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { setLoading(false); return }

        const [profileRes, membershipsRes] = await Promise.all([
            supabase.from('users').select('*').eq('id', authUser.id).single(),
            supabase
                .from('group_members')
                .select('role, groupId, groups(id, name, inviteToken, inviteExpiresAt)')
                .eq('userId', authUser.id),
        ])

        setUser(profileRes.data ?? null)

        const memberships: GroupMembership[] = (membershipsRes.data ?? []).map((m: any) => ({
            groupId: m.groups.id,
            groupName: m.groups.name,
            role: m.role,
            inviteToken: m.groups.inviteToken,
            inviteExpiresAt: m.groups.inviteExpiresAt,
        }))
        setGroups(memberships)
        setLoading(false)
    }

    useEffect(() => { fetchUser() }, [])

    // Derived helpers
    const isAdminInAnyGroup = user?.isSuperAdmin || groups.some(g => g.role === 'ADMIN')
    const adminGroups = user?.isSuperAdmin ? groups : groups.filter(g => g.role === 'ADMIN')

    return { user, groups, loading, isAdminInAnyGroup, adminGroups, refetch: fetchUser }
}

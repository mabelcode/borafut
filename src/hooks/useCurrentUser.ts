import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useCurrentUser')

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
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) { setLoading(false); return }

            const [profileRes, membershipsRes] = await Promise.all([
                supabase.from('users').select('*').eq('id', authUser.id).maybeSingle(),
                supabase
                    .from('group_members')
                    .select('role, groupId, groups(id, name, inviteToken, inviteExpiresAt)')
                    .eq('userId', authUser.id),
            ])

            if (profileRes.error) logger.error('Erro ao buscar perfil do usuário', profileRes.error)
            if (membershipsRes.error) logger.error('Erro ao buscar memberships', membershipsRes.error)

            setUser(profileRes.data ?? null)

            const rawMemberships = (membershipsRes.data ?? []) as unknown as {
                role: 'ADMIN' | 'PLAYER'
                groups: {
                    id: string
                    name: string
                    inviteToken: string
                    inviteExpiresAt: string | null
                }
            }[]

            const memberships: GroupMembership[] = rawMemberships.map(m => ({
                groupId: m.groups.id,
                groupName: m.groups.name,
                role: m.role,
                inviteToken: m.groups.inviteToken,
                inviteExpiresAt: m.groups.inviteExpiresAt,
            }))
            setGroups(memberships)
        } catch (err) {
            logger.error('Erro inesperado ao buscar dados do usuário', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchUser() }, [])

    async function updateProfile(updates: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'isSuperAdmin'>>) {
        if (!user) return false
        try {
            const { error: err } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id)

            if (err) throw err
            setUser({ ...user, ...updates })
            logger.info('User profile updated successfully')
            return true
        } catch (err: any) {
            logger.error('Error updating user profile', err)
            return false
        }
    }

    // Derived helpers
    const isAdminInAnyGroup = user?.isSuperAdmin || groups.some(g => g.role === 'ADMIN')
    const adminGroups = user?.isSuperAdmin ? groups : groups.filter(g => g.role === 'ADMIN')

    return { user, groups, loading, isAdminInAnyGroup, adminGroups, refetch: fetchUser, updateProfile }
}

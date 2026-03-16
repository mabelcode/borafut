import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
    avatarUrl: string | null
    createdAt: string
}

export interface GroupMembership {
    groupId: string
    groupName: string
    role: 'ADMIN' | 'PLAYER'
    subscriptionType: 'MENSALISTA' | 'AVULSO'
    inviteToken: string
    inviteExpiresAt: string | null
}

export interface CurrentUserQueryData {
    user: UserProfile | null
    groups: GroupMembership[]
    authUser: import('@supabase/supabase-js').User | null
}

export function useCurrentUser() {
    const queryClient = useQueryClient()

    const { data, isLoading: loading, refetch } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) return { user: null, groups: [], authUser: null }

            const profileRes = await supabase.from('users').select('*').eq('id', authUser.id).maybeSingle()
            if (profileRes.error) throw profileRes.error
            const userProfile = profileRes.data as UserProfile | null

            let memberships: GroupMembership[] = []

            if (userProfile?.isSuperAdmin) {
                const groupsRes = await supabase.from('groups').select('id, name, inviteToken, inviteExpiresAt')
                if (groupsRes.error) throw groupsRes.error
                memberships = (groupsRes.data || []).map(g => ({
                    groupId: g.id,
                    groupName: g.name,
                    role: 'ADMIN',
                    subscriptionType: 'AVULSO',
                    inviteToken: g.inviteToken,
                    inviteExpiresAt: g.inviteExpiresAt,
                }))
            } else {
                const membershipsRes = await supabase
                    .from('group_members')
                    .select('role, subscriptionType, groups(id, name, inviteToken, inviteExpiresAt)')
                    .eq('userId', authUser.id)

                if (membershipsRes.error) throw membershipsRes.error

                const rawMemberships = (membershipsRes.data ?? []) as unknown as {
                    role: 'ADMIN' | 'PLAYER'
                    subscriptionType: 'MENSALISTA' | 'AVULSO' | null
                    groups: {
                        id: string
                        name: string
                        inviteToken: string
                        inviteExpiresAt: string | null
                    } | null
                }[]

                memberships = rawMemberships
                    .filter(m => m.groups !== null)
                    .map(m => ({
                        groupId: m.groups!.id,
                        groupName: m.groups!.name,
                        role: m.role,
                        subscriptionType: m.subscriptionType ?? 'AVULSO',
                        inviteToken: m.groups!.inviteToken,
                        inviteExpiresAt: m.groups!.inviteExpiresAt,
                    }))
            }

            return {
                user: (profileRes.data ?? null) as UserProfile | null,
                groups: memberships,
                authUser,
            }
        },
    })

    const user = data?.user ?? null
    const groups = data?.groups ?? []
    const authUser = data?.authUser ?? null

    // Sync avatarUrl from Google OAuth if it changed (runs once per change)
    const lastSyncedAvatarRef = useRef<string | null>(null)
    const authAvatarUrl = (authUser?.user_metadata as { avatar_url?: string } | null)?.avatar_url ?? null
    const needsSync = !!user && !!authAvatarUrl && user.avatarUrl !== authAvatarUrl

    useEffect(() => {
        if (!needsSync || lastSyncedAvatarRef.current === authAvatarUrl) return
        lastSyncedAvatarRef.current = authAvatarUrl

        const updateAvatar = async () => {
            try {
                const { error } = await supabase.from('users').update({ avatarUrl: authAvatarUrl }).eq('id', user!.id)
                if (error) throw error
                queryClient.setQueryData<CurrentUserQueryData>(['currentUser'], (old) => {
                    if (!old?.user) return old
                    return { ...old, user: { ...old.user, avatarUrl: authAvatarUrl } }
                })
            } catch (err) {
                logger.error('Error syncing avatar on auth', err)
                lastSyncedAvatarRef.current = null // allow retry on next attempt
            }
        }
        updateAvatar()
    }, [needsSync, authAvatarUrl, user, queryClient])

    const updateProfileMutation = useMutation({
        mutationFn: async (updates: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'isSuperAdmin'>>) => {
            if (!user) throw new Error('No user data')
            const { error: err } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id)

            if (err) throw err
            return updates
        },
        onSuccess: (updates) => {
            logger.info('User profile updated successfully')
            queryClient.setQueryData<CurrentUserQueryData>(['currentUser'], (oldData) => {
                if (!oldData || !oldData.user) return oldData
                return {
                    ...oldData,
                    user: { ...oldData.user, ...updates }
                }
            })
        },
        onError: (err) => {
            logger.error('Error updating user profile', err)
        }
    })

    const updateProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'isSuperAdmin'>>) => {
        try {
            await updateProfileMutation.mutateAsync(updates)
            return true
        } catch {
            return false
        }
    }

    // Derived helpers
    const isAdminInAnyGroup = user?.isSuperAdmin || groups.some(g => g.role === 'ADMIN')
    const adminGroups = user?.isSuperAdmin ? groups : groups.filter(g => g.role === 'ADMIN')

    return { user, groups, authUser, loading, isAdminInAnyGroup, adminGroups, refetch, updateProfile }
}

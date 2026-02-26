import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useUserProfileData')

export interface ProfileGroup {
    id: string
    name: string
    role: string
    joinedAt: string
}

export interface ProfileMatch {
    id: string
    title: string | null
    scheduledAt: string
    groupId: string
    groupName: string
}

export function useUserProfileData(userId?: string) {
    const [groups, setGroups] = useState<ProfileGroup[]>([])
    const [history, setHistory] = useState<ProfileMatch[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        if (!userId) {
            setLoading(false)
            return
        }
        setLoading(true)
        setError(null)
        try {
            // 1. Fetch User Groups (where they are a member)
            const { data: groupData, error: groupErr } = await supabase
                .from('group_members')
                .select(`
                    role,
                    joinedAt,
                    groups (id, name)
                `)
                .eq('userId', userId)
                .order('joinedAt', { ascending: false })

            if (groupErr) throw groupErr

            // Type assertions because the join returns arrays/objects
            const formattedGroups: ProfileGroup[] = (groupData || []).map((gm: any) => ({
                id: gm.groups.id,
                name: gm.groups.name,
                role: gm.role,
                joinedAt: gm.joinedAt
            }))

            setGroups(formattedGroups)

            // 2. Fetch Match History (Registrations where status === 'CONFIRMED')
            // Limited to the last 10 for the profile page
            const { data: matchData, error: matchErr } = await supabase
                .from('match_registrations')
                .select(`
                    id,
                    matches!inner(id, title, scheduledAt, groupId, status, groups(name))
                `)
                .eq('userId', userId)
                .eq('status', 'CONFIRMED')
                .order('matches(scheduledAt)', { ascending: false })
                .limit(10)

            if (matchErr) throw matchErr

            const formattedHistory: ProfileMatch[] = (matchData || []).map((reg: any) => ({
                id: reg.matches.id,
                title: reg.matches.title,
                scheduledAt: reg.matches.scheduledAt,
                groupId: reg.matches.groupId,
                groupName: reg.matches.groups.name
            }))

            setHistory(formattedHistory)

        } catch (err: any) {
            logger.error('Error fetching user profile data', err)
            setError(err.message || 'Erro ao carregar os dados do perfil')
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const leaveGroup = useCallback(async (groupId: string) => {
        if (!userId) return false
        try {
            const { error: err } = await supabase
                .from('group_members')
                .delete()
                .eq('groupId', groupId)
                .eq('userId', userId)

            if (err) throw err
            setGroups(prev => prev.filter(g => g.id !== groupId))
            logger.info('User left group', { groupId, userId })

            // Optional: Also remove from match history for that group if required, 
            // but usually history is kept. We'll leave history intact for now.
            return true
        } catch (err: any) {
            logger.error('Error leaving group', { groupId, error: err })
            setError(err.message || 'Erro ao sair do grupo')
            return false
        }
    }, [userId])

    return {
        groups,
        history,
        loading,
        error,
        fetchData,
        leaveGroup
    }
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Shield, Star, Calendar, Loader2, Save, Trash2, Hash, Smartphone, MapPin, Inbox, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface Props {
    userId: string
    onBack: () => void
    governanceLevel?: 'SYSTEM' | 'VIEW'
}

interface UserProfile {
    id: string
    displayName: string | null
    phoneNumber: string | null
    globalScore: number
    mainPosition: string | null
    isSuperAdmin: boolean
    createdAt: string
}

interface GroupMembership {
    id: string
    groupId: string
    role: 'ADMIN' | 'PLAYER'
    joinedAt: string
    group: {
        name: string
    }
}

const POSITIONS = [
    { value: 'GOALKEEPER', label: 'GOLEIRO' },
    { value: 'DEFENSE', label: 'DEFENSOR' },
    { value: 'ATTACK', label: 'ATACANTE' }
]

export default function UserDetailsView({ userId, onBack, governanceLevel = 'VIEW' }: Props) {
    const queryClient = useQueryClient()
    const [membershipToRemove, setMembershipToRemove] = useState<GroupMembership | null>(null)

    // Form states
    const [localScore, setLocalScore] = useState<string | null>(null)
    const [localPosition, setLocalPosition] = useState<string | null>(null)

    const { data: userData, isLoading: loading } = useQuery({
        queryKey: ['adminUserDetails', userId],
        queryFn: async () => {
            const [profileRes, groupsRes] = await Promise.all([
                supabase.from('users').select('*').eq('id', userId).single(),
                supabase.from('group_members').select('*, group:groups(name)').eq('userId', userId)
            ])

            if (profileRes.error) throw profileRes.error
            if (groupsRes.error) throw groupsRes.error

            return {
                user: profileRes.data as UserProfile,
                memberships: (groupsRes.data || []) as GroupMembership[]
            }
        }
    })

    const user = userData?.user ?? null
    const memberships = userData?.memberships ?? []

    const score = localScore !== null ? localScore : (user?.globalScore?.toString() ?? '')
    const position = localPosition !== null ? localPosition : (user?.mainPosition ?? '')

    const hasChanges = user && (
        parseFloat(score) !== user.globalScore ||
        (position || null) !== user.mainPosition
    )

    const updateProfileMutation = useMutation({
        mutationFn: async ({ newScore, newPosition }: { newScore: number, newPosition: string | null }) => {
            const { error } = await supabase.rpc('admin_update_user_profile', {
                p_user_id: userId,
                p_global_score: newScore,
                p_main_position: newPosition
            })

            if (error) throw error
            return { newScore, newPosition }
        },
        onSuccess: ({ newScore, newPosition }) => {
            setLocalScore(null)
            setLocalPosition(null)
            queryClient.invalidateQueries({ queryKey: ['adminUserDetails', userId] })
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
            logger.info('Perfil atualizado com sucesso via RPC', { userId, score: newScore, position: newPosition })
        },
        onError: (err) => logger.error('Erro ao atualizar perfil', err)
    })

    async function handleUpdateProfile() {
        if (!user || updateProfileMutation.isPending || !hasChanges) return
        const newScore = parseFloat(score) || 0
        updateProfileMutation.mutate({ newScore, newPosition: position || null })
    }

    const removeGroupMutation = useMutation({
        mutationFn: async ({ membershipId }: { membershipId: string, groupId: string }) => {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('id', membershipId)

            if (error) throw error
            return membershipId
        },
        onSuccess: (_, { groupId }) => {
            queryClient.invalidateQueries({ queryKey: ['adminUserDetails', userId] })
            setMembershipToRemove(null)
            logger.info('Usuário removido do grupo', { userId, groupId })
        },
        onError: (err) => logger.error('Erro ao remover usuário do grupo', err)
    })

    async function handleRemoveFromGroup(groupId: string, membershipId: string) {
        removeGroupMutation.mutate({ membershipId, groupId })
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="animate-spin text-brand-green" size={32} />
                <p className="text-sm text-secondary-text font-medium">Carregando perfil...</p>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="p-4 text-center">
                <p className="text-secondary-text">Usuário não encontrado.</p>
                <button onClick={onBack} className="mt-4 text-brand-green font-bold">Voltar</button>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 flex items-center px-4 py-3 sticky top-0 z-30 shadow-sm">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors active:scale-90"
                >
                    <ArrowLeft size={24} className="text-primary-text" />
                </button>
                <div className="ml-2">
                    <h1 className="text-lg font-black text-primary-text leading-tight tracking-tight">Detalhes do Usuário</h1>
                    <p className="text-[10px] text-secondary-text uppercase font-bold tracking-widest">{user.displayName || 'Sem nome'}</p>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-6">
                {/* Profile Card */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="size-16 rounded-3xl bg-brand-green shadow-lg shadow-brand-green/20 flex items-center justify-center text-white text-2xl font-black shrink-0">
                            {user.displayName?.[0] || 'J'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-lg font-black text-primary-text leading-none flex items-center gap-2 truncate">
                                {user.displayName}
                                {user.isSuperAdmin && <Shield size={16} className="text-brand-green shrink-0" />}
                            </h2>
                            <p className="text-sm text-secondary-text font-medium mt-1.5 flex items-center gap-1.5">
                                <Smartphone size={12} className="shrink-0" /> {user.phoneNumber || 'Sem telefone'}
                            </p>
                            <p className="text-[10px] text-secondary-text font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                <Calendar size={10} /> Desde {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    {/* Admin Actions (Moderation) */}
                    {governanceLevel === 'SYSTEM' && (
                        <>
                            <hr className="border-gray-50" />
                            <div className="flex flex-col gap-4">
                                <h3 className="text-xs font-black text-primary-text uppercase tracking-widest flex items-center gap-2">
                                    <Shield size={14} className="text-brand-green" /> Moderação do Super Admin
                                </h3>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-secondary-text uppercase tracking-tight ml-1">Nível (Score)</label>
                                        <div className="relative">
                                            <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" size={14} />
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={score}
                                                onChange={(e) => setLocalScore(e.target.value)}
                                                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-secondary-text uppercase tracking-tight ml-1">Posição</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-green" size={14} />
                                            <select
                                                value={position || ''}
                                                onChange={(e) => setLocalPosition(e.target.value)}
                                                className="w-full pl-9 pr-8 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all appearance-none cursor-pointer"
                                            >
                                                {POSITIONS.map(p => (
                                                    <option key={p.value} value={p.value}>{p.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdateProfile}
                                    disabled={updateProfileMutation.isPending || !hasChanges}
                                    className={`w-full h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${hasChanges && !updateProfileMutation.isPending
                                        ? 'bg-primary-text text-white hover:brightness-110 active:scale-95 shadow-lg'
                                        : 'bg-gray-100 text-secondary-text cursor-not-allowed'
                                        }`}
                                >
                                    {updateProfileMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    SALVAR ALTERAÇÕES
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Groups Section */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-black text-primary-text uppercase tracking-tight flex items-center gap-2">
                            <Inbox size={16} className="text-brand-green" /> Bolhas Ativas ({memberships.length})
                        </h3>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        {memberships.length === 0 ? (
                            <div className="p-8 text-center bg-white border border-gray-100 rounded-3xl">
                                <p className="text-sm text-secondary-text font-medium">Este usuário não participa de nenhum grupo.</p>
                            </div>
                        ) : (
                            memberships.map((m) => (
                                <div key={m.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-10 rounded-xl flex items-center justify-center ${m.role === 'ADMIN' ? 'bg-brand-green/10 text-brand-green border border-brand-green/10' : 'bg-gray-50 text-secondary-text border border-gray-100'}`}>
                                            <Shield size={18} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-primary-text leading-tight">{m.group.name}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-extrabold uppercase tracking-tighter text-brand-green">{m.role}</span>
                                                <span className="size-1 rounded-full bg-gray-200" />
                                                <span className="text-[9px] font-medium text-secondary-text">Desde {new Date(m.joinedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {governanceLevel === 'SYSTEM' && (
                                        <button
                                            onClick={() => setMembershipToRemove(m)}
                                            disabled={removeGroupMutation.isPending && removeGroupMutation.variables?.membershipId === m.id}
                                            className="size-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-colors active:scale-90 disabled:opacity-50"
                                            title="Remover do Grupo"
                                        >
                                            {(removeGroupMutation.isPending && removeGroupMutation.variables?.membershipId === m.id) ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Technical Info */}
                <div className="bg-gray-100/50 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-secondary-text uppercase tracking-widest flex items-center gap-1">
                            <Hash size={10} /> ID Único
                        </span>
                        <code className="text-[10px] font-mono text-secondary-text">{userId}</code>
                    </div>
                </div>
            </div>

            {/* Remove Membership Confirmation Modal */}
            {membershipToRemove && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-primary-text/40 backdrop-blur-md animate-fade-in"
                        onClick={() => !removeGroupMutation.isPending && setMembershipToRemove(null)}
                    />
                    <div className="relative bg-surface w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-spring-up border border-gray-100">
                        <div className="p-8 flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-primary-text">Remover do Grupo</h2>
                                    <p className="text-sm text-secondary-text">Esta ação não pode ser desfeita</p>
                                </div>
                            </div>

                            <div className="bg-brand-red/5 p-4 rounded-2xl border border-brand-red/10">
                                <p className="text-sm text-brand-red leading-relaxed">
                                    Você está prestes a remover o usuário <strong>{user.displayName}</strong> do grupo <strong>{membershipToRemove.group.name}</strong>.
                                </p>
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    disabled={removeGroupMutation.isPending}
                                    onClick={() => setMembershipToRemove(null)}
                                    className="flex-1 py-4 text-sm font-bold text-secondary-text hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleRemoveFromGroup(membershipToRemove.groupId, membershipToRemove.id)}
                                    disabled={removeGroupMutation.isPending}
                                    className="flex-1 py-4 bg-brand-red text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-red/20 flex items-center justify-center gap-2 hover:brightness-105 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                    {removeGroupMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Sim, Remover'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

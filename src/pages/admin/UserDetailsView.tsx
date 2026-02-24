import { useState, useEffect } from 'react'
import { ArrowLeft, Shield, Star, Calendar, Loader2, Save, Trash2, Hash, Smartphone, MapPin, Inbox } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/react'

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
    'GOLEIRO',
    'FIXO',
    'ALA',
    'PIVÔ',
    'ALA/FIXO',
    'ALA/PIVÔ',
    'NÃO DEFINIDO'
]

export default function UserDetailsView({ userId, onBack, governanceLevel = 'VIEW' }: Props) {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [memberships, setMemberships] = useState<GroupMembership[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [removingGroupId, setRemovingGroupId] = useState<string | null>(null)

    // Form states
    const [score, setScore] = useState('')
    const [position, setPosition] = useState('')

    async function fetchUserData() {
        try {
            setLoading(true)

            // Fetch profile
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (profileError) throw profileError
            setUser(profile)
            setScore(profile.globalScore.toString())
            setPosition(profile.mainPosition || '')

            // Fetch memberships
            const { data: groups, error: groupsError } = await supabase
                .from('group_members')
                .select('*, group:groups(name)')
                .eq('userId', userId)

            if (groupsError) throw groupsError
            setMemberships(groups || [])

        } catch (err) {
            logger.error('Erro ao buscar dados do usuário', err)
            Sentry.captureException(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUserData()
    }, [userId])

    async function handleUpdateProfile() {
        if (!user || saving) return
        try {
            setSaving(true)
            const { error } = await supabase
                .from('users')
                .update({
                    globalScore: parseFloat(score) || 0,
                    mainPosition: position || null
                })
                .eq('id', userId)

            if (error) throw error

            logger.info('Perfil atualizado com sucesso', { userId, score, position })
            setUser(prev => prev ? { ...prev, globalScore: parseFloat(score), mainPosition: position } : null)
        } catch (err) {
            logger.error('Erro ao atualizar perfil', err)
            Sentry.captureException(err)
        } finally {
            setSaving(false)
        }
    }

    async function handleRemoveFromGroup(groupId: string, membershipId: string) {
        if (!window.confirm('Tem certeza que deseja remover este usuário do grupo?')) return

        try {
            setRemovingGroupId(groupId)
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('id', membershipId)

            if (error) throw error

            logger.info('Usuário removido do grupo', { userId, groupId })
            setMemberships(prev => prev.filter(m => m.id !== membershipId))
        } catch (err) {
            logger.error('Erro ao remover usuário do grupo', err)
            Sentry.captureException(err)
        } finally {
            setRemovingGroupId(null)
        }
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
                                                onChange={(e) => setScore(e.target.value)}
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
                                                onChange={(e) => setPosition(e.target.value)}
                                                className="w-full pl-9 pr-8 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all appearance-none cursor-pointer"
                                            >
                                                {POSITIONS.map(p => (
                                                    <option key={p} value={p === 'NÃO DEFINIDO' ? '' : p}>{p}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdateProfile}
                                    disabled={saving}
                                    className="w-full h-12 bg-primary-text text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
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
                                            onClick={() => handleRemoveFromGroup(m.groupId, m.id)}
                                            disabled={removingGroupId === m.groupId}
                                            className="size-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-colors active:scale-90 disabled:opacity-50"
                                            title="Remover do Grupo"
                                        >
                                            {removingGroupId === m.groupId ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
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
        </div>
    )
}

import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Users, Shield, User, Loader2, Star, Calendar, Share2, Check, UserPlus, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import SortSelector from '@/components/SortSelector'
import type { SortOption } from '@/components/SortSelector'

interface GroupDetailsViewProps {
    groupId: string
    onBack: () => void
    currentUserRole?: 'ADMIN' | 'SUPER_ADMIN'
}

interface GroupDetail {
    id: string
    name: string
    inviteToken: string
}

interface GroupMember {
    id: string
    role: 'ADMIN' | 'PLAYER'
    joinedAt: string
    user?: {
        id: string
        displayName: string
        phoneNumber: string
        mainPosition: string
        globalScore: number
        isSuperAdmin: boolean
    }
}

interface SearchUser {
    id: string
    displayName: string
    phoneNumber: string
    mainPosition: string
    globalScore: number
}

export default function GroupDetailsView({ groupId, onBack }: GroupDetailsViewProps) {
    const { user } = useCurrentUser()
    const [group, setGroup] = useState<GroupDetail | null>(null)
    const [members, setMembers] = useState<GroupMember[]>([])
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [isAddingMember, setIsAddingMember] = useState(false)
    const [globalUsers, setGlobalUsers] = useState<SearchUser[]>([])
    const [searchUser, setSearchUser] = useState('')
    const [addingUser, setAddingUser] = useState<string | null>(null)
    const [addedInSession, setAddedInSession] = useState<string[]>([])
    const [updatingRole, setUpdatingRole] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<'ROLE' | 'NAME' | 'SCORE' | 'DATE'>('ROLE')

    const sortOptions: SortOption<'ROLE' | 'NAME' | 'SCORE' | 'DATE'>[] = [
        { id: 'ROLE', label: 'CARGO', icon: Shield },
        { id: 'NAME', label: 'NOME', icon: User },
        { id: 'SCORE', label: 'NÍVEL', icon: Star },
        { id: 'DATE', label: 'DATA', icon: Calendar },
    ]

    async function fetchDetails(silent = false) {
        try {
            if (!silent) setLoading(true)

            // Fetch group metadata
            const { data: groupData, error: groupError } = await supabase
                .from('groups')
                .select('*')
                .eq('id', groupId)
                .single()

            if (groupError) throw groupError
            setGroup(groupData)

            // Fetch members with user details
            const { data: membersData, error: membersError } = await supabase
                .from('group_members')
                .select(`
                    id,
                    role,
                    joinedAt,
                    user:users(id, displayName, mainPosition, globalScore, isSuperAdmin)
                `)
                .eq('groupId', groupId)

            if (membersError) throw membersError

            setMembers(membersData as unknown as GroupMember[] || [])

        } catch (err) {
            logger.error('Erro ao buscar detalhes do grupo', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchGlobalUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, displayName, phoneNumber, mainPosition, globalScore')
                .limit(50)

            if (error) throw error
            setGlobalUsers(data || [])
        } catch (err) {
            logger.error('Erro ao buscar usuários globais', err)
        }
    }

    useEffect(() => {
        fetchDetails()
    }, [groupId])

    useEffect(() => {
        if (isAddingMember) {
            fetchGlobalUsers()
        }
    }, [isAddingMember])

    async function handleShare() {
        if (!group) return

        const inviteUrl = `${window.location.origin}?token=${group.inviteToken}`
        const shareData = {
            title: 'Convite para o Borafut',
            text: `Venha jogar no grupo ${group.name}!`,
            url: inviteUrl,
        }

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData)
                logger.info('Compartilhamento via API disparado')
            } else {
                await navigator.clipboard.writeText(inviteUrl)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
                logger.info('Link de convite copiado para o clipboard')
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                logger.error('Erro ao compartilhar', err)
            }
        }
    }

    async function handleAddMember(userId: string) {
        try {
            setAddingUser(userId)

            const { error: insertError } = await supabase
                .from('group_members')
                .insert({
                    groupId: groupId,
                    userId: userId,
                    role: 'PLAYER'
                })

            if (insertError) throw insertError

            // Audit
            await supabase.from('audit_log').insert({
                actorId: user?.id,
                action: 'ADD_GROUP_MEMBER',
                groupId: groupId,
                metadata: { addedUserId: userId }
            })

            logger.info('Membro adicionado diretamente pelo Super Admin', { groupId, userId })

            // Refresh
            await fetchDetails(true)
            setAddedInSession(prev => [...prev, userId])
        } catch (err) {
            logger.error('Erro ao adicionar membro', err)
        } finally {
            setAddingUser(null)
        }
    }

    async function handleToggleRole(memberId: string, currentRole: 'ADMIN' | 'PLAYER', userId: string) {
        if (updatingRole) return

        try {
            setUpdatingRole(memberId)
            const newRole = currentRole === 'ADMIN' ? 'PLAYER' : 'ADMIN'
            const action = newRole === 'ADMIN' ? 'PROMOTE_ADMIN' : 'DEMOTE_PLAYER'

            // Update role in DB
            const { error: updateError } = await supabase
                .from('group_members')
                .update({ role: newRole })
                .eq('id', memberId)

            if (updateError) throw updateError

            // Log administrative action
            await supabase.from('audit_log').insert({
                actorId: user?.id,
                action: action,
                groupId: groupId,
                targetId: userId,
                targetType: 'user',
                metadata: { memberId }
            })

            logger.info(`Membro ${newRole === 'ADMIN' ? 'promovido' : 'rebaixado'}`, { memberId, newRole })

            // Refresh details to update UI
            await fetchDetails(true)
        } catch (err) {
            logger.error('Erro ao alternar cargo do membro', err)
        } finally {
            setUpdatingRole(null)
        }
    }

    const sortedMembers = useMemo(() => {
        return [...members].sort((a, b) => {
            // 1. Super Admin Priority (Sempre topo)
            if (a.user?.isSuperAdmin && !b.user?.isSuperAdmin) return -1
            if (!a.user?.isSuperAdmin && b.user?.isSuperAdmin) return 1

            // 2. Role Priority (Admin > Player)
            if (sortBy === 'ROLE') {
                if (a.role === 'ADMIN' && b.role === 'PLAYER') return -1
                if (a.role === 'PLAYER' && b.role === 'ADMIN') return 1
            }

            // 3. Secondary Sort
            switch (sortBy) {
                case 'NAME':
                    return (a.user?.displayName || '').localeCompare(b.user?.displayName || '')
                case 'SCORE':
                    return (b.user?.globalScore || 0) - (a.user?.globalScore || 0)
                case 'DATE':
                    return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
                case 'ROLE':
                default:
                    // Se for ROLE e for empate no role, ordena por nome
                    return (a.user?.displayName || '').localeCompare(b.user?.displayName || '')
            }
        })
    }, [members, sortBy])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 size={32} className="animate-spin text-brand-green" />
                <p className="text-sm text-secondary-text animate-pulse">Carregando detalhes...</p>
            </div>
        )
    }

    if (!group) {
        return (
            <div className="p-8 text-center flex flex-col gap-4">
                <p className="text-secondary-text">Grupo não encontrado.</p>
                <button onClick={onBack} className="text-brand-green font-bold">Voltar</button>
            </div>
        )
    }

    const availableUsers = globalUsers.filter(gu =>
        !members.some(m => m.user?.id === gu.id) &&
        (gu.displayName?.toLowerCase().includes(searchUser.toLowerCase()) ||
            gu.phoneNumber?.includes(searchUser))
    )

    return (
        <div className="flex flex-col animate-fade-in pb-20">
            {/* Direct Add Modal */}
            {isAddingMember && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface w-full max-w-lg rounded-t-[32px] sm:rounded-3xl flex flex-col max-h-[85vh] shadow-2xl animate-in slide-in-from-bottom duration-300 relative">
                        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-primary-text">Adicionar Integrante</h3>
                                <p className="text-xs text-secondary-text mt-1">Busque usuários para adicionar a {group.name}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsAddingMember(false)
                                    setAddedInSession([])
                                }}
                                className="p-2.5 bg-gray-50 rounded-full text-secondary-text hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50/30 border-b border-gray-100 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={16} />
                                <input
                                    type="text"
                                    placeholder="Nome ou telefone do jogador..."
                                    value={searchUser}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all shadow-sm"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 custom-scrollbar pb-10">
                            {availableUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3.5 hover:bg-gray-50 rounded-2xl transition-all group border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-brand-green/10 flex items-center justify-center text-sm font-bold text-brand-green border border-brand-green/20 shrink-0">
                                            {u.displayName?.[0] || 'J'}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-bold text-primary-text leading-tight truncate">{u.displayName}</span>
                                            <span className="text-[10px] text-secondary-text font-medium">{u.phoneNumber || 'Sem telefone'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAddMember(u.id)}
                                        disabled={addingUser === u.id}
                                        className="bg-brand-green/10 text-brand-green text-[10px] font-bold px-4 py-2.5 rounded-xl hover:bg-brand-green/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                                    >
                                        {addingUser === u.id ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : addedInSession.includes(u.id) ? (
                                            <Check size={14} className="text-brand-green" />
                                        ) : (
                                            <UserPlus size={14} />
                                        )}
                                        {addedInSession.includes(u.id) ? 'ADICIONADO' : 'ADICIONAR'}
                                    </button>
                                </div>
                            ))}
                            {availableUsers.length === 0 && (
                                <div className="text-center py-16 flex flex-col items-center gap-3">
                                    <div className="size-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-200">
                                        <Users size={32} />
                                    </div>
                                    <p className="text-sm text-secondary-text font-medium">Nenhum usuário disponível para adicionar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-surface border-b border-gray-100 p-4 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 hover:bg-gray-50 rounded-xl transition-colors text-secondary-text"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-primary-text">{group.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-secondary-text uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100 flex items-center gap-1">
                                <Users size={10} /> {members.length} Membros
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-6">

                {/* Members List */}
                <div className="flex flex-col gap-4">
                    <div className="px-1">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-primary-text">Integrantes</h3>
                            <div className="flex items-center gap-2 relative">
                                {copied && (
                                    <div className="absolute right-0 -top-8 bg-brand-green text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-1.5 whitespace-nowrap z-20">
                                        <Check size={12} />
                                        Link copiado! Mande para quem quiser
                                    </div>
                                )}
                                <button
                                    onClick={handleShare}
                                    title="Compartilhar Convite"
                                    className={`size-10 flex items-center justify-center rounded-xl transition-all active:scale-95 border shadow-sm cursor-pointer ${copied
                                        ? 'bg-brand-green text-white border-brand-green shadow-brand-green/20'
                                        : 'bg-white text-secondary-text border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:text-primary-text'
                                        }`}
                                >
                                    {copied ? <Check size={18} /> : <Share2 size={18} />}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsAddingMember(true)
                                        setAddedInSession([])
                                    }}
                                    className="bg-brand-green/10 text-brand-green px-3 py-2 h-10 rounded-xl flex items-center gap-1.5 text-[10px] font-bold hover:bg-brand-green/20 transition-all active:scale-95 border border-brand-green/10 shadow-sm cursor-pointer"
                                >
                                    <UserPlus size={14} />
                                    ADICIONAR
                                </button>
                            </div>
                        </div>

                        <SortSelector
                            options={sortOptions}
                            currentValue={sortBy}
                            onChange={setSortBy}
                        />
                    </div>

                    <div className="flex flex-col gap-2.5">
                        {sortedMembers.map((member) => (
                            <div key={member.id} className="bg-surface border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-xl flex items-center justify-center ${member.role === 'ADMIN' || member.user?.isSuperAdmin
                                        ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                                        : 'bg-gray-50 text-secondary-text border border-gray-100'
                                        }`}>
                                        {member.role === 'ADMIN' || member.user?.isSuperAdmin ? <Shield size={20} /> : <User size={20} />}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-sm text-primary-text leading-tight">
                                                {member.user?.displayName || 'Usuário sem nome'}
                                            </span>
                                            {member.user?.isSuperAdmin ? (
                                                <span className="text-[8px] bg-indigo-600 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                                    Super Admin
                                                </span>
                                            ) : member.role === 'ADMIN' ? (
                                                <span className="text-[8px] bg-brand-green text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                                    Admin
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-secondary-text font-medium flex items-center gap-1">
                                                <Star size={10} className="text-amber-400 fill-amber-400" />
                                                {member.user?.globalScore.toFixed(1)}
                                            </span>
                                            <span className="size-1 rounded-full bg-gray-200" />
                                            <span className="text-[10px] text-secondary-text font-medium uppercase tracking-tight">
                                                {member.user?.mainPosition || '---'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-[9px] text-secondary-text font-medium flex items-center gap-1 opacity-60">
                                        <Calendar size={10} />
                                        Entrou {new Date(member.joinedAt).toLocaleDateString()}
                                    </span>

                                    {!member.user?.isSuperAdmin && (
                                        <button
                                            onClick={() => handleToggleRole(member.id, member.role, member.user?.id || '')}
                                            disabled={updatingRole === member.id}
                                            className={`text-[9px] font-bold px-2 py-1.5 rounded-lg border transition-all active:scale-95 flex items-center gap-1.5 ${member.role === 'ADMIN'
                                                ? 'bg-gray-50 text-secondary-text border-gray-100 hover:bg-gray-100'
                                                : 'bg-brand-green/5 text-brand-green border-brand-green/10 hover:bg-brand-green/10'
                                                }`}
                                        >
                                            {updatingRole === member.id ? (
                                                <Loader2 size={10} className="animate-spin" />
                                            ) : member.role === 'ADMIN' ? (
                                                <>
                                                    <User size={10} />
                                                    TORNAR JOGADOR
                                                </>
                                            ) : (
                                                <>
                                                    <Shield size={10} />
                                                    TORNAR ADMIN
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {members.length === 0 && (
                            <div className="text-center py-10 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                <p className="text-sm text-secondary-text">Nenhum membro encontrado neste grupo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

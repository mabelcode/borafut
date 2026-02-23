import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Shield, User, Loader2, Star, Calendar, Hash, Key } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/react'

interface Member {
    id: string
    role: 'ADMIN' | 'PLAYER'
    joinedAt: string
    user: {
        id: string
        displayName: string
        mainPosition: string
        globalScore: number
    }
}

interface GroupDetailsViewProps {
    groupId: string
    onBack: () => void
}

export default function GroupDetailsView({ groupId, onBack }: GroupDetailsViewProps) {
    const [group, setGroup] = useState<any>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)

    async function fetchDetails() {
        try {
            setLoading(true)

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
                    user:users(id, displayName, mainPosition, globalScore)
                `)
                .eq('groupId', groupId)
                .order('role', { ascending: true }) // ADMINs first

            if (membersError) throw membersError
            setMembers(membersData as any[] || [])

        } catch (err) {
            logger.error('Erro ao buscar detalhes do grupo', err)
            Sentry.captureException(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDetails()
    }, [groupId])

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

    return (
        <div className="flex flex-col animate-fade-in pb-20">
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
                {/* Info Cards */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="bg-surface border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                        <h3 className="text-[10px] font-bold text-secondary-text uppercase tracking-widest flex items-center gap-1.5">
                            <Hash size={12} className="text-brand-green" /> Identificação e Acesso
                        </h3>
                        <div className="flex flex-col gap-3 mt-1">
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] text-secondary-text font-semibold uppercase tracking-tighter">ID do Grupo</label>
                                <code className="text-[11px] bg-gray-50 p-2 rounded-lg border border-gray-100 text-primary-text font-mono break-all leading-tight">
                                    {group.id}
                                </code>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[9px] text-secondary-text font-semibold uppercase tracking-tighter">Token de Convite</label>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 text-[11px] bg-brand-green/5 p-2 rounded-lg border border-brand-green/10 text-brand-green font-bold font-mono">
                                        {group.inviteToken}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(group.inviteToken)
                                            logger.info('Token copiado')
                                        }}
                                        className="p-2 bg-gray-50 border border-gray-100 rounded-lg text-secondary-text active:scale-95 transition-all"
                                    >
                                        <Key size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Members List */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold text-primary-text">Integrantes</h3>
                        <span className="text-[10px] text-secondary-text font-medium bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                            Ordem: Admins primeiro
                        </span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        {members.map((member) => (
                            <div key={member.id} className="bg-surface border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-xl flex items-center justify-center ${member.role === 'ADMIN'
                                            ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                                            : 'bg-gray-50 text-secondary-text border border-gray-100'
                                        }`}>
                                        {member.role === 'ADMIN' ? <Shield size={20} /> : <User size={20} />}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-sm text-primary-text leading-tight">
                                                {member.user?.displayName || 'Usuário sem nome'}
                                            </span>
                                            {member.role === 'ADMIN' && (
                                                <span className="text-[8px] bg-brand-green text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                                    Admin
                                                </span>
                                            )}
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

                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[9px] text-secondary-text font-medium flex items-center gap-1 opacity-60">
                                        <Calendar size={10} />
                                        Entrou {new Date(member.joinedAt).toLocaleDateString()}
                                    </span>
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

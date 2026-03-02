import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Search, Loader2, Users, UserPlus, Check, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createLogger } from '@/lib/logger'
import type { Registration } from '@/hooks/useMatchDetail'
import PlayerAvatar from '@/components/PlayerAvatar'

const logger = createLogger('AddPlayerModal')

interface GroupMemberUser {
    id: string
    displayName: string | null
    mainPosition: string | null
    globalScore: number
    avatarUrl: string | null
}

interface Props {
    matchId: string
    groupId: string
    existingRegistrations: Registration[]
    onClose: () => void
    onPlayerAdded: () => void
}

const POSITION_LABEL: Record<string, string> = {
    GOALKEEPER: 'Goleiro',
    DEFENSE: 'Defesa',
    ATTACK: 'Ataque',
}

export default function AddPlayerModal({ matchId, groupId, existingRegistrations, onClose, onPlayerAdded }: Props) {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [addedIds, setAddedIds] = useState<string[]>([])

    // Fetch group members
    const { data: membersData, isLoading: loadingMembers } = useQuery({
        queryKey: ['groupMembersForMatch', groupId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('group_members')
                .select('userId, user:users(id, displayName, mainPosition, globalScore, avatarUrl)')
                .eq('groupId', groupId)

            if (error) throw new Error(error.message)
            return (data ?? []) as unknown as { userId: string; user: GroupMemberUser }[]
        }
    })

    const members = membersData ?? []

    // Filter out players already registered in the match
    const alreadyRegisteredIds = useMemo(
        () => new Set(existingRegistrations.map(r => r.userId)),
        [existingRegistrations]
    )

    const availablePlayers = useMemo(() => {
        return members
            .filter(m => !alreadyRegisteredIds.has(m.userId))
            .filter(m => {
                if (!search) return true
                const name = m.user?.displayName?.toLowerCase() ?? ''
                return name.includes(search.toLowerCase())
            })
    }, [members, alreadyRegisteredIds, search])

    // Mutation to add a player to the match
    const addPlayerMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase.from('match_registrations').insert({
                matchId,
                userId,
                status: 'CONFIRMED',
            })
            if (error) throw new Error(error.message)
            return userId
        },
        onSuccess: (userId) => {
            logger.info('Jogador adicionado à partida pelo admin', { matchId, userId })
            setAddedIds(prev => [...prev, userId])
            queryClient.invalidateQueries({ queryKey: ['matchDetail', matchId] })
            onPlayerAdded()
        },
        onError: (err: unknown) => {
            const message = err instanceof Error ? err.message : 'Erro ao adicionar jogador.'
            logger.error('Erro ao adicionar jogador à partida', { error: err })
            alert(message)
        }
    })

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-lg rounded-t-[32px] sm:rounded-3xl flex flex-col max-h-[85vh] shadow-2xl animate-in slide-in-from-bottom duration-300">

                {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-primary-text">Adicionar Jogador</h3>
                        <p className="text-xs text-secondary-text mt-1">Selecione membros do grupo para inscrever na partida</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-gray-50 rounded-full text-secondary-text hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 bg-gray-50/30 border-b border-gray-100 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar jogador por nome..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all shadow-sm"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Player List */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 custom-scrollbar pb-10">
                    {loadingMembers ? (
                        <div className="flex justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-secondary-text" />
                        </div>
                    ) : availablePlayers.length === 0 ? (
                        <div className="text-center py-16 flex flex-col items-center gap-3">
                            <div className="size-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-200">
                                <Users size={32} />
                            </div>
                            <p className="text-sm text-secondary-text font-medium">
                                {search ? 'Nenhum jogador encontrado com esse nome.' : 'Todos os membros do grupo já estão inscritos.'}
                            </p>
                        </div>
                    ) : (
                        availablePlayers.map(m => {
                            const player = m.user
                            if (!player) return null
                            const name = player.displayName ?? 'Jogador'
                            const position = player.mainPosition ? POSITION_LABEL[player.mainPosition] ?? player.mainPosition : '—'
                            const isAdding = addPlayerMutation.isPending && addPlayerMutation.variables === m.userId
                            const wasAdded = addedIds.includes(m.userId)

                            return (
                                <div
                                    key={m.userId}
                                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all group border ${wasAdded
                                        ? 'bg-brand-green/5 border-brand-green/10'
                                        : 'border-transparent hover:bg-gray-50 hover:border-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <PlayerAvatar src={player.avatarUrl} name={name} position={player.mainPosition} />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-bold text-primary-text leading-tight truncate">{name}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-secondary-text font-medium uppercase tracking-tight">{position}</span>
                                                <span className="size-1 rounded-full bg-gray-200" />
                                                <span className="text-[10px] text-secondary-text font-medium flex items-center gap-0.5">
                                                    <Star size={9} className="text-amber-400 fill-amber-400" />
                                                    {player.globalScore.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => addPlayerMutation.mutate(m.userId)}
                                        disabled={isAdding || wasAdded}
                                        className={`text-[10px] font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shrink-0 ${wasAdded
                                            ? 'bg-brand-green/10 text-brand-green border border-brand-green/10'
                                            : 'bg-brand-green/10 text-brand-green hover:bg-brand-green/20 border border-brand-green/10'
                                            }`}
                                    >
                                        {isAdding ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : wasAdded ? (
                                            <Check size={14} className="text-brand-green" />
                                        ) : (
                                            <UserPlus size={14} />
                                        )}
                                        {wasAdded ? 'ADICIONADO' : 'ADICIONAR'}
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

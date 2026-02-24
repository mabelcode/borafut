import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2, ArrowRight, ShieldCheck, Calendar, User, Star, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/react'
import SortSelector from '@/components/SortSelector'
import type { SortOption } from '@/components/SortSelector'

interface Props {
    onSelectUser: (userId: string) => void
}

interface GlobalUser {
    id: string
    displayName: string
    phoneNumber: string
    globalScore: number
    mainPosition: string
    createdAt: string
    isSuperAdmin: boolean
    group_members?: { count: number }[]
}

export default function UsersTab({ onSelectUser }: Props) {
    const [users, setUsers] = useState<GlobalUser[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState<'NAME' | 'SCORE' | 'DATE' | 'GROUPS'>('NAME')

    async function fetchUsers() {
        try {
            setLoading(true)
            logger.debug('Iniciando busca de usuários...')

            const { data, error } = await supabase
                .from('users')
                .select('*, group_members(count)')
                .order('createdAt', { ascending: false })

            if (error) throw error

            logger.debug('Usuários encontrados:', { count: data?.length, users: data })

            // For now, let's fetch counts separately or accept 0 until we debug the join
            setUsers(data as unknown as GlobalUser[] || [])
        } catch (err) {
            logger.error('Erro ao buscar usuários', err)
            Sentry.captureException(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const filteredUsers = users.filter(u => {
        const nameMatch = u.displayName?.toLowerCase().includes(search.toLowerCase()) ?? false
        const phoneMatch = u.phoneNumber?.includes(search) ?? false
        return nameMatch || phoneMatch
    })

    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => {
            switch (sortBy) {
                case 'NAME':
                    return (a.displayName || '').localeCompare(b.displayName || '')
                case 'SCORE':
                    return (b.globalScore || 0) - (a.globalScore || 0)
                case 'GROUPS': {
                    const countA = a.group_members?.[0]?.count || 0
                    const countB = b.group_members?.[0]?.count || 0
                    return countB - countA
                }
                case 'DATE':
                default:
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            }
        })
    }, [filteredUsers, sortBy])

    const sortOptions: SortOption<'NAME' | 'SCORE' | 'DATE' | 'GROUPS'>[] = [
        { id: 'NAME', label: 'NOME', icon: User },
        { id: 'SCORE', label: 'NÍVEL', icon: Star },
        { id: 'GROUPS', label: 'GRUPOS', icon: Layers },
        { id: 'DATE', label: 'CADASTRO', icon: Calendar },
    ]

    return (
        <div className="p-4 flex flex-col gap-4">
            {/* Search */}
            <div className="flex flex-col gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar usuário por nome ou fone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                    />
                </div>

                <SortSelector
                    options={sortOptions}
                    currentValue={sortBy}
                    onChange={setSortBy}
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-secondary-text" />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-secondary-text text-sm">
                    Nenhum usuário encontrado
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {sortedUsers.map((user) => (
                        <div key={user.id} className="bg-surface border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                                        {user.displayName?.[0] || 'J'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-primary-text flex items-center gap-1.5 leading-none">
                                            {user.displayName}
                                            {user.isSuperAdmin && <ShieldCheck size={14} className="text-brand-green" />}
                                        </h3>
                                        <p className="text-xs text-secondary-text mt-1">{user.phoneNumber || 'Sem fone'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onSelectUser(user.id)}
                                    className="text-secondary-text p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <ArrowRight size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-50 rounded-xl p-2 flex flex-col gap-0.5 border border-gray-100">
                                    <span className="text-[9px] font-bold text-secondary-text uppercase tracking-wider">Posição</span>
                                    <span className="text-xs font-semibold text-primary-text">{user.mainPosition || 'Não definido'}</span>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-2 flex flex-col gap-0.5 border border-gray-100">
                                    <span className="text-[9px] font-bold text-secondary-text uppercase tracking-wider">Bolhas</span>
                                    <span className="text-xs font-semibold text-primary-text">{user.group_members?.[0]?.count || 0} grupos</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-secondary-text mt-1 px-1">
                                <div className="flex items-center gap-1">
                                    <Calendar size={10} />
                                    Cadastrado em {new Date(user.createdAt).toLocaleDateString()}
                                </div>
                                <div className="font-bold text-brand-green">
                                    Score: {user.globalScore}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

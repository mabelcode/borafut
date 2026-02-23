import { useState, useEffect } from 'react'
import { FolderKanban, Plus, Loader2, Search, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/react'

export default function GroupsTab() {
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [creating, setCreating] = useState(false)

    async function fetchGroups() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('groups')
                .select('*, group_members(count)')
                .order('createdAt', { ascending: false })

            if (error) throw error
            setGroups(data || [])
        } catch (err) {
            logger.error('Erro ao buscar grupos', err)
            Sentry.captureException(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchGroups()
    }, [])

    async function handleCreateGroup(e: React.FormEvent) {
        e.preventDefault()
        if (!newGroupName.trim()) return

        try {
            setCreating(true)
            const { data, error } = await supabase
                .from('groups')
                .insert({ name: newGroupName.trim() })
                .select()
                .single()

            if (error) throw error

            logger.info('Novo grupo criado pelo Super Admin', { groupId: data.id, name: data.name })

            // Log audit
            await supabase.from('audit_log').insert({
                action: 'CREATE_GROUP',
                targetType: 'group',
                targetId: data.id,
                metadata: { name: data.name }
            })

            setNewGroupName('')
            setIsModalOpen(false)
            fetchGroups()
        } catch (err) {
            logger.error('Erro ao criar grupo', err)
            Sentry.captureException(err)
        } finally {
            setCreating(false)
        }
    }

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="p-4 flex flex-col gap-4">
            {/* Search & Add */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar grupo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                    />
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-green text-white size-10 flex items-center justify-center rounded-xl shadow-sm shadow-brand-green/20"
                >
                    <Plus size={20} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-secondary-text" />
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="text-center py-10 text-secondary-text text-sm">
                    Nenhum grupo encontrado
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredGroups.map((group) => (
                        <div key={group.id} className="bg-surface border border-gray-100 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-primary-text">{group.name}</h3>
                                    <p className="text-[10px] text-secondary-text uppercase tracking-wider font-semibold">
                                        {group.group_members?.[0]?.count || 0} Membros
                                    </p>
                                </div>
                                <button className="text-brand-green p-1 hover:bg-brand-green/5 rounded-lg transition-colors">
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] bg-gray-50 text-secondary-text px-2 py-0.5 rounded-full border border-gray-100">
                                    ID: {group.id.split('-')[0]}...
                                </span>
                                <span className="text-[10px] bg-gray-50 text-secondary-text px-2 py-0.5 rounded-full border border-gray-100">
                                    Token: {group.inviteToken.slice(0, 6)}...
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Group Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-primary-text/40 backdrop-blur-md animate-fade-in"
                        onClick={() => !creating && setIsModalOpen(false)}
                    />
                    <form
                        onSubmit={handleCreateGroup}
                        className="relative bg-surface w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-spring-up border border-gray-100"
                    >
                        <div className="p-8 flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                                    <FolderKanban size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-primary-text">Novo Grupo</h2>
                                    <p className="text-sm text-secondary-text">Crie uma nova bolha de jogadores</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-secondary-text uppercase tracking-widest ml-1">Nome do Grupo</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    placeholder="Ex: Pelada dos Amigos"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-brand-green/10 focus:border-brand-green focus:bg-white transition-all"
                                />
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    disabled={creating}
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 text-sm font-bold text-secondary-text hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating || !newGroupName.trim()}
                                    className="flex-1 py-4 bg-brand-green text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2 hover:brightness-105 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                    {creating ? <Loader2 size={18} className="animate-spin" /> : 'Criar Grupo'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}

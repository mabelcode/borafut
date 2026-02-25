import { useCurrentUser } from '@/hooks/useCurrentUser'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, ArrowRight, Edit2, FolderKanban, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
    onSelectGroup: (groupId: string) => void
}

interface Group {
    id: string
    name: string
    createdAt: string
    _count?: {
        members: number
    }
    group_members?: { count: number }[]
}

export default function GroupsTab({ onSelectGroup }: Props) {
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [creating, setCreating] = useState(false)
    const [editingGroup, setEditingGroup] = useState<Group | null>(null)
    const [deletingGroup, setDeletingGroup] = useState<Group | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [editName, setEditName] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const { user } = useCurrentUser()

    async function fetchGroups() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('groups')
                .select('*, group_members(count)')
                .order('createdAt', { ascending: false })

            if (error) throw error
            setGroups(data as unknown as Group[] || ([] as Group[]))
        } catch (err) {
            logger.error('Erro ao buscar grupos', err)
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
                actorId: user?.id,
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
        } finally {
            setCreating(false)
        }
    }

    async function handleUpdateGroup(e: React.FormEvent) {
        e.preventDefault()
        if (!editingGroup || !editName.trim()) return

        try {
            setIsUpdating(true)
            const { error } = await supabase
                .from('groups')
                .update({ name: editName.trim() })
                .eq('id', editingGroup.id)

            if (error) throw error

            logger.info('Grupo atualizado pelo Super Admin', { groupId: editingGroup.id, oldName: editingGroup.name, newName: editName.trim() })

            await supabase.from('audit_log').insert({
                actorId: user?.id,
                action: 'UPDATE_GROUP',
                targetType: 'group',
                targetId: editingGroup.id,
                metadata: { oldName: editingGroup.name, newName: editName.trim() }
            })

            setIsEditModalOpen(false)
            setEditingGroup(null)
            fetchGroups()
        } catch (err) {
            logger.error('Erro ao atualizar grupo', err)
        } finally {
            setIsUpdating(false)
        }
    }

    async function handleDeleteGroup() {
        if (!deletingGroup) return

        try {
            setIsDeleting(true)
            const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', deletingGroup.id)

            if (error) throw error

            logger.info('Grupo removido pelo Super Admin', { groupId: deletingGroup.id, name: deletingGroup.name })

            await supabase.from('audit_log').insert({
                actorId: user?.id,
                action: 'DELETE_GROUP',
                targetType: 'group',
                targetId: deletingGroup.id,
                metadata: { name: deletingGroup.name }
            })

            setIsDeleteModalOpen(false)
            setDeletingGroup(null)
            fetchGroups()
        } catch (err) {
            logger.error('Erro ao excluir grupo', err)
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-4">
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
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            setEditingGroup(group)
                                            setEditName(group.name)
                                            setIsEditModalOpen(true)
                                        }}
                                        className="text-secondary-text p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                        title="Editar nome"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeletingGroup(group)
                                            setIsDeleteModalOpen(true)
                                        }}
                                        className="text-brand-red p-2 hover:bg-brand-red/5 rounded-xl transition-colors"
                                        title="Excluir grupo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => onSelectGroup(group.id)}
                                        className="text-brand-green p-2 hover:bg-brand-green/5 rounded-xl transition-colors"
                                    >
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
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

            {/* Edit Group Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-primary-text/40 backdrop-blur-md animate-fade-in"
                        onClick={() => !isUpdating && setIsEditModalOpen(false)}
                    />
                    <form
                        onSubmit={handleUpdateGroup}
                        className="relative bg-surface w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-spring-up border border-gray-100"
                    >
                        <div className="p-8 flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                                    <Edit2 size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-primary-text">Editar Grupo</h2>
                                    <p className="text-sm text-secondary-text">Altere o nome da bolha</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-secondary-text uppercase tracking-widest ml-1">Nome do Grupo</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-brand-green/10 focus:border-brand-green focus:bg-white transition-all"
                                />
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-4 text-sm font-bold text-secondary-text hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating || !editName.trim() || editName === editingGroup?.name}
                                    className="flex-1 py-4 bg-brand-green text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2 hover:brightness-105 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div
                        className="absolute inset-0 bg-primary-text/40 backdrop-blur-md animate-fade-in"
                        onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                    />
                    <div className="relative bg-surface w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-spring-up border border-gray-100">
                        <div className="p-8 flex flex-col gap-6">
                            <div className="flex items-center gap-4">
                                <div className="size-12 rounded-2xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-primary-text">Excluir Grupo</h2>
                                    <p className="text-sm text-secondary-text">Esta ação não pode ser desfeita</p>
                                </div>
                            </div>

                            <div className="bg-brand-red/5 p-4 rounded-2xl border border-brand-red/10">
                                <p className="text-sm text-brand-red leading-relaxed">
                                    Você está prestes a excluir o grupo <strong>{deletingGroup?.name}</strong>.
                                    Os membros serão desassociados, mas suas contas não serão excluídas.
                                </p>
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-4 text-sm font-bold text-secondary-text hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteGroup}
                                    disabled={isDeleting}
                                    className="flex-1 py-4 bg-brand-red text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-red/20 flex items-center justify-center gap-2 hover:brightness-105 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Sim, Excluir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

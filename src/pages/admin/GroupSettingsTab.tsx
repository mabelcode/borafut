import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, Link2, Copy, RefreshCw, Clock, Edit2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface GroupSettingsTabProps {
    groupId: string
}

interface GroupData {
    id: string
    name: string
    inviteToken: string
    inviteExpiresAt: string | null
}

const EXPIRY_OPTIONS = [
    { label: '24 horas', hours: 24 },
    { label: '7 dias', hours: 24 * 7 },
    { label: '30 dias', hours: 24 * 30 },
    { label: 'Sem expiração', hours: null },
]

export default function GroupSettingsTab({ groupId }: GroupSettingsTabProps) {
    const [group, setGroup] = useState<GroupData | null>(null)
    const [loading, setLoading] = useState(true)
    const [editingName, setEditingName] = useState(false)
    const [newName, setNewName] = useState('')
    const [isSavingName, setIsSavingName] = useState(false)
    const [selectedExpiry, setSelectedExpiry] = useState<number | null>(null)
    const [regenerating, setRegenerating] = useState(false)
    const [copied, setCopied] = useState(false)

    async function fetchGroupData() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('groups')
                .select('id, name, inviteToken, inviteExpiresAt')
                .eq('id', groupId)
                .single()

            if (error) throw error
            setGroup(data)
            setNewName(data.name)
        } catch (err) {
            logger.error('Erro ao buscar dados do grupo para ajustes', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchGroupData()
    }, [groupId])

    async function handleSaveName() {
        if (!newName.trim() || newName === group?.name) {
            setEditingName(false)
            return
        }

        try {
            setIsSavingName(true)
            const { error } = await supabase
                .from('groups')
                .update({ name: newName.trim() })
                .eq('id', groupId)

            if (error) throw error
            setGroup(prev => prev ? { ...prev, name: newName.trim() } : null)
            setEditingName(false)
            logger.info('Nome do grupo atualizado pelo admin', { groupId, newName })
        } catch (err) {
            logger.error('Erro ao atualizar nome do grupo', err)
        } finally {
            setIsSavingName(false)
        }
    }

    async function handleRegenerateInvite() {
        try {
            setRegenerating(true)
            const newToken = crypto.randomUUID().replace(/-/g, '')
            const expiresAt = selectedExpiry
                ? new Date(Date.now() + selectedExpiry * 3600000).toISOString()
                : null

            const { error } = await supabase
                .from('groups')
                .update({ inviteToken: newToken, inviteExpiresAt: expiresAt })
                .eq('id', groupId)

            if (error) throw error

            setGroup(prev => prev ? { ...prev, inviteToken: newToken, inviteExpiresAt: expiresAt } : null)
            logger.info('Link de convite regenerado pelo admin', { groupId })
        } catch (err) {
            logger.error('Erro ao regenerar link de convite', err)
        } finally {
            setRegenerating(false)
        }
    }

    async function handleCopyLink() {
        if (!group) return
        const inviteUrl = `${window.location.origin}?token=${group.inviteToken}`
        await navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin text-secondary-text" />
            </div>
        )
    }

    if (!group) {
        return (
            <div className="p-12 text-center flex flex-col items-center gap-4 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 m-4">
                <p className="text-sm text-secondary-text">Não foi possível carregar os dados do grupo.</p>
                <button
                    onClick={fetchGroupData}
                    className="text-sm font-semibold text-brand-green hover:underline flex items-center gap-2"
                >
                    <RefreshCw size={14} />
                    Tentar novamente
                </button>
            </div>
        )
    }

    const inviteUrl = `${window.location.origin}?token=${group.inviteToken}`
    const isExpired = group.inviteExpiresAt && new Date(group.inviteExpiresAt) < new Date()

    return (
        <div className="p-4 flex flex-col gap-6 animate-fade-in pb-20">
            {/* Identity Card */}
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Edit2 size={18} className="text-brand-green" />
                    <h3 className="text-sm font-bold text-primary-text uppercase tracking-widest">Identidade do Grupo</h3>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-secondary-text uppercase tracking-widest ml-1">Nome da Bolha</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newName}
                            disabled={!editingName}
                            onChange={(e) => setNewName(e.target.value)}
                            className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-all ${editingName
                                ? 'bg-white border-2 border-brand-green outline-none'
                                : 'bg-gray-50 border border-gray-100 text-secondary-text'
                                }`}
                        />
                        {editingName ? (
                            <button
                                onClick={handleSaveName}
                                disabled={isSavingName}
                                className="bg-brand-green text-white px-4 rounded-xl font-bold text-xs"
                            >
                                {isSavingName ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setEditingName(true)}
                                className="bg-gray-100 text-secondary-text px-4 rounded-xl font-bold text-xs"
                            >
                                Editar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Invite Link Card */}
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Link2 size={18} className="text-brand-green" />
                    <h3 className="text-sm font-bold text-primary-text uppercase tracking-widest">Link de Convite</h3>
                </div>

                {isExpired && (
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <p className="text-[11px] text-amber-700 font-medium">
                            ⚠️ Este link expirou. Gere um novo abaixo para permitir a entrada de novos membros.
                        </p>
                    </div>
                )}

                <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-3 py-3">
                    <p className="flex-1 text-[11px] text-secondary-text truncate font-mono">{inviteUrl}</p>
                    <button
                        onClick={handleCopyLink}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${copied ? 'bg-brand-green text-white' : 'text-brand-green border border-brand-green/20'
                            }`}
                    >
                        {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                        {copied ? 'COPIADO' : 'COPIAR'}
                    </button>
                </div>

                {group.inviteExpiresAt && !isExpired && (
                    <p className="text-[10px] text-secondary-text flex items-center gap-1 ml-1">
                        <Clock size={12} />
                        Expira em {new Date(group.inviteExpiresAt).toLocaleString('pt-BR')}
                    </p>
                )}

                <div className="flex flex-col gap-3 mt-2 pt-2 border-t border-gray-50">
                    <p className="text-[10px] font-bold text-secondary-text uppercase tracking-widest ml-1">Regenerar Link</p>
                    <div className="grid grid-cols-2 gap-2">
                        {EXPIRY_OPTIONS.map(opt => (
                            <button
                                key={opt.label}
                                type="button"
                                onClick={() => setSelectedExpiry(opt.hours)}
                                className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${selectedExpiry === opt.hours
                                    ? 'bg-brand-green border-brand-green text-white'
                                    : 'bg-white border-gray-100 text-secondary-text'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleRegenerateInvite}
                        disabled={regenerating}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-[11px] font-bold hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        GERAR NOVO LINK
                    </button>
                </div>
            </div>
        </div>
    )
}

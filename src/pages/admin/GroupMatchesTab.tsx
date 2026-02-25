import { useState } from 'react'
import { Calendar, Users, CircleDollarSign, Loader2, Plus, Edit2, Trash2, X, ArrowRight, FileText, AlertTriangle } from 'lucide-react'
import { useMatches, type Match } from '@/hooks/useMatches'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/react'

interface Props {
    groupId: string
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCurrencyInput(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    const value = parseInt(digits, 10) / 100
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseCurrencyToNumber(raw: string): number {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return 0
    return parseInt(digits, 10) / 100
}

function nowLocalDatetime() {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
}

function toLocalDatetimeInput(iso: string) {
    const d = new Date(iso)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
}

const STATUS_LABEL: Record<Match['status'], { label: string; className: string }> = {
    OPEN: { label: 'Aberta', className: 'bg-brand-green/10 text-brand-green' },
    CLOSED: { label: 'Fechada', className: 'bg-gray-100 text-secondary-text' },
    FINISHED: { label: 'Encerrada', className: 'bg-gray-100 text-secondary-text' },
}

/* ── Form Field Wrapper ──────────────────────────────────────────── */

function FieldCard({ icon, label, hint, children }: { icon: React.ReactNode, label: string, hint?: string, children: React.ReactNode }) {
    return (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <span className="text-brand-green">{icon}</span>
                <span className="text-xs font-bold text-secondary-text uppercase tracking-widest">{label}</span>
            </div>
            {hint && <p className="text-[10px] text-secondary-text -mt-1">{hint}</p>}
            {children}
        </div>
    )
}

/* ── Main Component ──────────────────────────────────────────────── */

export default function GroupMatchesTab({ groupId }: Props) {
    const { matches, loading: loadingMatches, error: loadError, refetch } = useMatches(groupId)

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [editingMatch, setEditingMatch] = useState<Match | null>(null)
    const [matchToDelete, setMatchToDelete] = useState<Match | null>(null)
    const [title, setTitle] = useState('')
    const [scheduledAt, setScheduledAt] = useState('')
    const [maxPlayers, setMaxPlayers] = useState('')
    const [priceRaw, setPriceRaw] = useState('')
    const [saving, setSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Computed
    const canSubmit = scheduledAt !== '' && parseInt(maxPlayers) >= 2 && parseCurrencyToNumber(priceRaw) > 0 && !saving

    const resetForm = () => {
        setEditingMatch(null)
        setTitle('')
        setScheduledAt('')
        setMaxPlayers('14')
        setPriceRaw('2000') // Default R$ 20,00
        setIsModalOpen(false)
    }

    const startEdit = (match: Match) => {
        setEditingMatch(match)
        setTitle(match.title || '')
        setScheduledAt(toLocalDatetimeInput(match.scheduledAt))
        setMaxPlayers(String(match.maxPlayers))
        setPriceRaw(String(Math.round(match.price * 100)))
        setIsModalOpen(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canSubmit) return

        try {
            setSaving(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const payload = {
                groupId,
                managerId: user.id,
                title: title.trim() || null,
                scheduledAt: new Date(scheduledAt).toISOString(),
                maxPlayers: parseInt(maxPlayers),
                price: parseCurrencyToNumber(priceRaw),
                status: editingMatch?.status || 'OPEN'
            }

            let response;
            if (editingMatch) {
                response = await supabase.from('matches').update(payload).eq('id', editingMatch.id)
            } else {
                response = await supabase.from('matches').insert(payload)
            }

            if (response.error) throw response.error

            logger.info(editingMatch ? 'Partida atualizada' : 'Partida criada', { groupId, title })
            await refetch()
            resetForm()
        } catch (err) {
            logger.error('Erro ao salvar partida', err)
            Sentry.captureException(err)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (!matchToDelete) return

        try {
            setIsDeleting(true)
            const { error } = await supabase.from('matches').delete().eq('id', matchToDelete.id)
            if (error) throw error
            logger.info('Partida excluída pelo admin', { matchId: matchToDelete.id })
            await refetch()
            setIsDeleteModalOpen(false)
            setMatchToDelete(null)
        } catch (err) {
            logger.error('Erro ao excluir partida', err)
            Sentry.captureException(err)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="p-4 flex flex-col gap-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-primary-text uppercase tracking-widest">Partidas da Bolha</h2>
                    <span className="text-[10px] text-secondary-text font-medium">{matches.length} partidas organizadas</span>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true) }}
                    className="bg-brand-green text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-brand-green/20 flex items-center gap-2 hover:brightness-105 active:scale-95 transition-all"
                >
                    <Plus size={16} />
                    NOVA
                </button>
            </div>

            {/* Modal de CRUD */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface w-full max-w-lg rounded-t-[32px] sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-primary-text">{editingMatch ? 'Editar Partida' : 'Nova Partida'}</h3>
                                <p className="text-xs text-secondary-text mt-1">Configure os detalhes da pelada</p>
                            </div>
                            <button onClick={resetForm} className="p-2 bg-gray-50 rounded-full text-secondary-text">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                            <FieldCard icon={<FileText size={16} />} label="Título" hint="Opcional — Ex: Noite dos craques">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Pelada do racha"
                                    className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                                />
                            </FieldCard>

                            <FieldCard icon={<Calendar size={16} />} label="Data e Horário">
                                <input
                                    type="datetime-local"
                                    min={nowLocalDatetime()}
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                    className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                                />
                            </FieldCard>

                            <FieldCard icon={<Users size={16} />} label="Limite de Jogadores">
                                <input
                                    type="number"
                                    min={2}
                                    value={maxPlayers}
                                    onChange={(e) => setMaxPlayers(e.target.value)}
                                    className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                                    placeholder="Ex: 14"
                                />
                            </FieldCard>

                            <FieldCard icon={<CircleDollarSign size={16} />} label="Taxa de Inscrição">
                                <div className="flex items-center gap-2 bg-gray-50 border border-transparent rounded-xl px-4 py-3 focus-within:bg-white focus-within:border-brand-green focus-within:ring-4 focus-within:ring-brand-green/10 transition-all">
                                    <span className="text-sm font-bold text-secondary-text">R$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formatCurrencyInput(priceRaw).replace('R$\u00a0', '').replace('R$', '')}
                                        onChange={(e) => setPriceRaw(e.target.value.replace(/\D/g, ''))}
                                        className="flex-1 bg-transparent text-sm font-bold outline-none"
                                    />
                                </div>
                            </FieldCard>

                            <button
                                type="submit"
                                disabled={!canSubmit}
                                className={`w-full py-4 mt-2 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${canSubmit ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'bg-gray-100 text-gray-400'}`}
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : editingMatch ? 'Salvar Alterações' : 'Criar Partida'}
                                {!saving && <ArrowRight size={18} />}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Exclusão */}
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
                                    <h2 className="text-xl font-bold text-primary-text">Excluir Partida</h2>
                                    <p className="text-sm text-secondary-text">Esta ação não pode ser desfeita</p>
                                </div>
                            </div>

                            <div className="bg-brand-red/5 p-4 rounded-2xl border border-brand-red/10">
                                <p className="text-sm text-brand-red leading-relaxed">
                                    Você está prestes a excluir a partida <strong>{matchToDelete?.title || 'Pelada'}</strong>.
                                    Todas as inscrições e pagamentos confirmados serão <strong>removidos permanentemente</strong>.
                                </p>
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => { setIsDeleteModalOpen(false); setMatchToDelete(null) }}
                                    className="flex-1 py-4 text-sm font-bold text-secondary-text hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDelete}
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

            {/* Listagem */}
            {loadingMatches ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-gray-200" />
                </div>
            ) : loadError ? (
                <p className="text-sm text-brand-red text-center py-8">{loadError}</p>
            ) : matches.length === 0 ? (
                <div className="bg-gray-50/50 rounded-[32px] border border-dashed border-gray-200 py-16 flex flex-col items-center text-center gap-3">
                    <div className="size-16 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Calendar size={28} className="text-gray-300" />
                    </div>
                    <div>
                        <p className="font-bold text-primary-text">Bora marcar uma?</p>
                        <p className="text-xs text-secondary-text mt-1 max-w-[200px]">Crie sua primeira partida para começar a organizar o racha.</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {matches.map((match) => {
                        const badge = STATUS_LABEL[match.status]
                        return (
                            <div key={match.id} className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-primary-text leading-tight">{match.title || 'Pelada'}</h3>
                                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest mt-1.5 w-fit ${badge.className}`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => startEdit(match)}
                                            aria-label="Editar partida"
                                            className="size-9 rounded-xl bg-gray-50 text-secondary-text flex items-center justify-center hover:bg-brand-green/10 hover:text-brand-green transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => { setMatchToDelete(match); setIsDeleteModalOpen(true) }}
                                            aria-label="Excluir partida"
                                            className="size-9 rounded-xl bg-gray-50 text-secondary-text flex items-center justify-center hover:bg-brand-red/10 hover:text-brand-red transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 bg-gray-50/50 rounded-xl p-3 border border-gray-50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-secondary-text uppercase tracking-widest mb-1">Data</span>
                                        <span className="text-xs font-bold text-primary-text truncate">{formatDate(match.scheduledAt)}</span>
                                        <span className="text-[10px] text-secondary-text font-medium">{formatTime(match.scheduledAt)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-secondary-text uppercase tracking-widest mb-1">Vagas</span>
                                        <span className="text-xs font-bold text-primary-text">{match.maxPlayers}</span>
                                        <span className="text-[10px] text-secondary-text font-medium">jogadores</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold text-secondary-text uppercase tracking-widest mb-1">Taxa</span>
                                        <span className="text-xs font-bold text-primary-text">{formatCurrency(match.price)}</span>
                                        <span className="text-[10px] text-secondary-text font-medium">por pessoa</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

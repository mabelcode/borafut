import { createLogger } from '@/lib/logger'
import { useState, useEffect, useMemo } from 'react'
import {
    ArrowLeft, Calendar, Users, CircleDollarSign, CircleCheck,
    Clock, Loader2, AlertCircle, ShieldCheck, CheckCircle2,
    RefreshCw, X, Star
} from 'lucide-react'
import QRCodeSVG from 'react-qr-code'
import { QrCodePix } from 'qrcode-pix'
import { supabase } from '@/lib/supabase'
import { useMatchDetail, type Registration } from '@/hooks/useMatchDetail'
import type { Session } from '@supabase/supabase-js'
import { useDraftState } from '@/hooks/useDraftState'
import DraftBoard from '@/components/DraftBoard'
import { type DraftPlayer, getTeamColorConfig } from '@/lib/draft'
import EvaluationFlow from '@/components/EvaluationFlow'
import AddPlayerModal from '@/components/AddPlayerModal'
import { useMatchEvaluations } from '@/hooks/useMatchEvaluations'

const logger = createLogger('MatchDetail')

/* ── Helpers ─────────────────────────────────────────────────────── */

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
}
function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function formatCurrency(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const POSITION_LABEL: Record<string, string> = {
    GOALKEEPER: 'Goleiro',
    DEFENSE: 'Defesa',
    ATTACK: 'Ataque',
}

/* ── Pix QR Code ─────────────────────────────────────────────────── */

function PixQRCode({
    pixKey, amount, playerName, matchTitle,
}: {
    pixKey: string
    amount: number
    playerName: string
    matchTitle: string
}) {
    const payloadResult = useMemo(() => {
        try {
            const pix = QrCodePix({
                version: '01',
                key: pixKey,
                name: 'BoraFut',
                city: 'SAO PAULO',
                transactionId: playerName.replace(/\s+/g, '').slice(0, 25).toUpperCase(),
                message: `${matchTitle} - ${playerName}`.slice(0, 72),
                value: amount,
            })
            return { payload: pix.payload(), err: false }
        } catch {
            return { payload: null, err: true }
        }
    }, [pixKey, amount, playerName, matchTitle])

    if (payloadResult.err) {
        return (
            <p className="text-xs text-brand-red text-center">
                Erro ao gerar QR Code. Verifique a chave Pix do admin.
            </p>
        )
    }

    if (!payloadResult.payload) return <Loader2 size={20} className="animate-spin text-secondary-text mx-auto" />

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <QRCodeSVG value={payloadResult.payload} size={180} level="M" />
            </div>
            <p className="text-[11px] text-secondary-text text-center leading-relaxed max-w-[220px]">
                Escaneie com qualquer app de banco para pagar {formatCurrency(amount)} via Pix.
                Use seu nome como descrição para facilitar a identificação.
            </p>
            <p className="font-mono text-[10px] text-secondary-text break-all text-center px-2 select-all">
                Chave: {pixKey}
            </p>
        </div>
    )
}

/* ── Player row ──────────────────────────────────────────────────── */

function PlayerRow({
    reg, isMe, isAdmin, onConfirm,
}: {
    reg: Registration
    isMe: boolean
    isAdmin: boolean
    onConfirm?: (regId: string) => void
}) {
    const name = reg.users?.displayName ?? 'Jogador'
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    const position = reg.users?.mainPosition ? POSITION_LABEL[reg.users.mainPosition] : '—'
    const [confirming, setConfirming] = useState(false)

    const STATUS_CONFIG = {
        CONFIRMED: { label: 'Confirmado', className: 'text-brand-green bg-brand-green/10' },
        RESERVED: { label: 'Reservado', className: 'text-amber-600 bg-amber-50' },
        WAITLIST: { label: 'Fila', className: 'text-secondary-text bg-gray-100' },
    }
    const badge = STATUS_CONFIG[reg.status]

    async function handleConfirm() {
        setConfirming(true)
        await onConfirm?.(reg.id)
        setConfirming(false)
    }

    return (
        <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${isMe ? 'bg-brand-green/5 border border-brand-green/20' : 'hover:bg-gray-50'}`}>
            <div className="size-9 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-brand-green">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary-text truncate">
                    {name} {isMe && <span className="text-[10px] text-secondary-text font-normal">(você)</span>}
                </p>
                <p className="text-[11px] text-secondary-text">{position}</p>
            </div>
            {/* Admin confirm button OR status badge */}
            {isAdmin && reg.status === 'RESERVED' && onConfirm ? (
                <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="flex items-center gap-1 text-[11px] font-semibold text-brand-green bg-brand-green/10 hover:bg-brand-green hover:text-white px-2.5 py-1 rounded-full transition-all duration-150 active:scale-95 disabled:opacity-50 shrink-0"
                >
                    {confirming ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                    Confirmar
                </button>
            ) : (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                    {badge.label}
                </span>
            )}
        </div>
    )
}

/* ── CTA button (player only) ────────────────────────────────────── */

function CTAButton({
    matchId, matchTitle, myRegistration, confirmed, maxPlayers, session, pixKey, price, onAction,
}: {
    matchId: string
    matchTitle: string
    myRegistration: Registration | null
    confirmed: number
    maxPlayers: number
    session: Session
    pixKey: string | null
    price: number
    onAction: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const isFull = confirmed >= maxPlayers

    async function handleRegister(status: 'RESERVED' | 'WAITLIST') {
        setLoading(true)
        setError('')
        const { error } = await supabase.from('match_registrations').insert({
            matchId, userId: session.user.id, status,
        })
        setLoading(false)
        if (error) {
            logger.error('Erro ao inscrever jogador na partida', error)
            setError(error.message); return
        }
        onAction()
    }

    if (myRegistration?.status === 'CONFIRMED') {
        return (
            <div className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-green/10 text-brand-green font-semibold">
                <ShieldCheck size={18} /> Presença confirmada!
            </div>
        )
    }

    if (myRegistration?.status === 'RESERVED') {
        return (
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 text-amber-600 font-semibold text-sm border border-amber-100">
                    <Clock size={16} /> Vaga reservada — aguardando pagamento
                </div>
                {pixKey ? (
                    <PixQRCode
                        pixKey={pixKey}
                        amount={price}
                        playerName={session.user.user_metadata?.full_name ?? 'Jogador'}
                        matchTitle={matchTitle}
                    />
                ) : (
                    <p className="text-xs text-secondary-text text-center">
                        Admin ainda não cadastrou a chave Pix. Aguarde ou entre em contato.
                    </p>
                )}
            </div>
        )
    }

    if (myRegistration?.status === 'WAITLIST') {
        return (
            <div className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-100 text-secondary-text font-semibold text-sm">
                <AlertCircle size={16} /> Você está na fila de espera
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            {error && <p className="text-xs text-brand-red text-center animate-fade-in">{error}</p>}
            {isFull ? (
                <button
                    onClick={() => handleRegister('WAITLIST')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-100 text-secondary-text font-semibold text-sm hover:bg-gray-200 active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <AlertCircle size={16} />}
                    Entrar na fila de espera
                </button>
            ) : (
                <button
                    onClick={() => handleRegister('RESERVED')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-green text-white font-semibold text-base hover:brightness-105 active:scale-[0.97] transition-all duration-150 shadow-sm shadow-brand-green/20 disabled:opacity-50"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CircleCheck size={18} />}
                    {loading ? 'Reservando…' : 'Tô Dentro!'}
                </button>
            )}
        </div>
    )
}

/* ── Main ────────────────────────────────────────────────────────── */

interface Props {
    matchId: string
    session: Session
    isAdmin: boolean
    onBack: () => void
}

export default function MatchDetail({ matchId, session, isAdmin, onBack }: Props) {
    const { data, loading, error, refetch } = useMatchDetail(matchId)
    const [adminPixKey, setAdminPixKey] = useState<string | null>(null)
    const [pixLoaded, setPixLoaded] = useState(false)

    // Draft State
    const [isDrafting, setIsDrafting] = useState(false)
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
    const [savingDraft, setSavingDraft] = useState(false)

    // Evaluation State
    const [isEvaluationOpen, setIsEvaluationOpen] = useState(false)
    const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false)
    const { hasEvaluated: hasAlreadyEvaluated, fetchMyEvaluations } = useMatchEvaluations(matchId, session.user.id)

    // Fetch evaluations when match is closed/finished
    useEffect(() => {
        if (data && (data.status === 'CLOSED' || data.status === 'FINISHED') && data.myRegistration?.status === 'CONFIRMED') {
            fetchMyEvaluations()

            // Auto-open evaluation modal if ?evaluate=true is in URL
            const urlParams = new URLSearchParams(window.location.search)
            if (urlParams.get('evaluate') === 'true') {
                setIsEvaluationOpen(true)
                // Optionally clean up the URL to avoid reopening on refresh
                window.history.replaceState({}, '', window.location.pathname)
            }
        }
    }, [data?.status, data?.myRegistration?.status, fetchMyEvaluations])

    // Prepare players for the draft hook
    const confirmedPlayers: DraftPlayer[] = useMemo(() => {
        if (!data) return [];
        return data.registrations
            .filter(r => r.status === 'CONFIRMED')
            .map(r => ({
                id: r.id, // we map player ID to registration ID to easily update later
                name: r.users?.displayName || 'Jogador',
                position: (r.users?.mainPosition as 'GOALKEEPER' | 'DEFENSE' | 'ATTACK') || 'ATTACK',
                score: r.users?.globalScore || 3.0
            }))
    }, [data])

    // Number of default teams suggestion (e.g., 2 times se tiver 10 ou mais)
    const suggestedTeams = Math.max(2, Math.floor(confirmedPlayers.length / 5));

    const {
        numTeams, setNumTeams,
        teams, isDraftGenerated,
        generateDraft, selectedPlayer, handlePlayerClick
    } = useDraftState({ players: confirmedPlayers, initialNumTeams: suggestedTeams })

    // Fetch admin's pixKey once match data is available
    useEffect(() => {
        if (!data) return
        supabase
            .from('users')
            .select('pixKey')
            .eq('id', data.managerId)
            .single()
            .then(({ data: mgr }) => {
                setAdminPixKey(mgr?.pixKey ?? null)
                setPixLoaded(true)
            })
    }, [data?.managerId])

    async function handleConfirm(regId: string) {
        const { error } = await supabase.rpc('admin_confirm_payment', {
            p_registration_id: regId
        })
        if (error) logger.error('Erro ao confirmar pagamento (RPC)', error)
        refetch()
    }

    async function handleSaveDraft() {
        if (!isDraftGenerated) return;

        try {
            setSavingDraft(true);

            // Shape the data for the RPC
            // [{"registrationId": "id", "teamNumber": 1, "snapshotScore": 4.5, "snapshotPosition": "ATTACK"}, ...]
            const draftData = teams.flatMap(team => team.players.map(p => ({
                registrationId: p.id,
                teamNumber: team.id,
                snapshotScore: p.score,
                snapshotPosition: p.position
            })));

            const { error } = await supabase.rpc('admin_save_draft', {
                p_match_id: matchId,
                p_draft_data: draftData
            });

            if (error) throw error;

            logger.info('Times do sorteio salvos e partida fechada', { matchId });
            setIsDrafting(false);
            refetch();

        } catch (err) {
            logger.error('Erro ao salvar sorteio', err);
        } finally {
            setSavingDraft(false);
        }
    }

    if (loading || (data && !pixLoaded)) {
        return (
            <div className="flex flex-col gap-6 animate-fade-in">
                <button onClick={onBack} className="size-9 rounded-xl bg-surface border border-gray-200 flex items-center justify-center text-secondary-text shadow-sm">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-secondary-text" />
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="flex flex-col gap-4 animate-fade-in">
                <button onClick={onBack} className="size-9 rounded-xl bg-surface border border-gray-200 flex items-center justify-center text-secondary-text shadow-sm">
                    <ArrowLeft size={18} />
                </button>
                <p className="text-sm text-brand-red text-center py-8">{error ?? 'Partida não encontrada.'}</p>
            </div>
        )
    }

    const confirmed = data.registrations.filter(r => r.status === 'CONFIRMED').length
    const reserved = data.registrations.filter(r => r.status === 'RESERVED').length
    const waitlist = data.registrations.filter(r => r.status === 'WAITLIST').length
    const spotsLeft = Math.max(0, data.maxPlayers - confirmed - reserved)
    const progressPct = Math.min(100, Math.round(((confirmed + reserved) / data.maxPlayers) * 100))
    const pendingReserved = data.registrations.filter(r => r.status === 'RESERVED')

    return (
        <div className="flex flex-col gap-5 animate-fade-in px-6 py-4">
            {/* Header */}
            <header className="flex items-center gap-4 mt-2 mb-1">
                <button
                    onClick={onBack}
                    className="size-10 rounded-2xl bg-surface border border-gray-100 flex items-center justify-center text-secondary-text hover:text-primary-text hover:border-gray-200 transition-all duration-150 active:scale-95 shadow-sm shrink-0"
                    aria-label="Voltar"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="min-w-0">
                    <h1 className="text-xl font-bold text-primary-text leading-tight truncate">
                        {data.title || 'Partida'}
                    </h1>
                    <p className="text-xs text-secondary-text font-medium capitalize opacity-80">{formatDate(data.scheduledAt)}</p>
                </div>
            </header>

            {/* Config Modal for generating draft */}
            {isConfigModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface w-full max-w-sm rounded-t-[32px] sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-primary-text">Sortear Times</h3>
                                <p className="text-xs text-secondary-text mt-1">Configuração do Draft</p>
                            </div>
                            <button onClick={() => setIsConfigModalOpen(false)} className="p-2 bg-gray-50 rounded-full text-secondary-text">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-primary-text">Quantidade de Times</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="10"
                                    value={numTeams}
                                    onChange={(e) => setNumTeams(Number(e.target.value))}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-bold focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                                />
                                <span className="text-xs text-secondary-text mt-1">
                                    Média sugerida: ~{(confirmedPlayers.length / numTeams).toFixed(1)} jogadores por time
                                </span>
                            </div>

                            <button
                                onClick={() => {
                                    setIsConfigModalOpen(false);
                                    setIsDrafting(true);
                                    generateDraft(numTeams);
                                }}
                                className="w-full py-4 rounded-2xl bg-brand-green text-white font-bold text-sm shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all"
                            >
                                <RefreshCw size={18} />
                                GERAR TIMES
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* If Drafting, show Draft Board completely taking over the space */}
            {isDrafting ? (
                <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300 pb-20">
                    <div className="flex items-center justify-between bg-surface rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex flex-col">
                            <h2 className="text-sm font-bold text-primary-text uppercase tracking-widest">Mesa de Sorteio</h2>
                            <span className="text-xs text-secondary-text">{numTeams} times · {confirmedPlayers.length} confirmados</span>
                        </div>
                        <button
                            onClick={() => { setIsDrafting(false); generateDraft(); /* reset */ }}
                            className="bg-gray-50 text-secondary-text px-3 py-2 rounded-xl text-[10px] font-bold border border-gray-100 uppercase tracking-widest hover:bg-gray-100"
                        >
                            Cancelar
                        </button>
                    </div>

                    <DraftBoard
                        teams={teams}
                        selectedPlayer={selectedPlayer}
                        onPlayerClick={handlePlayerClick}
                    />

                    <button
                        onClick={handleSaveDraft}
                        disabled={savingDraft || !isDraftGenerated}
                        className="fixed bottom-6 left-6 right-6 sm:relative sm:bottom-0 sm:inset-auto z-50 w-auto sm:w-full py-4 rounded-2xl bg-brand-green text-white font-bold text-sm shadow-xl shadow-brand-green/30 flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {savingDraft ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        {savingDraft ? 'Salvando Definitivo...' : 'SALVAR E FECHAR PARTIDA'}
                    </button>
                </div>
            ) : (
                <>
                    {/* Info card */}
                    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 text-secondary-text">
                                    <Calendar size={12} /><span className="text-[10px] font-medium uppercase tracking-wide">Horário</span>
                                </div>
                                <span className="text-sm font-bold text-primary-text">{formatTime(data.scheduledAt)}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 text-secondary-text">
                                    <Users size={12} /><span className="text-[10px] font-medium uppercase tracking-wide">Vagas</span>
                                </div>
                                <span className="text-sm font-bold text-primary-text">
                                    {confirmed}<span className="text-secondary-text font-normal">/{data.maxPlayers}</span>
                                </span>
                                {spotsLeft > 0
                                    ? <span className="text-[10px] text-brand-green font-medium">{spotsLeft} disponíveis</span>
                                    : <span className="text-[10px] text-brand-red font-medium">Lotado</span>
                                }
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 text-secondary-text">
                                    <CircleDollarSign size={12} /><span className="text-[10px] font-medium uppercase tracking-wide">Taxa</span>
                                </div>
                                <span className="text-sm font-bold text-primary-text">{formatCurrency(data.price)}</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-green rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-secondary-text">
                                <span>{confirmed} confirmados · {reserved} reservados{waitlist > 0 ? ` · ${waitlist} na fila` : ''}</span>
                                <span>{progressPct}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Admin Actions: Sortear Teams */}
                    {isAdmin && data.status === 'OPEN' && (
                        <div className="bg-brand-green/5 border border-brand-green/10 rounded-2xl p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <h3 className="text-sm font-bold text-brand-green uppercase tracking-widest">Painel de Sorteio</h3>
                                    <p className="text-[10px] text-brand-green/70">Atualmente os times não foram definidos</p>
                                </div>
                                <ShieldCheck size={28} className="text-brand-green/20" />
                            </div>
                            <button
                                onClick={() => setIsConfigModalOpen(true)}
                                disabled={confirmedPlayers.length < 2}
                                className="w-full py-3.5 bg-brand-green text-white font-bold rounded-xl shadow-lg shadow-brand-green/20 text-sm flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={18} />
                                CONFIGURAR E SORTEAR TIMES
                            </button>
                            {confirmedPlayers.length < 2 && (
                                <p className="text-[10px] text-amber-600 text-center uppercase tracking-wide">
                                    Necessário ao menos 2 jogadores confirmados para sortear.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Admin: Add Player to OPEN match */}
                    {isAdmin && data.status === 'OPEN' && (
                        <button
                            onClick={() => setIsAddPlayerOpen(true)}
                            className="w-full py-3 rounded-2xl border-2 border-dashed border-brand-green/30 text-brand-green font-semibold text-sm flex items-center justify-center gap-2 hover:bg-brand-green/5 hover:border-brand-green/50 active:scale-[0.98] transition-all"
                        >
                            <Users size={16} />
                            + Adicionar Jogador
                        </button>
                    )}

                    {/* Admin: pending confirmations */}
                    {isAdmin && pendingReserved.length > 0 && (
                        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 flex flex-col gap-2">
                            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                Aguardando confirmação ({pendingReserved.length})
                            </h2>
                            {pendingReserved.map(reg => (
                                <PlayerRow
                                    key={reg.id}
                                    reg={reg}
                                    isMe={reg.userId === session.user.id}
                                    isAdmin={isAdmin}
                                    onConfirm={handleConfirm}
                                />
                            ))}
                        </div>
                    )}

                    {/* Player CTA — shown to everyone, including admins */}
                    {data.status === 'OPEN' && (
                        <CTAButton
                            matchId={data.id}
                            matchTitle={data.title ?? 'Partida'}
                            myRegistration={data.myRegistration}
                            confirmed={confirmed + reserved}
                            maxPlayers={data.maxPlayers}
                            session={session}
                            pixKey={adminPixKey}
                            price={data.price}
                            onAction={refetch}
                        />
                    )}

                    {/* Evaluation CTA */}
                    {(data.status === 'CLOSED' || data.status === 'FINISHED') && data.myRegistration?.status === 'CONFIRMED' && (
                        <button
                            onClick={() => setIsEvaluationOpen(true)}
                            className={`w-full py-4 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all mb-4 ${hasAlreadyEvaluated
                                ? 'bg-surface border border-brand-green text-brand-green shadow-brand-green/10'
                                : 'bg-brand-green text-white shadow-brand-green/30'
                                }`}
                        >
                            <Star size={18} className="fill-current" />
                            {hasAlreadyEvaluated ? 'EDITAR AVALIAÇÕES' : 'AVALIAR JOGADORES'}
                        </button>
                    )}

                    {/* All players or Teams based on status */}
                    {(data.status === 'CLOSED' || data.status === 'FINISHED') && data.registrations.some(r => r.teamNumber) ? (
                        <div className="flex flex-col gap-4 pb-16">
                            <h2 className="text-sm font-bold text-primary-text uppercase tracking-widest mt-2">
                                Times Definidos
                            </h2>
                            {/* Grouping logic right in the render for simplicity */}
                            {Array.from(new Set(data.registrations.filter(r => r.teamNumber).map(r => r.teamNumber))).sort().map((teamNum, idx) => {
                                const teamRegs = data.registrations.filter(r => r.teamNumber === teamNum);
                                const isMyTeam = teamRegs.some(r => r.userId === session.user.id);
                                const colorConfig = getTeamColorConfig(idx);
                                return (
                                    <div key={`team-${teamNum}`} className={`bg-surface rounded-2xl border ${isMyTeam ? 'border-brand-green shadow-sm shadow-brand-green/10' : 'border-gray-100 shadow-sm'} overflow-hidden`}>
                                        <div className={`px-4 py-2.5 flex items-center justify-between border-b border-gray-100 ${isMyTeam ? 'bg-brand-green/5' : 'bg-gray-50'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`size-3.5 rounded-sm border shadow-sm ${colorConfig.bgClass} ${colorConfig.borderClass}`} title={colorConfig.name} />
                                                <h3 className={`font-bold uppercase tracking-widest text-xs ${isMyTeam ? 'text-brand-green' : 'text-secondary-text'}`}>
                                                    Time {teamNum}
                                                </h3>
                                            </div>
                                            <div className="text-[10px] font-semibold text-secondary-text">
                                                {teamRegs.length} jogadores
                                            </div>
                                        </div>
                                        <div className="flex flex-col p-2 gap-1">
                                            {teamRegs.map(reg => (
                                                <PlayerRow
                                                    key={reg.id}
                                                    reg={reg}
                                                    isMe={reg.userId === session.user.id}
                                                    isAdmin={isAdmin}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (data.registrations.length > 0 && (
                        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1 pb-16">
                            <h2 className="text-xs font-semibold text-secondary-text uppercase tracking-wide mb-2">
                                Jogadores ({data.registrations.length})
                            </h2>
                            {data.registrations.map(reg => (
                                <PlayerRow
                                    key={reg.id}
                                    reg={reg}
                                    isMe={reg.userId === session.user.id}
                                    isAdmin={isAdmin}
                                    onConfirm={isAdmin ? handleConfirm : undefined}
                                />
                            ))}
                        </div>
                    ))}
                </>
            )}

            {isEvaluationOpen && data && (
                <EvaluationFlow
                    matchId={matchId}
                    currentUserId={session.user.id}
                    confirmedRegistrations={data.registrations.filter(r => r.status === 'CONFIRMED')}
                    onClose={() => setIsEvaluationOpen(false)}
                    onSuccess={() => fetchMyEvaluations()}
                />
            )}

            {isAddPlayerOpen && data && (
                <AddPlayerModal
                    matchId={matchId}
                    groupId={data.groupId}
                    existingRegistrations={data.registrations}
                    onClose={() => setIsAddPlayerOpen(false)}
                    onPlayerAdded={refetch}
                />
            )}
        </div>
    )
}

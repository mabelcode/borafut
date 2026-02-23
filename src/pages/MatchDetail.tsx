import * as Sentry from '@sentry/react'
import { useState, useEffect } from 'react'
import {
    ArrowLeft, Calendar, Users, CircleDollarSign, CircleCheck,
    Clock, Loader2, AlertCircle, ShieldCheck, CheckCircle2
} from 'lucide-react'
import QRCodeSVG from 'react-qr-code'
import { QrCodePix } from 'qrcode-pix'
import { supabase } from '@/lib/supabase'
import { useMatchDetail, type Registration } from '@/hooks/useMatchDetail'
import type { Session } from '@supabase/supabase-js'

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
    const [payload, setPayload] = useState<string | null>(null)
    const [err, setErr] = useState(false)

    // Generate payload on mount
    useEffect(() => {
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
            setPayload(pix.payload())
        } catch {
            setErr(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (err) {
        return (
            <p className="text-xs text-brand-red text-center">
                Erro ao gerar QR Code. Verifique a chave Pix do admin.
            </p>
        )
    }

    if (!payload) return <Loader2 size={20} className="animate-spin text-secondary-text mx-auto" />

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <QRCodeSVG value={payload} size={180} level="M" />
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
            Sentry.captureException(error, { tags: { context: 'MatchDetail.register', status } })
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
        const { error } = await supabase
            .from('match_registrations')
            .update({ status: 'CONFIRMED' })
            .eq('id', regId)
        if (error) Sentry.captureException(error, { tags: { context: 'MatchDetail.confirmPayment' } })
        refetch()
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
        <div className="flex flex-col gap-5 animate-fade-in">
            {/* Header */}
            <header className="flex items-center gap-3 pt-2">
                <button
                    onClick={onBack}
                    className="size-9 rounded-xl bg-surface border border-gray-200 flex items-center justify-center text-secondary-text hover:text-primary-text hover:border-gray-300 transition-all duration-150 active:scale-95 shadow-sm shrink-0"
                    aria-label="Voltar"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                    <h1 className="text-lg font-bold text-primary-text leading-tight truncate">
                        {data.title || 'Partida'}
                    </h1>
                    <p className="text-xs text-secondary-text capitalize">{formatDate(data.scheduledAt)}</p>
                </div>
            </header>

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
                            {confirmed + reserved}<span className="text-secondary-text font-normal">/{data.maxPlayers}</span>
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

            {/* All players */}
            {data.registrations.length > 0 && (
                <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
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
            )}
        </div>
    )
}

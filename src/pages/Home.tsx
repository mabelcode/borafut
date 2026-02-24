import { Calendar, Users, CircleDollarSign, Plus, ChevronRight, Loader2, Clock, ShieldCheck, AlertCircle, Settings } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMatches, type Match } from '@/hooks/useMatches'
import { useMyRegistrations, type MyRegistrationsMap } from '@/hooks/useMyRegistrations'

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

const STATUS_LABEL: Record<Match['status'], { label: string; className: string }> = {
    OPEN: { label: 'Aberta', className: 'bg-brand-green/10 text-brand-green' },
    CLOSED: { label: 'Fechada', className: 'bg-gray-100 text-secondary-text' },
    FINISHED: { label: 'Encerrada', className: 'bg-gray-100 text-secondary-text' },
}

/* ── Match Card ──────────────────────────────────────────────────── */

function MatchCard({
    match, myStatus, onSelect,
}: {
    match: Match
    myStatus: MyRegistrationsMap[string] | undefined
    onSelect: () => void
}) {
    const badge = STATUS_LABEL[match.status]

    const MY_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
        CONFIRMED: { label: 'Confirmado ✓', className: 'bg-brand-green text-white' },
        RESERVED: { label: 'Aguardando pagamento', className: 'bg-amber-50 text-amber-600 border border-amber-100' },
        WAITLIST: { label: 'Na fila de espera', className: 'bg-gray-100 text-secondary-text' },
    }
    const myBadge = myStatus ? MY_STATUS_CONFIG[myStatus] : null

    return (
        <div
            onClick={onSelect}
            className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform duration-100 cursor-pointer"
        >
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-primary-text leading-tight">
                    {match.title || 'Partida sem título'}
                </h3>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                    {badge.label}
                </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-secondary-text">
                        <Calendar size={12} />
                        <span className="text-[10px] font-medium uppercase tracking-wide">Data</span>
                    </div>
                    <span className="text-sm font-semibold text-primary-text capitalize">
                        {formatDate(match.scheduledAt)}
                    </span>
                    <span className="text-xs text-secondary-text">{formatTime(match.scheduledAt)}</span>
                </div>

                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-secondary-text">
                        <Users size={12} />
                        <span className="text-[10px] font-medium uppercase tracking-wide">Vagas</span>
                    </div>
                    <span className="text-sm font-semibold text-primary-text">{match.maxPlayers}</span>
                    <span className="text-xs text-secondary-text">jogadores</span>
                </div>

                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-secondary-text">
                        <CircleDollarSign size={12} />
                        <span className="text-[10px] font-medium uppercase tracking-wide">Taxa</span>
                    </div>
                    <span className="text-sm font-semibold text-primary-text">
                        {formatCurrency(match.price)}
                    </span>
                    <span className="text-xs text-secondary-text">por jogador</span>
                </div>
            </div>

            {match.status === 'OPEN' && (
                myBadge ? (
                    <div className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold ${myBadge.className}`}>
                        {myStatus === 'CONFIRMED' && <ShieldCheck size={15} />}
                        {myStatus === 'RESERVED' && <Clock size={15} />}
                        {myStatus === 'WAITLIST' && <AlertCircle size={15} />}
                        {myBadge.label}
                    </div>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect() }}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-green text-white text-sm font-semibold hover:brightness-105 active:scale-[0.97] transition-all duration-150 shadow-sm shadow-brand-green/20"
                    >
                        Tô Dentro
                        <ChevronRight size={16} />
                    </button>
                )
            )}
        </div>
    )
}

/* ── Empty state ─────────────────────────────────────────────────── */

function EmptyState() {
    return (
        <div className="flex flex-col items-center text-center gap-3 py-16">
            <span className="text-5xl">🏟️</span>
            <p className="font-semibold text-primary-text">Nenhuma partida por aqui</p>
            <p className="text-sm text-secondary-text leading-relaxed max-w-[220px]">
                Aguarde o gerente criar uma partida ou peça para ser adicionado ao grupo.
            </p>
        </div>
    )
}

/* ── Home ────────────────────────────────────────────────────────── */

interface Props {
    onCreateMatch: () => void
    onSelectMatch: (matchId: string) => void
    onSettings: () => void
}

export default function Home({ onCreateMatch, onSelectMatch, onSettings }: Props) {
    const { isAdminInAnyGroup } = useCurrentUser()
    const { matches, loading, error } = useMatches()
    const { data: myRegistrations } = useMyRegistrations()

    return (
        <>
            <div className="flex flex-col gap-6 animate-fade-in">
                {/* Section title */}
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-primary-text">Partidas</h2>
                    {isAdminInAnyGroup && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-full">
                                Admin
                            </span>
                            <button
                                onClick={onSettings}
                                className="size-7 flex items-center justify-center rounded-lg text-secondary-text hover:text-primary-text hover:bg-gray-100 transition-colors duration-150"
                                aria-label="Configurações"
                            >
                                <Settings size={15} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Match list */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-secondary-text" />
                    </div>
                ) : error ? (
                    <p className="text-sm text-brand-red text-center py-8">{error}</p>
                ) : matches.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="flex flex-col gap-3">
                        {matches.map((match) => (
                            <MatchCard
                                key={match.id}
                                match={match}
                                myStatus={myRegistrations[match.id]}
                                onSelect={() => onSelectMatch(match.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {isAdminInAnyGroup && (
                <div className="group fixed bottom-6 right-6 flex flex-col items-end gap-2 z-50">
                    <span className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-150 pointer-events-none bg-primary-text text-white text-xs font-medium px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap">
                        Nova Partida
                    </span>
                    <button
                        onClick={onCreateMatch}
                        className="size-14 rounded-full bg-brand-green text-white shadow-lg shadow-brand-green/30 flex items-center justify-center hover:brightness-105 active:scale-95 transition-all duration-150"
                        aria-label="Criar partida"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            )}
        </>
    )
}

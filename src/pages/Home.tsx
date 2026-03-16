import { useMemo, useState } from 'react'
import { Calendar, Users, CircleDollarSign, Plus, ChevronRight, ChevronDown, Loader2, Clock, ShieldCheck, AlertCircle, Settings, CheckCircle2, Zap, ClipboardList } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMatches, type Match } from '@/hooks/useMatches'
import { useMyRegistrations, type MyRegistrationsMap } from '@/hooks/useMyRegistrations'
import { useMyEvaluatedMatches } from '@/hooks/useMyEvaluatedMatches'
import GroupSelector from '@/components/GroupSelector'

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

function getRelativeTime(iso: string): string {
    const now = new Date()
    const target = new Date(iso)
    const diffMs = target.getTime() - now.getTime()

    if (diffMs < 0) return 'já passou'

    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return diffMins <= 1 ? 'agora' : `em ${diffMins} min`
    if (diffHours < 24) return diffHours === 1 ? 'em 1 hora' : `em ${diffHours}h`
    if (diffDays === 1) return 'amanhã'
    if (diffDays < 7) return `em ${diffDays} dias`
    if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        return weeks === 1 ? 'em 1 semana' : `em ${weeks} semanas`
    }
    return `em ${Math.floor(diffDays / 30)} mês(es)`
}

const STATUS_LABEL: Record<Match['status'], { label: string; className: string }> = {
    OPEN: { label: 'Aberta', className: 'bg-brand-green/10 text-brand-green' },
    CLOSED: { label: 'Fechada', className: 'bg-gray-100 text-secondary-text' },
    FINISHED: { label: 'Encerrada', className: 'bg-gray-100 text-secondary-text' },
}

const COLLAPSED_PAST_COUNT = 3

/* ── Section Header ──────────────────────────────────────────────── */

function SectionHeader({ icon, title, count, accent }: {
    icon: React.ReactNode
    title: string
    count: number
    accent: 'green' | 'gray'
}) {
    const accentStyles = accent === 'green'
        ? 'text-brand-green bg-brand-green/5 border-brand-green/15'
        : 'text-secondary-text bg-gray-50 border-gray-200/60'

    return (
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${accentStyles}`}>
            {icon}
            <span className="text-sm font-bold tracking-tight">{title}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${accent === 'green' ? 'bg-brand-green/10' : 'bg-gray-100'}`}>
                {count}
            </span>
        </div>
    )
}

/* ── Match Card ──────────────────────────────────────────────────── */

function MatchCard({
    match, myStatus, hasEvaluated, variant, onSelect, onEvaluate, groupName, showGroupBadge
}: {
    match: Match
    myStatus: MyRegistrationsMap[string] | undefined
    hasEvaluated: boolean
    variant: 'upcoming' | 'past'
    onSelect: () => void
    onEvaluate?: () => void
    groupName?: string
    showGroupBadge?: boolean
}) {
    const badge = STATUS_LABEL[match.status]
    const isUpcoming = variant === 'upcoming'

    const MY_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
        CONFIRMED: { label: 'Confirmado ✓', className: 'bg-brand-green text-white' },
        RESERVED: { label: 'Aguardando pagamento', className: 'bg-amber-50 text-amber-600 border border-amber-100' },
        WAITLIST: { label: 'Na fila de espera', className: 'bg-gray-100 text-secondary-text' },
    }
    const myBadge = myStatus ? MY_STATUS_CONFIG[myStatus] : null

    return (
        <div
            onClick={onSelect}
            className={`bg-surface rounded-2xl border shadow-sm p-4 flex flex-col gap-3 active:scale-[0.98] transition-all duration-150 cursor-pointer ${isUpcoming
                    ? 'border-l-[3px] border-l-brand-green border-t-gray-100 border-r-gray-100 border-b-gray-100'
                    : 'border-gray-100'
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                    <h3 className="font-semibold text-primary-text leading-tight">
                        {match.title || 'Partida sem título'}
                    </h3>
                    {showGroupBadge && groupName && (
                        <span className="text-[10px] font-semibold text-secondary-text mt-0.5 flex items-center gap-1">
                            <span className="text-[8px]">⚽</span> {groupName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isUpcoming && (
                        <span className="text-[11px] font-semibold text-brand-green">
                            {getRelativeTime(match.scheduledAt)}
                        </span>
                    )}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>
                        {badge.label}
                    </span>
                </div>
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

            {/* Evaluation CTA for Closed/Finished Matches */}
            {(match.status === 'CLOSED' || match.status === 'FINISHED') && myStatus === 'CONFIRMED' && (
                hasEvaluated ? (
                    <div className="w-full mt-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-brand-green/5 border border-brand-green/20 text-brand-green cursor-default">
                        <CheckCircle2 size={16} />
                        Avaliações Enviadas
                    </div>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onEvaluate) onEvaluate();
                            else onSelect();
                        }}
                        className="w-full mt-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold bg-brand-green text-white shadow-sm shadow-brand-green/30 hover:brightness-105 active:scale-[0.97] transition-all duration-150 animate-in fade-in zoom-in-95"
                    >
                        <span className="text-base">⭐</span>
                        Avaliar Jogadores
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
    const { isAdminInAnyGroup, groups } = useCurrentUser()
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
    const { matches, loading, error } = useMatches(selectedGroupId ?? undefined)
    const { data: myRegistrations } = useMyRegistrations()
    const { evaluatedMatchIds } = useMyEvaluatedMatches()
    const [showAllPast, setShowAllPast] = useState(false)

    // Build groupId → groupName lookup
    const groupNameMap = useMemo(() => {
        const map: Record<string, string> = {}
        for (const g of groups) map[g.groupId] = g.groupName
        return map
    }, [groups])
    const showGroupBadge = groups.length > 1

    const { upcomingMatches, pastMatches } = useMemo(() => {
        const upcoming: Match[] = []
        const past: Match[] = []

        for (const match of matches) {
            if (match.status === 'OPEN') {
                upcoming.push(match)
            } else {
                past.push(match)
            }
        }

        // Upcoming: nearest first (ASC)
        upcoming.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        // Past: most recent first (DESC)
        past.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

        return { upcomingMatches: upcoming, pastMatches: past }
    }, [matches])

    const visiblePastMatches = showAllPast
        ? pastMatches
        : pastMatches.slice(0, COLLAPSED_PAST_COUNT)
    const hiddenPastCount = pastMatches.length - COLLAPSED_PAST_COUNT

    const handleEvaluate = (matchId: string) => {
        const params = new URLSearchParams(window.location.search)
        params.set('evaluate', 'true')
        window.history.pushState({}, '', '?' + params.toString())
        onSelectMatch(matchId)
    }

    return (
        <>
            <div className="flex flex-col gap-6 animate-fade-in px-6 py-4">
                {/* Section title */}
                <div className="flex items-center justify-between mt-2">
                    <h2 className="text-lg font-bold text-primary-text">Partidas</h2>
                    {isAdminInAnyGroup && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-green/10 text-brand-green px-2.5 py-1 rounded-full border border-brand-green/20">
                                Admin
                            </span>
                            <button
                                onClick={onSettings}
                                className="size-8 flex items-center justify-center rounded-xl text-secondary-text hover:text-primary-text hover:bg-gray-100 active:scale-90 transition-all duration-150"
                                aria-label="Painel do Admin"
                            >
                                <Settings size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Group Selector */}
                {groups.length > 0 && (
                    <GroupSelector
                        groups={groups}
                        selectedGroupId={selectedGroupId}
                        onChange={setSelectedGroupId}
                        showAllOption={true}
                    />
                )}

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
                    <div className="flex flex-col gap-5">
                        {/* ── Upcoming Section ── */}
                        {upcomingMatches.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <SectionHeader
                                    icon={<Zap size={14} />}
                                    title="Próximas"
                                    count={upcomingMatches.length}
                                    accent="green"
                                />
                                {upcomingMatches.map((match) => (
                                    <MatchCard
                                        key={match.id}
                                        match={match}
                                        myStatus={myRegistrations[match.id]}
                                        hasEvaluated={evaluatedMatchIds.has(match.id)}
                                        variant="upcoming"
                                        onSelect={() => onSelectMatch(match.id)}
                                        onEvaluate={() => handleEvaluate(match.id)}
                                        groupName={groupNameMap[match.groupId]}
                                        showGroupBadge={showGroupBadge}
                                    />
                                ))}
                            </div>
                        )}

                        {/* ── Past Section ── */}
                        {pastMatches.length > 0 && (
                            <div className="flex flex-col gap-3">
                                <SectionHeader
                                    icon={<ClipboardList size={14} />}
                                    title="Encerradas"
                                    count={pastMatches.length}
                                    accent="gray"
                                />
                                {visiblePastMatches.map((match) => (
                                    <MatchCard
                                        key={match.id}
                                        match={match}
                                        myStatus={myRegistrations[match.id]}
                                        hasEvaluated={evaluatedMatchIds.has(match.id)}
                                        variant="past"
                                        onSelect={() => onSelectMatch(match.id)}
                                        onEvaluate={() => handleEvaluate(match.id)}
                                        groupName={groupNameMap[match.groupId]}
                                        showGroupBadge={showGroupBadge}
                                    />
                                ))}

                                {/* Show more / Show less toggle */}
                                {hiddenPastCount > 0 && (
                                    <button
                                        onClick={() => setShowAllPast(!showAllPast)}
                                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-secondary-text bg-gray-50 hover:bg-gray-100 active:scale-[0.97] transition-all duration-150 border border-gray-100"
                                    >
                                        <ChevronDown
                                            size={16}
                                            className={`transition-transform duration-200 ${showAllPast ? 'rotate-180' : ''}`}
                                        />
                                        {showAllPast ? 'Mostrar menos' : `Ver mais ${hiddenPastCount} partida${hiddenPastCount > 1 ? 's' : ''}`}
                                    </button>
                                )}
                            </div>
                        )}
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

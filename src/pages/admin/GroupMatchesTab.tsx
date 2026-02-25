import { Calendar, Users, CircleDollarSign, Loader2 } from 'lucide-react'
import { useMatches, type Match } from '@/hooks/useMatches'

interface Props {
    groupId: string
}

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

export default function GroupMatchesTab({ groupId }: Props) {
    const { matches, loading, error } = useMatches(groupId)

    return (
        <div className="p-4 flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-primary-text uppercase tracking-widest">Suas Partidas</h2>
                <span className="text-[10px] font-bold text-secondary-text bg-gray-100 px-2 py-0.5 rounded-full">
                    {matches.length} Total
                </span>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-secondary-text" />
                </div>
            ) : error ? (
                <p className="text-sm text-brand-red text-center py-8">{error}</p>
            ) : matches.length === 0 ? (
                <div className="flex flex-col items-center text-center gap-3 py-16">
                    <span className="text-5xl">🏟️</span>
                    <p className="font-semibold text-primary-text">Nenhuma partida</p>
                    <p className="text-sm text-secondary-text leading-relaxed max-w-[220px]">
                        Você ainda não criou nenhuma partida para este grupo.
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {matches.map((match) => {
                        const badge = STATUS_LABEL[match.status]
                        return (
                            <div
                                key={match.id}
                                className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold text-primary-text leading-tight">
                                        {match.title || 'Partida sem título'}
                                    </h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-tighter ${badge.className}`}>
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
                                        <span className="text-xs text-secondary-text font-medium">{formatTime(match.scheduledAt)}</span>
                                    </div>

                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1 text-secondary-text">
                                            <Users size={12} />
                                            <span className="text-[10px] font-medium uppercase tracking-wide">Vagas</span>
                                        </div>
                                        <span className="text-sm font-semibold text-primary-text">{match.maxPlayers}</span>
                                        <span className="text-xs text-secondary-text font-medium">jogadores</span>
                                    </div>

                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1 text-secondary-text">
                                            <CircleDollarSign size={12} />
                                            <span className="text-[10px] font-medium uppercase tracking-wide">Taxa</span>
                                        </div>
                                        <span className="text-sm font-semibold text-primary-text">
                                            {formatCurrency(match.price)}
                                        </span>
                                        <span className="text-xs text-secondary-text font-medium">p/ pessoa</span>
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

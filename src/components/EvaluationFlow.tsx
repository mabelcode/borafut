import { useState, useEffect, useCallback, useMemo } from 'react'
import { X, Star, Loader2, Info, CheckCircle2 } from 'lucide-react'
import { useMatchEvaluations, type EvaluationInput } from '@/hooks/useMatchEvaluations'
import type { Registration } from '@/hooks/useMatchDetail'

interface Props {
    matchId: string
    currentUserId: string
    confirmedRegistrations: Registration[]
    onClose: () => void
    onSuccess?: () => void
}

export default function EvaluationFlow({ matchId, currentUserId, confirmedRegistrations, onClose, onSuccess }: Props) {
    const { ratingsMap, loading, submitting, submitted, error, fetchMyEvaluations, submitEvaluations } = useMatchEvaluations(matchId, currentUserId)

    // User edits override server data
    const [userEdits, setUserEdits] = useState<Record<string, number>>({})
    const [showSuccess, setShowSuccess] = useState(false)

    const playersToEvaluate = confirmedRegistrations.filter(r => r.userId !== currentUserId)

    // Merge: user edits take precedence over server prefilled data
    const mergedRatings = useMemo(
        () => ({ ...ratingsMap, ...userEdits }),
        [ratingsMap, userEdits]
    )

    useEffect(() => {
        fetchMyEvaluations()
    }, [fetchMyEvaluations])

    const handleStarClick = useCallback((playerId: string, star: number) => {
        setUserEdits(prev => ({ ...prev, [playerId]: star }))
    }, [])

    const handleSubmit = async () => {
        const payload: EvaluationInput[] = []
        for (const [evaluatedId, scoreGiven] of Object.entries(mergedRatings)) {
            if (scoreGiven >= 1 && scoreGiven <= 5) {
                payload.push({ evaluatedId, scoreGiven })
            }
        }

        if (payload.length === 0) {
            onClose()
            return
        }

        const success = await submitEvaluations(payload)
        if (success) {
            setShowSuccess(true)
            onSuccess?.()
            setTimeout(() => onClose(), 1500)
        }
    }

    const ratedCount = Object.keys(mergedRatings).length
    const allRated = playersToEvaluate.length > 0 &&
        playersToEvaluate.every(p => mergedRatings[p.userId] >= 1 && mergedRatings[p.userId] <= 5)

    // Show success feedback screen
    if (showSuccess || submitted) {
        return (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-surface w-full max-w-md rounded-t-[32px] sm:rounded-3xl flex flex-col items-center justify-center shadow-2xl animate-in slide-in-from-bottom duration-300 p-12 gap-4">
                    <div className="size-16 rounded-full bg-brand-green/10 flex items-center justify-center">
                        <CheckCircle2 size={32} className="text-brand-green" />
                    </div>
                    <h3 className="text-lg font-bold text-primary-text">Avaliações salvas!</h3>
                    <p className="text-sm text-secondary-text text-center">As notas dos jogadores foram atualizadas automaticamente.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface w-full max-w-md rounded-t-[32px] sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-primary-text">Avaliar Jogadores</h3>
                        <p className="text-xs text-secondary-text mt-1">Como foi o desempenho do time?</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-secondary-text hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 size={24} className="animate-spin text-secondary-text" />
                        </div>
                    ) : playersToEvaluate.length === 0 ? (
                        <div className="bg-gray-50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center border border-gray-100">
                            <Info size={24} className="text-secondary-text" />
                            <p className="text-sm text-secondary-text">Nenhum outro jogador confirmado nesta partida para avaliar.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs font-semibold text-secondary-text uppercase tracking-widest pl-2">
                                Jogadores ({playersToEvaluate.length})
                            </p>
                            {playersToEvaluate.map(player => {
                                const playerName = player.users?.displayName || 'Jogador'
                                const position = player.users?.mainPosition === 'GOALKEEPER' ? 'Goleiro' :
                                    player.users?.mainPosition === 'DEFENSE' ? 'Defesa' : 'Ataque'
                                const currentRating = mergedRatings[player.userId] || 0

                                return (
                                    <div key={player.userId} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="size-9 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
                                                <span className="text-xs font-bold text-brand-green">
                                                    {playerName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-primary-text truncate">{playerName}</p>
                                                <p className="text-[11px] text-secondary-text">{position}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => handleStarClick(player.userId, star)}
                                                    className={`p-1.5 rounded-md transition-all active:scale-90 ${star <= currentRating
                                                        ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-50'
                                                        : 'text-gray-300 hover:text-gray-400 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    <Star size={20} className={star <= currentRating ? 'fill-current' : ''} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-brand-red text-center animate-fade-in bg-red-50 p-3 rounded-xl">{error}</p>
                    )}
                </div>

                {/* Footer */}
                {playersToEvaluate.length > 0 && (
                    <div className="p-6 border-t border-gray-100 bg-white shrink-0 sm:rounded-b-3xl">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || ratedCount === 0}
                            className="w-full py-4 rounded-2xl bg-brand-green text-white font-bold text-sm shadow-lg shadow-brand-green/20 flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} className="fill-current" />}
                            {submitting ? 'Salvando...' : allRated ? 'FINALIZAR AVALIAÇÕES' : 'SALVAR AVALIAÇÕES'}
                        </button>
                        {!allRated && ratedCount > 0 && (
                            <p className="text-[10px] text-secondary-text text-center mt-3">
                                Você avaliou {ratedCount} de {playersToEvaluate.length} jogadores.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

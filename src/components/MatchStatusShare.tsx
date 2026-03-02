import { useState, useEffect, useRef, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import { X, Copy, Check, Share2, Loader2 } from 'lucide-react'
import { formatMatchStatus, computeDeadline, type MatchStatusInput } from '@/lib/matchStatusFormatter'

const logger = createLogger('MatchStatusShare')

interface Props {
    matchData: MatchStatusInput
    matchTitle: string
    onClose: () => void
}

export default function MatchStatusShare({ matchData, matchTitle, onClose }: Props) {
    const [copied, setCopied] = useState(false)
    const [sharing, setSharing] = useState(false)
    const dialogRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<Element | null>(null)

    const stableOnClose = useCallback(() => {
        // Return focus to the element that opened the dialog
        if (triggerRef.current instanceof HTMLElement) {
            triggerRef.current.focus()
        }
        onClose()
    }, [onClose])

    useEffect(() => {
        // Remember which element had focus before opening
        triggerRef.current = document.activeElement

        // Auto-focus the dialog container
        dialogRef.current?.focus()

        // Escape key handler
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                stableOnClose()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [stableOnClose])

    const statusText = formatMatchStatus(matchData)
    const deadline = computeDeadline(matchData.scheduledAt, matchData.confirmationDeadlineHours, matchData.createdAt)

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(statusText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            logger.error('Erro ao copiar texto', err)
        }
    }

    function handleWhatsApp() {
        window.open(
            `https://wa.me/?text=${encodeURIComponent(statusText)}`,
            '_blank',
            'noopener,noreferrer',
        )
    }

    async function handleShare() {
        if (!navigator.share) {
            handleCopy()
            return
        }

        setSharing(true)
        try {
            await navigator.share({
                title: `Status — ${matchTitle}`,
                text: statusText,
            })
        } catch (err) {
            if ((err as Error)?.name !== 'AbortError') {
                logger.error('Erro ao compartilhar', err)
            }
        } finally {
            setSharing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-modal-title"
                aria-describedby="share-modal-desc"
                tabIndex={-1}
                className="bg-surface w-full max-w-md rounded-t-[32px] sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] outline-none"
            >

                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 id="share-modal-title" className="text-lg font-bold text-primary-text">Compartilhar Status</h3>
                        <p id="share-modal-desc" className="text-[11px] text-secondary-text mt-0.5">
                            Envie para o grupo da pelada
                        </p>
                    </div>
                    <button
                        onClick={stableOnClose}
                        className="p-2 bg-gray-50 rounded-full text-secondary-text hover:bg-gray-100 transition-colors"
                        aria-label="Fechar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Deadline badge — only when applicable */}
                {deadline.isApplicable && (
                    <div className="px-5 pt-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${deadline.isExpired
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : deadline.hoursRemaining <= 12
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                            }`}>
                            <span className="size-1.5 rounded-full bg-current animate-pulse" />
                            {deadline.isExpired ? 'Prazo expirado' : `⏳ ${deadline.label}`}
                        </div>
                    </div>
                )}

                {/* Preview */}
                <div className="p-5 flex-1 overflow-y-auto">
                    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700/50 shadow-inner">
                        <pre className="text-[12px] leading-relaxed text-gray-200 whitespace-pre-wrap font-sans break-words">
                            {statusText}
                        </pre>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-5 border-t border-gray-100 flex flex-col gap-3 shrink-0">
                    {/* WhatsApp */}
                    <button
                        onClick={handleWhatsApp}
                        className="w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all active:scale-[0.97] shadow-lg shadow-[#25D366]/20"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                        Enviar no WhatsApp
                    </button>

                    <div className="flex gap-3">
                        {/* Copy */}
                        <button
                            onClick={handleCopy}
                            className={`flex-1 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${copied
                                ? 'bg-brand-green/10 text-brand-green border border-brand-green/20'
                                : 'border border-gray-200 text-secondary-text hover:bg-gray-50'
                                }`}
                        >
                            {copied ? (
                                <><Check size={16} /> Copiado!</>
                            ) : (
                                <><Copy size={16} /> Copiar</>
                            )}
                        </button>

                        {/* Share / Close */}
                        {'share' in navigator ? (
                            <button
                                onClick={handleShare}
                                disabled={sharing}
                                className="flex-1 py-3.5 rounded-2xl bg-brand-green/10 border border-brand-green/20 text-brand-green font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-green/20 transition-all active:scale-[0.97] disabled:opacity-70"
                            >
                                {sharing ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <><Share2 size={16} /> Outros</>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-secondary-text font-semibold text-sm hover:bg-gray-50 transition-all active:scale-[0.97]"
                            >
                                Fechar
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}

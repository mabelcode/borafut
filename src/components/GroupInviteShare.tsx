import { useState, useEffect, useRef, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import { X, Copy, Check, Share2, Loader2, Link2, Clock } from 'lucide-react'

const logger = createLogger('GroupInviteShare')

interface Props {
    groupName: string
    inviteToken: string
    inviteExpiresAt: string | null
    onClose: () => void
}

export default function GroupInviteShare({ groupName, inviteToken, inviteExpiresAt, onClose }: Props) {
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

    const inviteUrl = `${window.location.origin}?token=${inviteToken}`
    const isExpired = !!(inviteExpiresAt && new Date(inviteExpiresAt) < new Date())

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(inviteUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            logger.error('Erro ao copiar link', err)
        }
    }

    function handleWhatsApp() {
        const text = `Vem jogar no grupo *${groupName}*! Acesse o link para entrar: ${inviteUrl}`
        window.open(
            `https://wa.me/?text=${encodeURIComponent(text)}`,
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
                title: `Convite para o grupo ${groupName}`,
                text: `Vem jogar no grupo ${groupName}! Acesse o link para entrar:`,
                url: inviteUrl,
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
                aria-labelledby="invite-modal-title"
                aria-describedby="invite-modal-desc"
                tabIndex={-1}
                className="bg-surface w-full max-w-md rounded-t-[32px] sm:rounded-3xl flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] outline-none"
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 id="invite-modal-title" className="text-lg font-bold text-primary-text">Convidar Amigo</h3>
                        <p id="invite-modal-desc" className="text-[11px] text-secondary-text mt-0.5">
                            Compartilhe o link do grupo <strong className="text-brand-green">{groupName}</strong>
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

                {/* Content */}
                <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
                    {isExpired ? (
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                            <p className="text-xs text-amber-700 font-medium">
                                ⚠️ O link de convite atual deste grupo expirou. Peça a um administrador para gerar um novo link.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <Link2 size={16} className="text-brand-green" />
                                    <span className="text-xs font-bold text-secondary-text uppercase tracking-widest">Link de Acesso</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-3 bg-white rounded-xl border border-gray-200">
                                    <p className="flex-1 text-[11px] text-secondary-text truncate font-mono select-all">{inviteUrl}</p>
                                    <button
                                        onClick={handleCopy}
                                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${copied ? 'bg-brand-green text-white' : 'text-brand-green border border-brand-green/20 hover:bg-brand-green/10'
                                            }`}
                                    >
                                        {copied ? <Check size={12} /> : <Copy size={12} />}
                                        {copied ? 'COPIADO' : 'COPIAR'}
                                    </button>
                                </div>
                                {inviteExpiresAt && (
                                    <p className="text-[10px] text-secondary-text flex items-center gap-1 ml-1">
                                        <Clock size={12} />
                                        Expira em {new Date(inviteExpiresAt).toLocaleString('pt-BR')}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="p-5 border-t border-gray-100 flex flex-col gap-3 shrink-0">
                    <button
                        onClick={handleWhatsApp}
                        disabled={isExpired}
                        className="w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all active:scale-[0.97] shadow-lg shadow-[#25D366]/20 disabled:opacity-50 disabled:active:scale-100"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                        Enviar no WhatsApp
                    </button>

                    <div className="flex gap-3">
                        {/* Copy fallback inside actions area for quick acccess */}
                        {/* Outros / Fechar */}
                        {'share' in navigator ? (
                            <button
                                onClick={handleShare}
                                disabled={sharing || isExpired}
                                className="flex-1 py-3.5 rounded-2xl bg-brand-green/10 border border-brand-green/20 text-brand-green font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-green/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
                            >
                                {sharing ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <><Share2 size={16} /> Outros</>
                                )}
                            </button>
                        ) : null}

                        <button
                            onClick={onClose}
                            className={`${'share' in navigator ? 'flex-1' : 'w-full'} py-3.5 rounded-2xl border border-gray-200 text-secondary-text font-semibold text-sm hover:bg-gray-50 transition-all active:scale-[0.97]`}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

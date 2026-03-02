import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { Trophy, Star, Share2, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { MvpPlayer } from '@/hooks/useMatchMvp'

const POSITION_LABEL: Record<string, string> = {
    GOALKEEPER: 'Goleiro',
    DEFENSE: 'Defesa',
    ATTACK: 'Ataque',
}

interface Props {
    mvps: MvpPlayer[]
    matchTitle: string | null
    matchDate: string
    onClose: () => void
}

export default function MvpCard({ mvps, matchTitle, matchDate, onClose }: Props) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [sharing, setSharing] = useState(false)

    const formattedDate = new Date(matchDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    })

    function downloadImage(dataUrl: string) {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = 'craque-da-partida.png'
        a.click()
    }

    async function handleWhatsAppShare() {
        if (!cardRef.current) return
        setSharing(true)

        try {
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 3,
                backgroundColor: '#0f172a',
            })

            // Download the image so they can easily attach it
            downloadImage(dataUrl)

            // Open WhatsApp with text (they just need to select the downloaded image)
            const text = `🏆 Craque da Partida: ${mvps.map(m => m.displayName).join(', ')} ⭐ ${Number(mvps[0].avgScore).toFixed(1)} — via borafut.com.br`

            // Allow a tiny delay for download to start
            setTimeout(() => {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
            }, 300)
        } catch (err) {
            console.error('WhatsApp share error:', err)
        } finally {
            setSharing(false)
        }
    }

    async function handleShare() {
        if (!cardRef.current) return
        setSharing(true)

        try {
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 3,
                backgroundColor: '#0f172a',
            })

            const blob = await (await fetch(dataUrl)).blob()
            const file = new File([blob], 'craque-da-partida.png', { type: 'image/png' })

            // 1. Try native share with file (works on mobile → WhatsApp, Instagram, etc.)
            if (navigator.share) {
                try {
                    if (navigator.canShare?.({ files: [file] })) {
                        await navigator.share({
                            title: `Craque da Partida — ${matchTitle || 'BoraFut'}`,
                            files: [file],
                        })
                        return
                    }
                    // 2. Device supports share but not files → share text only
                    await navigator.share({
                        title: `Craque da Partida — ${matchTitle || 'BoraFut'}`,
                        text: `🏆 Craque da Partida: ${mvps.map(m => m.displayName).join(', ')} ⭐ ${Number(mvps[0].avgScore).toFixed(1)} — via borafut.com.br`,
                    })
                    // Also download the image so they can attach manually
                    downloadImage(dataUrl)
                    return
                } catch (err) {
                    // User cancelled share dialog → not an error
                    if ((err as Error)?.name === 'AbortError') return
                    // Share failed → fall through to download
                }
            }

            // 3. No share API → just download
            downloadImage(dataUrl)
        } catch (err) {
            console.error('Share error:', err)
        } finally {
            setSharing(false)
        }
    }

    const isSingle = mvps.length === 1

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-in slide-in-from-bottom duration-300">

                {/* Shareable Card */}
                <div
                    ref={cardRef}
                    style={{
                        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
                        borderRadius: '24px',
                        padding: '40px 32px 28px',
                        width: '100%',
                        maxWidth: '380px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '20px',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                        boxShadow: '0 0 60px rgba(251, 191, 36, 0.08), 0 25px 50px rgba(0,0,0,0.5)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Decorative glow behind avatar area */}
                    <div style={{
                        position: 'absolute',
                        top: isSingle ? '-40px' : '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }} />

                    {/* Trophy + Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
                        <Trophy size={28} color="#fbbf24" style={{ marginBottom: '4px' }} />
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '3px',
                            textTransform: 'uppercase' as const,
                            color: '#fbbf24',
                        }}>
                            {isSingle ? 'Craque da Partida' : 'Craques da Partida'}
                        </span>
                    </div>

                    {/* Player(s) */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: isSingle ? '0' : '16px',
                        flexWrap: 'wrap' as const,
                        position: 'relative',
                    }}>
                        {mvps.map(mvp => (
                            <div key={mvp.userId} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                                minWidth: isSingle ? 'auto' : '100px',
                            }}>
                                {/* Avatar */}
                                <div style={{
                                    width: isSingle ? '96px' : '72px',
                                    height: isSingle ? '96px' : '72px',
                                    borderRadius: '50%',
                                    border: '3px solid #fbbf24',
                                    boxShadow: '0 0 20px rgba(251,191,36,0.3)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#1e293b',
                                }}>
                                    {mvp.avatarUrl ? (
                                        <img
                                            src={mvp.avatarUrl}
                                            alt={mvp.displayName || ''}
                                            crossOrigin="anonymous"
                                            referrerPolicy="no-referrer"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    ) : (
                                        <span style={{
                                            fontSize: isSingle ? '32px' : '24px',
                                            fontWeight: 800,
                                            color: '#fbbf24',
                                        }}>
                                            {(mvp.displayName || 'J').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Name + Position */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <span style={{
                                        fontSize: isSingle ? '18px' : '14px',
                                        fontWeight: 800,
                                        color: '#f8fafc',
                                        textAlign: 'center' as const,
                                        lineHeight: 1.2,
                                    }}>
                                        {mvp.displayName}
                                    </span>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: '#94a3b8',
                                        textTransform: 'uppercase' as const,
                                        letterSpacing: '1px',
                                    }}>
                                        {mvp.mainPosition ? POSITION_LABEL[mvp.mainPosition] ?? mvp.mainPosition : ''}
                                    </span>
                                </div>

                                {/* Score */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(251,191,36,0.1)',
                                    border: '1px solid rgba(251,191,36,0.2)',
                                    borderRadius: '12px',
                                    padding: '6px 14px',
                                }}>
                                    <Star size={14} color="#fbbf24" fill="#fbbf24" />
                                    <span style={{
                                        fontSize: '16px',
                                        fontWeight: 800,
                                        color: '#fbbf24',
                                    }}>
                                        {Number(mvp.avgScore).toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Match info */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        marginTop: '4px',
                    }}>
                        {matchTitle && (
                            <span style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#cbd5e1',
                            }}>
                                {matchTitle}
                            </span>
                        )}
                        <span style={{
                            fontSize: '11px',
                            color: '#64748b',
                        }}>
                            {formattedDate}
                        </span>
                    </div>

                    {/* Branding */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginTop: '8px',
                        opacity: 0.5,
                    }}>
                        <span style={{ fontSize: '13px' }}>⚽</span>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#94a3b8',
                            letterSpacing: '0.5px',
                        }}>
                            borafut.com.br
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 w-full max-w-[380px]">
                    <button
                        onClick={handleWhatsAppShare}
                        disabled={sharing}
                        className="w-full py-3.5 rounded-2xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all active:scale-[0.97] disabled:opacity-70 shadow-lg shadow-[#25D366]/20"
                    >
                        {sharing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <>
                                {/* Custom WhatsApp SVG since lucide-react doesn't have it */}
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                </svg>
                                Enviar no WhatsApp
                            </>
                        )}
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-2xl border border-gray-600 text-gray-300 font-semibold text-sm hover:bg-gray-800 transition-all active:scale-[0.97]"
                        >
                            Fechar
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={sharing}
                            className="flex-1 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all active:scale-[0.97] disabled:opacity-70"
                        >
                            {sharing ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : 'share' in navigator ? (
                                <>
                                    <Share2 size={16} />
                                    Outros / Salvar
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Baixar
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}

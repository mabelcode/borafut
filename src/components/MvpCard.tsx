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
                        text: `🏆 Craque da Partida: ${mvps.map(m => m.displayName).join(', ')} ⭐ ${Number(mvps[0].avgScore).toFixed(1)} — via borafut.app`,
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
                            borafut.app
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 w-full max-w-[380px]">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl border border-gray-600 text-gray-300 font-semibold text-sm hover:bg-gray-800 transition-all active:scale-[0.97]"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={sharing}
                        className="flex-1 py-3.5 rounded-2xl bg-amber-500 text-gray-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-400 transition-all active:scale-[0.97] disabled:opacity-70 shadow-lg shadow-amber-500/20"
                    >
                        {sharing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : 'share' in navigator ? (
                            <>
                                <Share2 size={16} />
                                Compartilhar
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Baixar Imagem
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

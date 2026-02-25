import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, QrCode, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/react'

interface GroupFinanceTabProps {
    groupId: string
}

interface PendingRegistration {
    id: string
    matchId: string
    status: 'RESERVED'
    match: {
        title: string | null
        scheduledAt: string
        groupId: string
    }
    user: {
        id: string
        displayName: string | null
        phoneNumber: string
    }
}

// Raw type from Supabase join
interface SupabasePendingRegistration {
    id: string
    matchId: string
    status: string
    match: {
        title: string | null
        scheduledAt: string
        groupId: string
    } | null
    user: {
        id: string
        displayName: string | null
        phoneNumber: string | null
    } | null
}

export default function GroupFinanceTab({ groupId }: GroupFinanceTabProps) {
    const [pixKey, setPixKey] = useState('')
    const [initialPixKey, setInitialPixKey] = useState('')
    const [savingPix, setSavingPix] = useState(false)
    const [savedPix, setSavedPix] = useState(false)
    const [pendingRegs, setPendingRegs] = useState<PendingRegistration[]>([])
    const [loadingRegs, setLoadingRegs] = useState(true)
    const [confirmingId, setConfirmingId] = useState<string | null>(null)

    async function fetchFinanceData() {
        try {
            setLoadingRegs(true)

            // Fetch Group Pix Key
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('pixKey')
                    .eq('id', user.id)
                    .single()
                if (userData?.pixKey) {
                    setPixKey(userData.pixKey)
                    setInitialPixKey(userData.pixKey)
                }
            }

            // Fetch Pending Registrations for this group using server-side filtering
            const { data: regsData, error: regsError } = await supabase
                .from('match_registrations')
                .select(`
                    id,
                    matchId,
                    status,
                    match:matches!inner(title, scheduledAt, groupId),
                    user:users(id, displayName, phoneNumber)
                `)
                .eq('status', 'RESERVED')
                .eq('match.groupId', groupId)

            if (regsError) throw regsError

            // Type guard to ensure data integrity
            const rawRegs = (regsData as unknown as SupabasePendingRegistration[]) || []
            const validatedRegs: PendingRegistration[] = rawRegs
                .filter((r): r is SupabasePendingRegistration & { match: object; user: { phoneNumber: string } } =>
                    !!r.match && !!r.user && !!r.user.phoneNumber
                ) as any

            setPendingRegs(validatedRegs)

        } catch (err) {
            logger.error('Erro ao buscar dados financeiros do grupo', err)
            Sentry.captureException(err)
        } finally {
            setLoadingRegs(false)
        }
    }

    useEffect(() => {
        fetchFinanceData()
    }, [groupId])

    async function handleSavePix() {
        if (!pixKey.trim()) return
        try {
            setSavingPix(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
                .from('users')
                .update({ pixKey: pixKey.trim() })
                .eq('id', user.id)

            if (error) throw error
            setInitialPixKey(pixKey.trim())
            setSavedPix(true)
            setTimeout(() => setSavedPix(false), 3000)
        } catch (err) {
            logger.error('Erro ao salvar chave Pix', err)
            Sentry.captureException(err)
        } finally {
            setSavingPix(false)
        }
    }

    async function handleConfirmPayment(regId: string) {
        try {
            setConfirmingId(regId)
            const { error } = await supabase
                .from('match_registrations')
                .update({ status: 'CONFIRMED' })
                .eq('id', regId)
                .eq('status', 'RESERVED')

            if (error) throw error

            setPendingRegs(prev => prev.filter(r => r.id !== regId))
            logger.info('Pagamento confirmado pelo Group Admin', { regId })
        } catch (err) {
            logger.error('Erro ao confirmar pagamento', err)
            Sentry.captureException(err)
        } finally {
            setConfirmingId(null)
        }
    }

    function openWhatsApp(phone: string, matchTitle: string) {
        const text = encodeURIComponent(`Olá! Sou o admin do Borafut. Estou conferindo os pagamentos para a partida "${matchTitle}" e ainda não identifiquei o seu Pix. Poderia me enviar o comprovante?`)
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="p-4 flex flex-col gap-6 animate-fade-in pb-20">
            {/* Pix Config Card */}
            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <QrCode size={18} className="text-brand-green" />
                    <h3 className="text-sm font-bold text-primary-text uppercase tracking-widest">Sua Chave Pix</h3>
                </div>
                <p className="text-[11px] text-secondary-text -mt-2">
                    Esta chave será exibida para os jogadores do grupo realizarem o pagamento das taxas.
                </p>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Chave Pix (CPF, Celular, Email...)"
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
                    />
                    <button
                        onClick={handleSavePix}
                        disabled={savingPix || !pixKey.trim() || pixKey.trim() === initialPixKey}
                        className={`px-4 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 ${savedPix ? 'bg-brand-green/10 text-brand-green' :
                            (pixKey.trim() === initialPixKey || !pixKey.trim()) ? 'bg-gray-100 text-gray-400' : 'bg-brand-green text-white shadow-sm shadow-brand-green/20'
                            }`}
                    >
                        {savingPix ? <Loader2 size={14} className="animate-spin" /> : savedPix ? <CheckCircle2 size={14} /> : 'Salvar'}
                    </button>
                </div>
            </div>

            {/* Pending Confirmations Section */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-primary-text uppercase tracking-widest">Aguardando Confirmação</h3>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        {pendingRegs.length} Pendentes
                    </span>
                </div>

                {loadingRegs ? (
                    <div className="flex justify-center py-10">
                        <Loader2 size={24} className="animate-spin text-secondary-text" />
                    </div>
                ) : pendingRegs.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-sm text-secondary-text">Tudo em dia! Nenhum Pix pendente.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {pendingRegs.map((reg) => (
                            <div key={reg.id} className="bg-surface border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold border border-amber-100">
                                            {(reg.user.displayName || 'J')[0]}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-primary-text truncate">{reg.user.displayName || 'Jogador'}</span>
                                            <span className="text-[10px] text-secondary-text font-medium truncate">{reg.match.title || 'Partida'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tighter">Reservado</span>
                                        <span className="text-[9px] text-secondary-text">{new Date(reg.match.scheduledAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => handleConfirmPayment(reg.id)}
                                        disabled={confirmingId === reg.id}
                                        className="flex-1 bg-brand-green/10 text-brand-green py-2.5 rounded-xl text-[11px] font-bold hover:bg-brand-green hover:text-white transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-brand-green/10"
                                    >
                                        {confirmingId === reg.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                        CONFIRMAR PIX
                                    </button>
                                    <button
                                        onClick={() => openWhatsApp(reg.user.phoneNumber, reg.match.title || 'Partida')}
                                        className="size-10 flex items-center justify-center bg-gray-50 text-secondary-text rounded-xl hover:bg-gray-100 transition-all active:scale-95 border border-gray-100"
                                        title="Cobrar no WhatsApp"
                                    >
                                        <MessageSquare size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

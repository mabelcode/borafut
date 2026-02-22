import { useState } from 'react'
import { ArrowLeft, Calendar, Users, CircleDollarSign, FileText, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Returns the local datetime string (YYYY-MM-DDTHH:mm) for min attribute */
function nowLocalDatetime() {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
}

/** Formats a raw digit string as BRL currency display */
function formatCurrency(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    const value = parseInt(digits, 10) / 100
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseCurrencyToNumber(raw: string): number {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return 0
    return parseInt(digits, 10) / 100
}

/* ── Field wrapper ───────────────────────────────────────────────── */

function FieldCard({
    icon,
    label,
    hint,
    children,
}: {
    icon: React.ReactNode
    label: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <span className="text-brand-green">{icon}</span>
                <span className="text-xs font-semibold text-secondary-text uppercase tracking-wide">
                    {label}
                </span>
            </div>
            {hint && <p className="text-[11px] text-secondary-text -mt-1">{hint}</p>}
            {children}
        </div>
    )
}

/* ── Component ───────────────────────────────────────────────────── */

interface Props {
    session: Session
    onBack: () => void
    onCreated: () => void
}

export default function CreateMatch({ session, onBack, onCreated }: Props) {
    const [title, setTitle] = useState('')
    const [scheduledAt, setScheduledAt] = useState('')
    const [maxPlayers, setMaxPlayers] = useState('')
    const [priceRaw, setPriceRaw] = useState('') // raw digit string, e.g. "2000" = R$20,00
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const validDate = scheduledAt !== ''
    const validPlayers = parseInt(maxPlayers) >= 2
    const validPrice = parseCurrencyToNumber(priceRaw) > 0
    const canSubmit = validDate && validPlayers && validPrice && !loading

    function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
        const digits = e.target.value.replace(/\D/g, '')
        setPriceRaw(digits)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canSubmit) return

        setLoading(true)
        setError('')

        const { error } = await supabase.from('matches').insert({
            managerId: session.user.id,
            title: title.trim() || null,
            scheduledAt: new Date(scheduledAt).toISOString(),
            maxPlayers: parseInt(maxPlayers),
            price: parseCurrencyToNumber(priceRaw),
            status: 'OPEN',
        })

        if (error) {
            console.error('[CreateMatch] Supabase error:', error)
            setError(`Erro ao criar partida: ${error.message}`)
            setLoading(false)
            return
        }

        onCreated()
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <header className="flex items-center gap-3 pt-2">
                <button
                    onClick={onBack}
                    className="size-9 rounded-xl bg-surface border border-gray-200 flex items-center justify-center text-secondary-text hover:text-primary-text hover:border-gray-300 transition-all duration-150 active:scale-95 shadow-sm"
                    aria-label="Voltar"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-primary-text leading-tight">Nova Partida</h1>
                    <p className="text-xs text-secondary-text">Preencha os dados da pelada</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">

                {/* Título (opcional) */}
                <FieldCard icon={<FileText size={15} />} label="Título" hint="Opcional — Ex: Pelada de quinta">
                    <input
                        type="text"
                        placeholder="Pelada do racha"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={60}
                        className="w-full bg-background rounded-xl border border-gray-200 px-4 py-3 text-base font-medium text-primary-text placeholder:text-gray-400 outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 transition-all duration-150"
                    />
                </FieldCard>

                {/* Data e hora */}
                <FieldCard icon={<Calendar size={15} />} label="Data e horário">
                    <input
                        type="datetime-local"
                        min={nowLocalDatetime()}
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full bg-background rounded-xl border border-gray-200 px-4 py-3 text-base font-medium text-primary-text outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 transition-all duration-150 [color-scheme:light]"
                    />
                </FieldCard>

                {/* Número de vagas */}
                <FieldCard icon={<Users size={15} />} label="Limite de vagas" hint="Mínimo 2 jogadores">
                    <div className="flex items-center gap-2">
                        {[10, 14, 18, 22].map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setMaxPlayers(String(n))}
                                className={[
                                    'flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 active:scale-95',
                                    maxPlayers === String(n)
                                        ? 'bg-brand-green border-brand-green text-white shadow-sm shadow-brand-green/20'
                                        : 'bg-background border-gray-200 text-secondary-text hover:border-gray-300',
                                ].join(' ')}
                            >
                                {n}
                            </button>
                        ))}
                        <input
                            type="number"
                            min={2}
                            max={100}
                            placeholder="…"
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(e.target.value)}
                            className="w-14 bg-background rounded-xl border border-gray-200 px-2 py-2.5 text-sm font-semibold text-primary-text text-center outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 transition-all duration-150"
                        />
                    </div>
                </FieldCard>

                {/* Taxa */}
                <FieldCard icon={<CircleDollarSign size={15} />} label="Valor da taxa" hint="Quanto cada jogador paga para confirmar">
                    <div className="flex items-center gap-2 bg-background rounded-xl border border-gray-200 px-4 py-3 focus-within:border-brand-green focus-within:ring-1 focus-within:ring-brand-green/30 transition-all duration-150">
                        <span className="text-sm font-semibold text-secondary-text shrink-0">R$</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0,00"
                            value={formatCurrency(priceRaw).replace('R$\u00a0', '').replace('R$', '')}
                            onChange={handlePriceChange}
                            className="flex-1 bg-transparent text-base font-semibold text-primary-text placeholder:text-gray-400 outline-none"
                        />
                    </div>
                </FieldCard>

                {/* Error */}
                {error && (
                    <p className="text-xs text-brand-red font-medium text-center animate-fade-in">{error}</p>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className={[
                        'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-base mt-1 transition-all duration-150',
                        canSubmit
                            ? 'bg-brand-green text-white hover:brightness-105 active:scale-[0.97] shadow-sm shadow-brand-green/20'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                    ].join(' ')}
                >
                    {loading ? (
                        <><Loader2 size={18} className="animate-spin" /> Criando…</>
                    ) : (
                        <>Criar Partida <ArrowRight size={18} /></>
                    )}
                </button>
            </form>
        </div>
    )
}

import { useState } from 'react'
import { ArrowRight, Loader2, User, Shield, Sword, Goal, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

/* ── Types ────────────────────────────────────────────────────────── */

type Position = 'GOALKEEPER' | 'DEFENSE' | 'ATTACK'

const POSITIONS: { value: Position; label: string; sub: string; icon: React.ReactNode }[] = [
    {
        value: 'GOALKEEPER',
        label: 'Goleiro',
        sub: 'Defende o gol',
        icon: <Goal size={22} strokeWidth={1.6} />,
    },
    {
        value: 'DEFENSE',
        label: 'Defesa',
        sub: 'Marca e protege',
        icon: <Shield size={22} strokeWidth={1.6} />,
    },
    {
        value: 'ATTACK',
        label: 'Ataque',
        sub: 'Cria e finaliza',
        icon: <Sword size={22} strokeWidth={1.6} />,
    },
]

/* ── Phone helpers (same as Login) ───────────────────────────────── */

function toDigitsOnly(v: string) {
    return v.replace(/\D/g, '')
}

function formatBR(digits: string) {
    const d = digits.slice(0, 11)
    if (d.length === 0) return ''
    if (d.length <= 2) return `(${d}`
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function isValidBRCell(digits: string) {
    return digits.length === 11 && digits[2] === '9'
}

/* ── Component ───────────────────────────────────────────────────── */

interface Props {
    session: Session
    onComplete: () => void
    onSignOut: () => void
}

export default function Onboarding({ session, onComplete, onSignOut }: Props) {
    const [displayName, setDisplayName] = useState('')
    const [position, setPosition] = useState<Position | null>(null)
    const [phoneDigits, setPhoneDigits] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const validName = displayName.trim().length >= 2
    const validPhone = isValidBRCell(phoneDigits)
    const canSubmit = validName && position !== null && validPhone && !loading

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canSubmit) return

        setLoading(true)
        setError('')

        const { error } = await supabase.from('users').upsert({
            id: session.user.id,
            phoneNumber: `+55${phoneDigits}`,
            displayName: displayName.trim(),
            mainPosition: position,
        })

        if (error) {
            console.error('[Onboarding] Supabase error:', error)
            setError(`Erro: ${error.message}`)
            setLoading(false)
            return
        }

        onComplete()
    }

    return (
        <div className="flex flex-col gap-8 animate-fade-in">
            {/* Brand + step indicator */}
            <div className="flex flex-col gap-1 pt-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-primary-text">
                    bora<span className="text-brand-green">fut</span>
                </h1>
                <p className="text-sm text-secondary-text">Complete seu perfil para começar</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {/* ── Nome/Apelido ── */}
                <div className="bg-surface rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <User size={16} className="text-brand-green" />
                        <span className="text-xs font-semibold text-secondary-text uppercase tracking-wide">
                            Como te chamam?
                        </span>
                    </div>
                    <input
                        id="displayName"
                        type="text"
                        autoComplete="nickname"
                        placeholder="Ex: Marcos, Marquinho, Gordão…"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={32}
                        className={[
                            'w-full bg-background rounded-xl border px-4 py-3 text-base font-medium text-primary-text placeholder:text-gray-400 outline-none transition-all duration-150',
                            displayName && !validName
                                ? 'border-brand-red ring-1 ring-brand-red/30'
                                : 'border-gray-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green/30',
                        ].join(' ')}
                    />
                    {displayName && !validName && (
                        <p className="text-xs text-brand-red animate-fade-in">Mínimo de 2 caracteres.</p>
                    )}
                </div>

                {/* ── Posição ── */}
                <div className="bg-surface rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                    <span className="text-xs font-semibold text-secondary-text uppercase tracking-wide">
                        Qual sua posição principal?
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                        {POSITIONS.map(({ value, label, sub, icon }) => {
                            const selected = position === value
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setPosition(value)}
                                    className={[
                                        'flex flex-col items-center gap-1.5 py-4 rounded-2xl border transition-all duration-150 active:scale-95',
                                        selected
                                            ? 'bg-brand-green border-brand-green text-white shadow-sm shadow-brand-green/20'
                                            : 'bg-background border-gray-200 text-secondary-text hover:border-gray-300',
                                    ].join(' ')}
                                >
                                    <span className={selected ? 'text-white' : 'text-secondary-text'}>{icon}</span>
                                    <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-primary-text'}`}>
                                        {label}
                                    </span>
                                    <span className={`text-[10px] leading-tight text-center ${selected ? 'text-white/80' : 'text-secondary-text'}`}>
                                        {sub}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* ── WhatsApp ── */}
                <div className="bg-surface rounded-3xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-secondary-text uppercase tracking-wide">
                            Seu WhatsApp
                        </span>
                        <span className="text-[11px] text-secondary-text">
                            Usado para notificações de partidas e confirmação de pagamento.
                        </span>
                    </div>

                    <div
                        className={[
                            'flex items-center gap-2 rounded-xl border bg-background px-4 py-3 transition-all duration-150',
                            phoneDigits && !validPhone
                                ? 'border-brand-red ring-1 ring-brand-red/30'
                                : 'border-gray-200 focus-within:border-brand-green focus-within:ring-1 focus-within:ring-brand-green/30',
                        ].join(' ')}
                    >
                        <span className="text-base select-none shrink-0">🇧🇷</span>
                        <span className="text-sm font-medium text-secondary-text shrink-0">+55</span>
                        <div className="w-px h-4 bg-gray-200 shrink-0" />
                        <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="(11) 99999-9999"
                            value={formatBR(phoneDigits)}
                            onChange={(e) => setPhoneDigits(toDigitsOnly(e.target.value).slice(0, 11))}
                            className="flex-1 bg-transparent text-base font-medium text-primary-text placeholder:text-gray-400 outline-none"
                        />
                    </div>
                    {phoneDigits && !validPhone && (
                        <p className="text-xs text-brand-red animate-fade-in">
                            Digite um celular válido com DDD.
                        </p>
                    )}
                </div>

                {/* ── Submit ── */}
                {error && (
                    <p className="text-xs text-brand-red font-medium text-center animate-fade-in">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className={[
                        'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-base transition-all duration-150',
                        canSubmit
                            ? 'bg-brand-green text-white hover:brightness-105 active:scale-[0.97] shadow-sm shadow-brand-green/20'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                    ].join(' ')}
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Salvando…
                        </>
                    ) : (
                        <>
                            Entrar no app
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </form>

            {/* Sign out escape hatch */}
            <button
                onClick={async () => { await supabase.auth.signOut(); onSignOut() }}
                className="flex items-center gap-1.5 text-xs text-secondary-text hover:text-brand-red transition-colors duration-150 mx-auto py-1"
            >
                <LogOut size={12} />
                Entrar com outra conta
            </button>
        </div>
    )
}

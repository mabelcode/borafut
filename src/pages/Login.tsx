import { useState, useRef, useEffect } from 'react'
import { MessageCircle, ArrowRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react'

/* ── helpers ─────────────────────────────────────────────────────────── */

/** Strips all non-digit chars and returns only the raw digits. */
function toDigitsOnly(value: string): string {
    return value.replace(/\D/g, '')
}

/**
 * Formats a raw digit string as a Brazilian cell number.
 * Examples:
 *   "11"         → "(11"
 *   "11987"      → "(11) 98765"
 *   "11987654321"→ "(11) 98765-4321"
 */
function formatBR(digits: string): string {
    const d = digits.slice(0, 11) // max: DDD(2) + 9 digits
    if (d.length === 0) return ''
    if (d.length <= 2) return `(${d}`
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Returns true when the number is a valid BR cell (11 digits: DDD + 9). */
function isValidBRCell(digits: string): boolean {
    return digits.length === 11 && digits[2] === '9'
}

/* ── sub-components ───────────────────────────────────────────────────── */

function SentScreen({ phone, onBack }: { phone: string; onBack: () => void }) {
    return (
        <div className="flex flex-col items-center text-center gap-6 animate-fade-in">
            {/* Icon */}
            <div className="mt-2 size-20 rounded-full bg-brand-green/10 flex items-center justify-center">
                <CheckCircle2 size={40} className="text-brand-green" strokeWidth={1.8} />
            </div>

            {/* Copy */}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-primary-text tracking-tight">
                    Verifique seu WhatsApp
                </h2>
                <p className="text-secondary-text text-sm leading-relaxed max-w-xs">
                    Enviamos um link de acesso para&nbsp;
                    <span className="font-semibold text-primary-text">{phone}</span>.
                    <br />
                    Toque no link para entrar no app.
                </p>
            </div>

            {/* Hint */}
            <div className="w-full bg-surface rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start gap-3 text-left">
                <MessageCircle size={20} className="text-brand-green mt-0.5 shrink-0" />
                <p className="text-xs text-secondary-text leading-relaxed">
                    O link expira em <span className="font-medium text-primary-text">15 minutos</span>.
                    Se não receber a mensagem, aguarde alguns segundos e tente novamente.
                </p>
            </div>

            {/* Back */}
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-secondary-text hover:text-primary-text transition-colors duration-150"
            >
                <ChevronLeft size={16} />
                Usar outro número
            </button>
        </div>
    )
}

/* ── main page ────────────────────────────────────────────────────────── */

type Step = 'input' | 'sent'

export default function Login() {
    const [step, setStep] = useState<Step>('input')
    const [rawDigits, setRawDigits] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Auto-focus input on mount
        inputRef.current?.focus()
    }, [])

    const displayValue = formatBR(rawDigits)
    const valid = isValidBRCell(rawDigits)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const digits = toDigitsOnly(e.target.value)
        setRawDigits(digits.slice(0, 11))
        setError('')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!valid) {
            setError('Digite um número de celular válido com DDD.')
            return
        }

        setLoading(true)
        setError('')

        try {
            // TODO: integrate Supabase Auth + WhatsApp Magic Link
            // Simulates network latency for the skeleton
            await new Promise((r) => setTimeout(r, 900))
            setStep('sent')
        } catch {
            setError('Ocorreu um erro. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    if (step === 'sent') {
        return (
            <SentScreen
                phone={`+55 ${formatBR(rawDigits)}`}
                onBack={() => {
                    setStep('input')
                    setRawDigits('')
                    setError('')
                }}
            />
        )
    }

    return (
        <div className="flex flex-col gap-8 animate-fade-in">
            {/* Brand */}
            <div className="flex flex-col gap-1 pt-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-primary-text">
                    bora<span className="text-brand-green">fut</span>
                </h1>
                <p className="text-sm text-secondary-text">Gestão de partidas amadoras</p>
            </div>

            {/* Card */}
            <div className="bg-surface rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
                {/* Heading */}
                <div className="flex flex-col gap-1.5">
                    <div className="size-10 rounded-2xl bg-brand-green/10 flex items-center justify-center">
                        <MessageCircle size={20} className="text-brand-green" />
                    </div>
                    <h2 className="text-xl font-bold text-primary-text mt-1">Entrar via WhatsApp</h2>
                    <p className="text-sm text-secondary-text leading-relaxed">
                        Digite seu número e enviaremos um link de acesso no seu WhatsApp. Sem senha.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="phone" className="text-xs font-semibold text-secondary-text uppercase tracking-wide">
                            Número de celular
                        </label>

                        <div
                            className={[
                                'flex items-center gap-2 rounded-xl border bg-background px-4 py-3.5 transition-all duration-150',
                                error
                                    ? 'border-brand-red ring-1 ring-brand-red/30'
                                    : 'border-gray-200 focus-within:border-brand-green focus-within:ring-1 focus-within:ring-brand-green/30',
                            ].join(' ')}
                        >
                            {/* Country flag + code */}
                            <span className="text-base select-none shrink-0">🇧🇷</span>
                            <span className="text-sm font-medium text-secondary-text shrink-0">+55</span>
                            <div className="w-px h-4 bg-gray-200 shrink-0" />

                            <input
                                ref={inputRef}
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                placeholder="(11) 99999-9999"
                                value={displayValue}
                                onChange={handleChange}
                                disabled={loading}
                                className="flex-1 bg-transparent text-base font-medium text-primary-text placeholder:text-gray-400 outline-none disabled:opacity-50"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-brand-red font-medium animate-fade-in">{error}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !valid}
                        className={[
                            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-base transition-all duration-150',
                            valid && !loading
                                ? 'bg-brand-green text-white hover:brightness-105 active:scale-[0.97] shadow-sm shadow-brand-green/20'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                        ].join(' ')}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Enviando…
                            </>
                        ) : (
                            <>
                                Receber link
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-secondary-text leading-relaxed px-4">
                Ao continuar, você concorda com os{' '}
                <span className="text-primary-text font-medium underline underline-offset-2 cursor-pointer">
                    Termos de Uso
                </span>{' '}
                e a{' '}
                <span className="text-primary-text font-medium underline underline-offset-2 cursor-pointer">
                    Política de Privacidade
                </span>
                .
            </p>
        </div>
    )
}

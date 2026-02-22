import { useState, useEffect } from 'react'
import { ArrowLeft, Key, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

const PIX_KEY_HINTS: Record<string, string> = {
    cpf: 'Somente números (ex: 12345678901)',
    phone: 'Com DDI e DDD (ex: +5511999999999)',
    email: 'Seu e-mail cadastrado no banco',
    random: 'Chave aleatória gerada pelo banco (ex: 3f2a1b...)',
}

type KeyType = keyof typeof PIX_KEY_HINTS

interface Props {
    session: Session
    onBack: () => void
}

export default function AdminSettings({ session, onBack }: Props) {
    const [pixKey, setPixKey] = useState('')
    const [keyType, setKeyType] = useState<KeyType>('phone')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    // Load existing pixKey
    useEffect(() => {
        supabase
            .from('users')
            .select('pixKey')
            .eq('id', session.user.id)
            .single()
            .then(({ data }) => {
                if (data?.pixKey) setPixKey(data.pixKey)
                setLoading(false)
            })
    }, [session.user.id])

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!pixKey.trim()) return

        setSaving(true)
        setError('')
        setSaved(false)

        const { error } = await supabase
            .from('users')
            .update({ pixKey: pixKey.trim() })
            .eq('id', session.user.id)

        setSaving(false)
        if (error) {
            setError(`Erro ao salvar: ${error.message}`)
        } else {
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        }
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header */}
            <header className="flex items-center gap-3 pt-2">
                <button
                    onClick={onBack}
                    className="size-9 rounded-xl bg-surface border border-gray-200 flex items-center justify-center text-secondary-text hover:text-primary-text hover:border-gray-300 transition-all duration-150 active:scale-95 shadow-sm shrink-0"
                    aria-label="Voltar"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-primary-text leading-tight">Configurações</h1>
                    <p className="text-xs text-secondary-text">Dados do administrador</p>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={22} className="animate-spin text-secondary-text" />
                </div>
            ) : (
                <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
                    {/* Pix key section */}
                    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Key size={16} className="text-brand-green" />
                            <span className="text-xs font-semibold text-secondary-text uppercase tracking-wide">
                                Chave Pix para recebimento
                            </span>
                        </div>
                        <p className="text-[11px] text-secondary-text -mt-2 leading-relaxed">
                            Essa chave será usada para gerar o QR Code que os jogadores vão escanear para pagar.
                        </p>

                        {/* Key type selector */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {(['phone', 'cpf', 'email', 'random'] as KeyType[]).map((type) => {
                                const labels: Record<KeyType, string> = { phone: 'Telefone', cpf: 'CPF', email: 'E-mail', random: 'Aleatória' }
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setKeyType(type)}
                                        className={[
                                            'py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-95',
                                            keyType === type
                                                ? 'bg-brand-green border-brand-green text-white'
                                                : 'bg-background border-gray-200 text-secondary-text hover:border-gray-300',
                                        ].join(' ')}
                                    >
                                        {labels[type]}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Key input */}
                        <input
                            type={keyType === 'email' ? 'email' : 'text'}
                            placeholder={PIX_KEY_HINTS[keyType]}
                            value={pixKey}
                            onChange={(e) => setPixKey(e.target.value)}
                            className="w-full bg-background rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-primary-text placeholder:text-gray-400 outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 transition-all duration-150"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-xs text-brand-red font-medium text-center animate-fade-in">{error}</p>
                    )}

                    {/* Save button */}
                    <button
                        type="submit"
                        disabled={!pixKey.trim() || saving}
                        className={[
                            'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-base transition-all duration-150',
                            saved
                                ? 'bg-brand-green/10 text-brand-green'
                                : pixKey.trim() && !saving
                                    ? 'bg-brand-green text-white hover:brightness-105 active:scale-[0.97] shadow-sm shadow-brand-green/20'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                        ].join(' ')}
                    >
                        {saving ? (
                            <><Loader2 size={18} className="animate-spin" /> Salvando…</>
                        ) : saved ? (
                            <><CheckCircle2 size={18} /> Salvo!</>
                        ) : (
                            'Salvar chave Pix'
                        )}
                    </button>
                </form>
            )}
        </div>
    )
}

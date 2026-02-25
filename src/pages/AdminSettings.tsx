import { createLogger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { ArrowLeft, Key, Loader2, CheckCircle2, Link2, Copy, RefreshCw, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { GroupMembership } from '@/hooks/useCurrentUser'

const logger = createLogger('AdminSettings')

const PIX_KEY_HINTS: Record<string, string> = {
    cpf: 'Somente números (ex: 12345678901)',
    phone: 'Com DDI e DDD (ex: +5511999999999)',
    email: 'Seu e-mail cadastrado no banco',
    random: 'Chave aleatória gerada pelo banco',
}
type KeyType = keyof typeof PIX_KEY_HINTS

const EXPIRY_OPTIONS = [
    { label: '24 horas', hours: 24 },
    { label: '7 dias', hours: 24 * 7 },
    { label: '30 dias', hours: 24 * 30 },
    { label: 'Sem expiração', hours: null },
]

interface Props {
    session: Session
    adminGroups: GroupMembership[]
    onBack: () => void
}

export default function AdminSettings({ session, adminGroups, onBack }: Props) {
    const [pixKey, setPixKey] = useState('')
    const [keyType, setKeyType] = useState<KeyType>('phone')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [pixError, setPixError] = useState('')

    // Invite link state (uses first admin group)
    const activeGroup = adminGroups[0] ?? null
    const [inviteToken, setInviteToken] = useState(activeGroup?.inviteToken ?? '')
    const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(activeGroup?.inviteExpiresAt ?? null)
    const [selectedExpiry, setSelectedExpiry] = useState<number | null>(null)
    const [regenerating, setRegenerating] = useState(false)
    const [copied, setCopied] = useState(false)

    const inviteUrl = `${window.location.origin}?token=${inviteToken}`

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

    async function handleSavePix(e: React.FormEvent) {
        e.preventDefault()
        if (!pixKey.trim()) return
        setSaving(true)
        setPixError('')
        setSaved(false)
        const { error } = await supabase
            .from('users')
            .update({ pixKey: pixKey.trim() })
            .eq('id', session.user.id)
        setSaving(false)
        if (error) {
            logger.error('Erro ao salvar chave Pix', error)
            setPixError(`Erro: ${error.message}`); return
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    async function handleRegenerate() {
        if (!activeGroup) return
        setRegenerating(true)
        const newToken = crypto.randomUUID().replace(/-/g, '')
        const expiresAt = selectedExpiry
            ? new Date(Date.now() + selectedExpiry * 3600000).toISOString()
            : null

        const { error } = await supabase
            .from('groups')
            .update({ inviteToken: newToken, inviteExpiresAt: expiresAt })
            .eq('id', activeGroup.groupId)

        if (!error) {
            setInviteToken(newToken)
            setInviteExpiresAt(expiresAt)
        } else {
            logger.error('Erro ao regenerar link de convite', error)
        }
        setRegenerating(false)
    }

    async function handleCopy() {
        await navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const isExpired = inviteExpiresAt && new Date(inviteExpiresAt) < new Date()

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            <header className="flex items-center gap-3 pt-2">
                <button
                    onClick={onBack}
                    className="size-9 rounded-xl bg-surface border border-gray-200 flex items-center justify-center text-secondary-text hover:text-primary-text transition-all duration-150 active:scale-95 shadow-sm shrink-0"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-primary-text leading-tight">Configurações</h1>
                    <p className="text-xs text-secondary-text">Admin{activeGroup ? ` · ${activeGroup.groupName}` : ''}</p>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={22} className="animate-spin text-secondary-text" />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* ── Invite Link ─── */}
                    {activeGroup && (
                        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <Link2 size={16} className="text-brand-green" />
                                <span className="text-xs font-semibold text-secondary-text uppercase tracking-wide">
                                    Link de convite
                                </span>
                            </div>

                            {isExpired && (
                                <p className="text-[11px] text-amber-600 font-medium bg-amber-50 rounded-lg px-3 py-2">
                                    ⚠️ Este link expirou. Gere um novo.
                                </p>
                            )}

                            <div className="flex items-center gap-2 bg-background rounded-xl border border-gray-200 px-3 py-2.5">
                                <p className="flex-1 text-xs text-secondary-text truncate font-mono">{inviteUrl}</p>
                                <button
                                    onClick={handleCopy}
                                    className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-brand-green hover:text-brand-green/80 transition-colors"
                                >
                                    {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                                    {copied ? 'Copiado!' : 'Copiar'}
                                </button>
                            </div>

                            {inviteExpiresAt && !isExpired && (
                                <p className="text-[11px] text-secondary-text flex items-center gap-1">
                                    <Clock size={11} />
                                    Expira em {new Date(inviteExpiresAt).toLocaleString('pt-BR')}
                                </p>
                            )}

                            {/* Expiry selector */}
                            <div className="flex flex-col gap-2">
                                <p className="text-[11px] text-secondary-text font-medium">Novo link — expira em:</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {EXPIRY_OPTIONS.map(opt => (
                                        <button
                                            key={opt.label}
                                            type="button"
                                            onClick={() => setSelectedExpiry(opt.hours)}
                                            className={[
                                                'py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 active:scale-95',
                                                selectedExpiry === opt.hours
                                                    ? 'bg-brand-green border-brand-green text-white'
                                                    : 'bg-background border-gray-200 text-secondary-text hover:border-gray-300',
                                            ].join(' ')}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={handleRegenerate}
                                    disabled={regenerating}
                                    className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-secondary-text text-xs font-semibold hover:bg-gray-200 active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
                                >
                                    {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                    Gerar novo link
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Pix Key ─── */}
                    <form onSubmit={handleSavePix} noValidate className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Key size={16} className="text-brand-green" />
                            <span className="text-xs font-semibold text-secondary-text uppercase tracking-wide">
                                Chave Pix para recebimento
                            </span>
                        </div>
                        <p className="text-[11px] text-secondary-text -mt-2 leading-relaxed">
                            Usada para gerar o QR Code que os jogadores vão escanear.
                        </p>

                        <div className="grid grid-cols-4 gap-1.5">
                            {(['phone', 'cpf', 'email', 'random'] as KeyType[]).map(type => {
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

                        <input
                            type={keyType === 'email' ? 'email' : 'text'}
                            placeholder={PIX_KEY_HINTS[keyType]}
                            value={pixKey}
                            onChange={e => setPixKey(e.target.value)}
                            className="w-full bg-background rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-primary-text placeholder:text-gray-400 outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 transition-all duration-150"
                        />

                        {pixError && <p className="text-xs text-brand-red font-medium animate-fade-in">{pixError}</p>}

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
                            {saving ? <><Loader2 size={18} className="animate-spin" /> Salvando…</> :
                                saved ? <><CheckCircle2 size={18} /> Salvo!</> :
                                    'Salvar chave Pix'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}

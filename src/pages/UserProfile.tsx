import { useState, useEffect } from 'react'
import { Loader2, Medal, UserRoundMinus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserProfileData } from '@/hooks/useUserProfileData'

interface Props {
    onBack: () => void
}

export default function UserProfile({ onBack }: Props) {
    const { user, refetch, updateProfile } = useCurrentUser()
    const { groups, history, loading: loadingData, error, leaveGroup } = useUserProfileData(user?.id)

    const [isSaving, setIsSaving] = useState(false)
    const [successMsg, setSuccessMsg] = useState(false)
    const [name, setName] = useState(user?.displayName || '')
    const [phone, setPhone] = useState(user?.phoneNumber || '')
    const [position, setPosition] = useState(user?.mainPosition || '')
    const [pixKey, setPixKey] = useState(user?.pixKey || '')

    useEffect(() => {
        if (user) {
            setName(user.displayName || '')
            setPhone(user.phoneNumber || '')
            setPosition(user.mainPosition || '')
            setPixKey(user.pixKey || '')
        }
    }, [user])

    const hasChanges =
        name.trim() !== (user?.displayName || '') ||
        phone.trim() !== (user?.phoneNumber || '') ||
        position !== (user?.mainPosition || '') ||
        pixKey.trim() !== (user?.pixKey || '')

    // Auth User meta
    const [authMeta, setAuthMeta] = useState<{ avatar_url?: string } | null>(null)
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setAuthMeta(data.user?.user_metadata || null))
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            // Re-use standard error banner if name is empty
            // Though HTML5 `required` usually covers it, manual check is safer
            return
        }

        setIsSaving(true)
        const ok = await updateProfile({
            displayName: name.trim(),
            phoneNumber: phone.trim() || null,
            mainPosition: position as any,
            pixKey: pixKey.trim() || null
        })

        if (ok) {
            setSuccessMsg(true)
            setTimeout(() => setSuccessMsg(false), 3000)
        }
        await refetch()
        setIsSaving(false)
    }

    // Phone formatter helper
    const handlePhoneChange = (val: string) => {
        const numbers = val.replace(/\D/g, '')
        if (numbers.length <= 11) {
            let masked = numbers
            if (numbers.length > 2) masked = `(${numbers.slice(0, 2)}) ` + numbers.slice(2)
            if (numbers.length > 7) masked = masked.slice(0, 10) + '-' + numbers.slice(10)
            setPhone(masked)
        }
    }

    if (!user || loadingData) {
        return (
            <div className="flex justify-center items-center h-screen bg-background">
                <Loader2 size={32} className="animate-spin text-brand-green" />
            </div>
        )
    }

    const initials = (name || 'J').substring(0, 2).toUpperCase()

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="px-6 py-2 flex flex-col gap-8 animate-fade-in max-w-lg mx-auto">

                {/* Bloco 1: Identidade e Configurações */}
                <section className="bg-surface rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-6">
                    <div className="relative">
                        {authMeta?.avatar_url ? (
                            <img src={authMeta.avatar_url} alt="Avatar" className="w-28 h-28 rounded-full shadow-md object-cover border-4 border-surface" />
                        ) : (
                            <div className="w-28 h-28 rounded-full bg-brand-green text-white flex items-center justify-center text-3xl font-bold shadow-md border-4 border-surface">
                                {initials}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSave} className="w-full flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-secondary-text uppercase tracking-wide px-1">Nome/Apelido *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="Como você é chamado"
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-primary-text focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-secondary-text uppercase tracking-wide px-1">Telefone (WhatsApp)</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => handlePhoneChange(e.target.value)}
                                placeholder="(11) 99999-9999"
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-primary-text focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-secondary-text uppercase tracking-wide px-1">Posição Principal</label>
                            <select
                                value={position}
                                onChange={e => setPosition(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-primary-text focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none appearance-none"
                            >
                                <option value="ATTACK">Ataque</option>
                                <option value="DEFENSE">Defesa</option>
                                <option value="GOALKEEPER">Goleiro</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-secondary-text uppercase tracking-wide px-1">Chave Pix (Para Admins)</label>
                            <input
                                type="text"
                                value={pixKey}
                                onChange={e => setPixKey(e.target.value)}
                                placeholder="CPF, Celular, E-mail ou Aleatória"
                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-primary-text focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving || !name.trim() || !hasChanges}
                            className={`mt-2 w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 ${successMsg
                                ? 'bg-brand-green text-white hover:bg-brand-green'
                                : 'bg-gray-900 text-white hover:bg-black active:scale-[0.98]'
                                }`}
                        >
                            {isSaving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : successMsg ? (
                                'Salvo com sucesso ✓'
                            ) : (
                                'Salvar Alterações'
                            )}
                        </button>
                    </form>
                </section>

                {/* Bloco 2: Nível e Reputação */}
                <section className="grid grid-cols-2 gap-4">
                    <div className="bg-brand-green rounded-3xl p-5 flex flex-col gap-1 shadow-lg shadow-brand-green/20 text-white justify-center items-center">
                        <Medal size={24} className="opacity-80 mb-1" />
                        <span className="text-4xl font-black">{Number(user.globalScore).toFixed(1)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Global Score</span>
                    </div>
                    <div className="bg-surface border border-gray-100 rounded-3xl p-5 flex flex-col gap-1 shadow-sm justify-center items-center">
                        <span className="text-4xl font-black text-primary-text">{history.length}</span>
                        <span className="text-[10px] font-bold uppercase text-secondary-text tracking-widest text-center">Partidas Jogadas</span>
                        <span className="text-[10px] text-gray-400 mt-1 max-w-[120px] text-center leading-tight">Nas últimas semanas</span>
                    </div>
                </section>

                {/* Bloco 3: Vínculos e Histórico */}
                <section className="flex flex-col gap-6">
                    {/* Grupos */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-sm font-bold text-primary-text uppercase tracking-widest px-1">Meus Grupos ({groups.length})</h2>
                        <div className="flex flex-col gap-2">
                            {groups.map(group => (
                                <div key={group.id} className="bg-surface border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-primary-text">{group.name}</span>
                                        <span className="text-[10px] text-secondary-text mt-0.5">
                                            {group.role === 'ADMIN' ? '👑 Administrador' : 'Jogador'} · Desde {new Date(group.joinedAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Tem certeza que deseja sair do grupo ${group.name}?`)) leaveGroup(group.id)
                                        }}
                                        className="p-2 text-brand-red hover:bg-brand-red/10 rounded-xl transition-colors shrink-0"
                                        title="Sair do grupo"
                                    >
                                        <UserRoundMinus size={18} />
                                    </button>
                                </div>
                            ))}
                            {groups.length === 0 && (
                                <div className="text-xs text-secondary-text text-center py-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    Nenhuma bolha no momento.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Histórico Recente */}
                    <div className="flex flex-col gap-3">
                        <h2 className="text-sm font-bold text-primary-text uppercase tracking-widest px-1">Histórico Recente</h2>
                        <div className="flex flex-col gap-2">
                            {history.map(match => (
                                <button
                                    key={match.id}
                                    onClick={onBack}
                                    className="bg-surface border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all text-left"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-primary-text max-w-[200px] truncate">{match.title || 'Partida'}</span>
                                        <span className="text-[10px] text-secondary-text mt-0.5 max-w-[200px] truncate">{match.groupName}</span>
                                    </div>
                                    <div className="text-[11px] font-semibold text-secondary-text whitespace-nowrap">
                                        {new Date(match.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </div>
                                </button>
                            ))}
                            {history.length === 0 && (
                                <div className="text-xs text-secondary-text text-center py-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    Nenhuma partida jogada recentemente.
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="fixed bottom-6 left-6 right-6 p-4 bg-brand-red/90 text-white rounded-xl text-sm font-medium shadow-xl backdrop-blur text-center z-50">
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}

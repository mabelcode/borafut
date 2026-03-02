import { useState, useEffect } from 'react'
import { Loader2, Medal, UserRoundMinus, Trophy, UserRound, Users, Calendar } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserProfileData, type ProfileGroup, type ProfileMatch } from '@/hooks/useUserProfileData'
import PlayerAvatar from '@/components/PlayerAvatar'

type Tab = 'profile' | 'groups' | 'history'

interface Props {
    onBack: () => void
    onViewMatch?: (matchId: string) => void
}

export default function UserProfile({ onBack, onViewMatch }: Props) {
    const { user, authUser, refetch, updateProfile } = useCurrentUser()
    const { groups, history, loading: loadingData, error, leaveGroup } = useUserProfileData(user?.id)

    const [activeTab, setActiveTab] = useState<Tab>(() => {
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab') as Tab
        return tab && ['profile', 'groups', 'history'].includes(tab) ? tab : 'profile'
    })

    useEffect(() => {
        const url = new URL(window.location.href)
        url.searchParams.set('tab', activeTab)
        window.history.replaceState({}, '', url.toString())
    }, [activeTab])

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'profile', label: 'Perfil', icon: UserRound },
        { id: 'groups', label: 'Grupos', icon: Users },
        { id: 'history', label: 'Histórico', icon: Calendar },
    ]

    const [isSaving, setIsSaving] = useState(false)
    const [successMsg, setSuccessMsg] = useState(false)
    const [localName, setLocalName] = useState<string | null>(null)
    const [localPhone, setLocalPhone] = useState<string | null>(null)
    const [localPosition, setLocalPosition] = useState<string | null>(null)
    const [localPixKey, setLocalPixKey] = useState<string | null>(null)

    const name = localName !== null ? localName : (user?.displayName || '')
    const phone = localPhone !== null ? localPhone : (user?.phoneNumber || '')
    const position = localPosition !== null ? localPosition : (user?.mainPosition || '')
    const pixKey = localPixKey !== null ? localPixKey : (user?.pixKey || '')

    const hasChanges =
        name.trim() !== (user?.displayName || '') ||
        phone.trim() !== (user?.phoneNumber || '') ||
        position !== (user?.mainPosition || '') ||
        (pixKey || '').trim() !== (user?.pixKey || '')

    // Auth User meta
    const authMeta = authUser?.user_metadata as { avatar_url?: string } | null

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSaving(true)
        const ok = await updateProfile({
            displayName: name.trim(),
            phoneNumber: phone.trim() || null,
            mainPosition: (position as "GOALKEEPER" | "DEFENSE" | "ATTACK") || null,
            pixKey: pixKey?.trim() || null
        })

        if (ok) {
            setLocalName(null)
            setLocalPhone(null)
            setLocalPosition(null)
            setLocalPixKey(null)
            setSuccessMsg(true)
            setTimeout(() => setSuccessMsg(false), 3000)
        }
        await refetch()
        setIsSaving(false)
    }

    const handlePhoneChange = (val: string) => {
        const numbers = val.replace(/\D/g, '')
        if (numbers.length <= 11) {
            const area = numbers.slice(0, 2)
            const rest = numbers.slice(2)
            let masked = numbers
            if (area) {
                masked = rest ? `(${area}) ${rest}` : `(${area})`
            }
            if (rest.length > 4) {
                if (numbers.length === 11) {
                    masked = `(${area}) ` + rest.slice(0, 5) + '-' + rest.slice(5)
                } else {
                    masked = `(${area}) ` + rest.slice(0, 4) + '-' + rest.slice(4)
                }
            }
            setLocalPhone(masked)
        }
    }

    if (loadingData) {
        return (
            <div className="flex justify-center items-center h-screen bg-background">
                <Loader2 size={32} className="animate-spin text-brand-green" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-background gap-4">
                <p className="text-secondary-text font-medium">Usuário não encontrado.</p>
                <button onClick={onBack} className="text-brand-green font-bold">Voltar</button>
            </div>
        )
    }

    const initials = (name || 'J').substring(0, 2).toUpperCase()

    return (
        <div className="flex flex-col h-screen bg-background animate-fade-in">
            {/* Header + Tabs Area */}
            <div className="sticky top-0 z-10 bg-surface border-b border-gray-100 shadow-sm flex flex-col">
                {/* Tab Bar */}
                <div className="flex px-2 -mt-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex flex-col items-center gap-1.5 py-3 transition-all relative ${isActive ? 'text-brand-green' : 'text-secondary-text'
                                    }`}
                            >
                                <Icon size={18} />
                                <span className="text-[11px] font-bold uppercase tracking-wider">{tab.label}</span>
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-green rounded-t-full" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto pb-6">
                <div className="px-6 py-4 flex flex-col gap-6 max-w-lg mx-auto w-full">
                    {error && (
                        <div className="p-4 bg-brand-red/90 text-white rounded-xl text-sm font-medium shadow-xl backdrop-blur text-center z-50">
                            {error}
                        </div>
                    )}

                    {/* Conteúdo: PERFIL */}
                    {activeTab === 'profile' && (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Bloco 1: Identidade e Configurações */}
                            <section className="bg-surface rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-4">
                                <div className="relative">
                                    {authMeta?.avatar_url ? (
                                        <img src={authMeta.avatar_url} alt="Avatar" className="w-30 h-30 rounded-full shadow-md object-cover border-4 border-surface" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-brand-green text-white flex items-center justify-center text-3xl font-bold shadow-md border-4 border-surface">
                                            {initials}
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleSave} className="w-full flex flex-col gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-secondary-text uppercase tracking-wide px-1">Nome/Apelido *</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setLocalName(e.target.value)}
                                            required
                                            placeholder="Como você é chamado"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-text focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-secondary-text uppercase tracking-wide px-1">Telefone (WhatsApp)</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => handlePhoneChange(e.target.value)}
                                            placeholder="(11) 99999-9999"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-text focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-secondary-text uppercase tracking-wide px-1">Posição Principal</label>
                                        <select
                                            value={position || ''}
                                            onChange={e => setLocalPosition(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-text focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none appearance-none"
                                        >
                                            <option value="" disabled>Selecione a posição</option>
                                            <option value="ATTACK">Ataque</option>
                                            <option value="DEFENSE">Defesa</option>
                                            <option value="GOALKEEPER">Goleiro</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-secondary-text uppercase tracking-wide px-1">Chave Pix (Para Admins)</label>
                                        <input
                                            type="text"
                                            value={pixKey || ''}
                                            onChange={e => setLocalPixKey(e.target.value)}
                                            placeholder="CPF, Celular, E-mail ou Aleatória"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-text focus:bg-white focus:border-brand-green focus:ring-4 focus:ring-brand-green/10 transition-all outline-none"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSaving || !name.trim() || !hasChanges}
                                        className={`mt-1 w-full py-3 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 ${successMsg
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
                            <section className="grid grid-cols-2 gap-3">
                                <div className="bg-brand-green rounded-3xl p-4 flex flex-col gap-0.5 shadow-lg shadow-brand-green/20 text-white justify-center items-center">
                                    <Medal size={22} className="opacity-80 mb-0.5" />
                                    <span className="text-3xl font-black">{Number(user.globalScore).toFixed(1)}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Global Score</span>
                                </div>
                                <div className="bg-surface border border-gray-100 rounded-3xl p-4 flex flex-col gap-0.5 shadow-sm justify-center items-center">
                                    <span className="text-3xl font-black text-primary-text">{history.length}</span>
                                    <span className="text-[9px] font-bold uppercase text-secondary-text tracking-widest text-center mt-1">Partidas Jogadas</span>
                                    <span className="text-[9px] text-gray-400 mt-0.5 max-w-[120px] text-center leading-tight">Nas últimas semanas</span>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Conteúdo: GRUPOS */}
                    {activeTab === 'groups' && (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {groups.map((group: ProfileGroup) => (
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
                    )}

                    {/* Conteúdo: HISTÓRICO */}
                    {activeTab === 'history' && (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {history.map((match: ProfileMatch) => (
                                <button
                                    key={match.id}
                                    onClick={() => onViewMatch ? onViewMatch(match.id) : onBack()}
                                    className="bg-surface border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl p-4 flex flex-col gap-3 shadow-sm transition-all text-left"
                                >
                                    <div className="flex items-start justify-between w-full">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-primary-text max-w-[200px] truncate">{match.title || 'Partida'}</span>
                                            <span className="text-[10px] text-secondary-text mt-0.5 max-w-[200px] truncate">{match.groupName}</span>
                                        </div>
                                        <div className="text-[11px] font-semibold text-secondary-text whitespace-nowrap">
                                            {new Date(match.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </div>
                                    </div>

                                    {match.mvps && match.mvps.length > 0 && (
                                        <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-100/50 rounded-xl px-3 py-2 w-full relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-amber-100/30 to-transparent pointer-events-none" />
                                            <Trophy size={14} className="text-amber-500 shrink-0" />
                                            <div className="flex -space-x-2">
                                                {match.mvps.map((mvp, i) => (
                                                    <div key={i} className="rounded-full border-2 border-white relative" style={{ zIndex: 10 - i }}>
                                                        <PlayerAvatar src={mvp.avatarUrl} name={mvp.displayName || 'J'} size="sm" />
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-xs font-bold text-amber-600 ml-1 truncate">
                                                {match.mvps.map(m => m.displayName).join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </button>
                            ))}
                            {history.length === 0 && (
                                <div className="text-xs text-secondary-text text-center py-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    Nenhuma partida jogada recentemente.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

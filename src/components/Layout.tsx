import { LogOut, ShieldCheck, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { UserProfile } from '@/hooks/useCurrentUser'

interface Props {
    user: UserProfile | null
    onSignOut: () => void
    onSuperAdmin: () => void
    children: React.ReactNode
}

export default function Layout({ user, onSignOut, onSuperAdmin, children }: Props) {
    const [signingOut, setSigningOut] = useState(false)

    async function handleSignOut() {
        setSigningOut(true)
        onSignOut()
    }

    const firstName = user?.displayName?.split(' ')[0] ?? 'jogador'

    return (
        <div className="min-h-screen bg-background text-primary-text font-sans">
            <div className="mx-auto max-w-md flex flex-col min-h-screen">
                {/* Persistent Header */}
                <header className="flex items-center justify-between p-4 sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-gray-50">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-primary-text leading-none">
                            bora<span className="text-brand-green">fut</span>
                        </h1>
                        <p className="text-[11px] text-secondary-text mt-1">
                            Olá, <span className="font-medium text-primary-text">{firstName}</span> 👋
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {user?.isSuperAdmin && (
                            <button
                                onClick={onSuperAdmin}
                                className="size-9 flex items-center justify-center rounded-xl bg-primary-text text-white shadow-sm hover:brightness-110 active:scale-95 transition-all duration-150"
                                aria-label="Painel Super Admin"
                            >
                                <ShieldCheck size={20} />
                            </button>
                        )}
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className="group flex items-center justify-center size-9 text-secondary-text hover:text-brand-red border border-gray-100 rounded-xl hover:bg-brand-red/5 transition-all duration-150"
                            aria-label="Sair"
                        >
                            {signingOut ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
                            )}
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 px-4 py-6">
                    {children}
                </main>
            </div>
        </div>
    )
}

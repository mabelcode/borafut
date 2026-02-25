import { LogOut, ShieldCheck, Loader2, Menu, X, Home, ChevronRight } from 'lucide-react'
import BrandLogo from './BrandLogo'
import { useState, useEffect } from 'react'
import type { UserProfile } from '@/hooks/useCurrentUser'

interface Props {
    title?: string
    user: UserProfile | null
    onHome: () => void
    onSignOut: () => void
    onSuperAdmin: () => void
    children: React.ReactNode
}

export default function Layout({ title, user, onHome, onSignOut, onSuperAdmin, children }: Props) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [signingOut, setSigningOut] = useState(false)

    // Close menu on ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsMenuOpen(false)
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    // Prevent scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
    }, [isMenuOpen])

    async function handleSignOut() {
        setSigningOut(true)
        onSignOut()
    }

    const initials = user?.displayName
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '??'

    return (
        <div className="min-h-screen bg-background text-primary-text font-sans selection:bg-brand-green/20">
            <div className="mx-auto max-w-md flex flex-col min-h-screen relative">

                {/* Top Navigation Bar */}
                <header className="flex items-center justify-between p-4 sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-gray-50/50 h-16 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="size-10 flex items-center justify-center rounded-xl hover:bg-gray-50 active:scale-95 transition-all duration-150 text-primary-text shrink-0"
                            aria-label="Abrir menu"
                        >
                            <Menu size={24} />
                        </button>
                        {title && (
                            <h2 className="text-sm font-bold text-primary-text/80 uppercase tracking-wider truncate">
                                {title}
                            </h2>
                        )}
                    </div>

                    <div className="cursor-pointer active:scale-95 transition-transform duration-150" onClick={onHome}>
                        <BrandLogo size="md" />
                    </div>
                </header>

                {/* Sidebar Drawer Overlay */}
                {isMenuOpen && (
                    <div
                        className="fixed inset-0 z-[60] bg-primary-text/20 backdrop-blur-sm animate-fade-in"
                        onClick={() => setIsMenuOpen(false)}
                    />
                )}

                {/* Sidebar Drawer */}
                <aside
                    className={`fixed top-0 left-0 z-[70] h-full w-full max-w-[280px] bg-surface shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    {/* Sidebar Header: Profile */}
                    <div className="p-6 pt-10 flex flex-col gap-4 border-b border-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="size-14 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center text-xl font-bold border border-brand-green/20 shadow-inner">
                                {initials}
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="size-10 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors"
                                aria-label="Fechar menu"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-primary-text leading-tight">{user?.displayName || 'Jogador'}</h2>
                            <p className="text-xs text-secondary-text font-medium">{user?.phoneNumber || 'Sem telefone'}</p>
                        </div>
                    </div>

                    {/* Sidebar Navigation */}
                    <nav className="flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto">
                        <button
                            onClick={() => { onHome(); setIsMenuOpen(false) }}
                            className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold text-primary-text hover:bg-gray-50 active:scale-[0.98] transition-all group"
                        >
                            <div className="size-9 rounded-xl flex items-center justify-center bg-gray-50 text-secondary-text group-hover:bg-brand-green/10 group-hover:text-brand-green transition-colors">
                                <Home size={18} />
                            </div>
                            <span>Início</span>
                            <ChevronRight size={16} className="ml-auto text-gray-200" />
                        </button>

                        {user?.isSuperAdmin && (
                            <button
                                onClick={() => { onSuperAdmin(); setIsMenuOpen(false) }}
                                className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold text-primary-text hover:bg-gray-50 active:scale-[0.98] transition-all group"
                            >
                                <div className="size-9 rounded-xl flex items-center justify-center bg-gray-50 text-secondary-text group-hover:bg-brand-green/10 group-hover:text-brand-green transition-colors">
                                    <ShieldCheck size={18} />
                                </div>
                                <span>Painel Super Admin</span>
                                <ChevronRight size={16} className="ml-auto text-gray-200" />
                            </button>
                        )}
                    </nav>

                    {/* Sidebar Footer: Logout */}
                    <div className="p-4 mt-auto border-t border-gray-50">
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-brand-red/5 text-brand-red text-sm font-bold hover:bg-brand-red/10 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {signingOut ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <LogOut size={20} />
                                    Sair da Conta
                                </>
                            )}
                        </button>
                    </div>
                </aside>

                {/* Page Content */}
                <main className="flex-1">
                    {children}
                </main>
            </div>
        </div>
    )
}

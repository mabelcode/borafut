import { useState } from 'react'
import { ArrowLeft, Users, FolderKanban, History, ShieldAlert } from 'lucide-react'
import GroupsTab from '@/pages/admin/GroupsTab'
import UsersTab from '@/pages/admin/UsersTab'
import AuditLogsTab from '@/pages/admin/AuditLogsTab'
import { logger } from '@/lib/logger'

interface Props {
    onBack: () => void
}

type Tab = 'groups' | 'users' | 'logs'

export default function SuperAdmin({ onBack }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('groups')

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'groups', label: 'Grupos', icon: FolderKanban },
        { id: 'users', label: 'Usuários', icon: Users },
        { id: 'logs', label: 'Histórico', icon: History },
    ]

    return (
        <div className="min-h-screen bg-background flex flex-col pb-20 animate-fade-in">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-gray-100 p-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="size-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-secondary-text transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-primary-text flex items-center gap-2">
                            Painel Super Admin <ShieldAlert size={18} className="text-brand-red" />
                        </h1>
                        <p className="text-xs text-secondary-text">Gerenciamento global da plataforma</p>
                    </div>
                </div>
            </header>

            {/* Tab Bar */}
            <div className="flex border-b border-gray-100 bg-surface">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id)
                                logger.trace(`Trocou para aba: ${tab.id}`)
                            }}
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

            {/* Content */}
            <main className="flex-1 overflow-y-auto">
                {activeTab === 'groups' && <GroupsTab />}
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'logs' && <AuditLogsTab />}
            </main>
        </div>
    )
}

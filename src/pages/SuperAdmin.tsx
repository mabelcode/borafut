import { useState } from 'react'
import { Users, FolderKanban, History } from 'lucide-react'
import GroupsTab from '@/pages/admin/GroupsTab'
import UsersTab from '@/pages/admin/UsersTab'
import AuditLogsTab from '@/pages/admin/AuditLogsTab'
import { logger } from '@/lib/logger'

type Tab = 'groups' | 'users' | 'logs'

interface Props {
    onSelectGroup: (groupId: string) => void
}

export default function SuperAdmin({ onSelectGroup }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('groups')

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'groups', label: 'Grupos', icon: FolderKanban },
        { id: 'users', label: 'Usuários', icon: Users },
        { id: 'logs', label: 'Histórico', icon: History },
    ]

    return (
        <div className="flex flex-col animate-fade-in">

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
                {activeTab === 'groups' && <GroupsTab onSelectGroup={onSelectGroup} />}
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'logs' && <AuditLogsTab />}
            </main>
        </div>
    )
}

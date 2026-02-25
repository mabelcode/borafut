import { useState, useEffect } from 'react'
import { Calendar, CircleDollarSign, Users, Settings } from 'lucide-react'
import { logger } from '@/lib/logger'
import GroupMatchesTab from './admin/GroupMatchesTab'
import GroupFinanceTab from './admin/GroupFinanceTab'
import GroupDetailsView from './admin/GroupDetailsView'
import GroupSettingsTab from './admin/GroupSettingsTab'

type Tab = 'matches' | 'finance' | 'members' | 'settings'

interface Props {
    groupId: string
    onBack: () => void
}

export default function GroupAdmin({ groupId, onBack }: Props) {
    const [activeTab, setActiveTab] = useState<Tab>(() => {
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab') as Tab
        return tab && ['matches', 'finance', 'members', 'settings'].includes(tab) ? tab : 'matches'
    })

    useEffect(() => {
        const url = new URL(window.location.href)
        url.searchParams.set('tab', activeTab)
        window.history.replaceState({}, '', url.toString())
    }, [activeTab])

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'matches', label: 'Partidas', icon: Calendar },
        { id: 'finance', label: 'Financeiro', icon: CircleDollarSign },
        { id: 'members', label: 'Membros', icon: Users },
        { id: 'settings', label: 'Ajustes', icon: Settings },
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
                                logger.trace(`Admin trocou para aba: ${tab.id}`)
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
                {activeTab === 'matches' && <GroupMatchesTab groupId={groupId} />}
                {activeTab === 'finance' && <GroupFinanceTab groupId={groupId} />}
                {activeTab === 'members' && (
                    <GroupDetailsView
                        groupId={groupId}
                        onBack={onBack}
                        currentUserRole="ADMIN"
                    />
                )}
                {activeTab === 'settings' && <GroupSettingsTab groupId={groupId} />}
            </main>
        </div>
    )
}

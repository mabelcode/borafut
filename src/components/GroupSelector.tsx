import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Circle } from 'lucide-react'
import type { GroupMembership } from '@/hooks/useCurrentUser'

interface Props {
    groups: GroupMembership[]
    selectedGroupId: string | null
    onChange: (groupId: string | null) => void
    showAllOption?: boolean
}

export default function GroupSelector({ groups, selectedGroupId, onChange, showAllOption = true }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close dropdown on click-outside
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isOpen])

    // Single group → fixed pill, no dropdown
    if (groups.length <= 1 && !showAllOption) {
        const name = groups[0]?.groupName ?? 'Grupo'
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-green/8 border border-brand-green/15">
                <span className="text-xs font-bold text-brand-green">⚽</span>
                <span className="text-sm font-semibold text-primary-text truncate max-w-[180px]">{name}</span>
            </div>
        )
    }

    const selectedGroup = groups.find(g => g.groupId === selectedGroupId)
    const label = selectedGroup ? selectedGroup.groupName : 'Todos os grupos'

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-150 ${
                    isOpen
                        ? 'bg-white border-brand-green shadow-sm shadow-brand-green/10'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white'
                }`}
            >
                <span className="text-sm">⚽</span>
                <span className="text-sm font-semibold text-primary-text truncate max-w-[160px]">{label}</span>
                <ChevronDown
                    size={14}
                    className={`text-secondary-text transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl shadow-black/8 z-50 overflow-hidden animate-spring-up">
                    {showAllOption && (
                        <button
                            onClick={() => { onChange(null); setIsOpen(false) }}
                            className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors ${
                                selectedGroupId === null
                                    ? 'bg-brand-green/5 text-brand-green font-semibold'
                                    : 'text-primary-text hover:bg-gray-50'
                            }`}
                        >
                            <Circle size={8} className={selectedGroupId === null ? 'fill-brand-green text-brand-green' : 'text-gray-300'} />
                            Todos os grupos
                        </button>
                    )}

                    {showAllOption && groups.length > 0 && (
                        <div className="h-px bg-gray-100 mx-3" />
                    )}

                    {groups.map(g => (
                        <button
                            key={g.groupId}
                            onClick={() => { onChange(g.groupId); setIsOpen(false) }}
                            className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors ${
                                selectedGroupId === g.groupId
                                    ? 'bg-brand-green/5 text-brand-green font-semibold'
                                    : 'text-primary-text hover:bg-gray-50'
                            }`}
                        >
                            <Circle size={8} className={selectedGroupId === g.groupId ? 'fill-brand-green text-brand-green' : 'text-gray-300'} />
                            <span className="truncate">{g.groupName}</span>
                            {g.role === 'ADMIN' && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-brand-green/10 text-brand-green uppercase tracking-wider ml-auto shrink-0">
                                    Admin
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

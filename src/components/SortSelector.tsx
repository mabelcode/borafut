import type { LucideIcon } from 'lucide-react'

export interface SortOption<T extends string> {
    id: T
    label: string
    icon: LucideIcon
}

interface SortSelectorProps<T extends string> {
    options: SortOption<T>[]
    currentValue: T
    onChange: (value: T) => void
}

export default function SortSelector<T extends string>({
    options,
    currentValue,
    onChange
}: SortSelectorProps<T>) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none custom-scrollbar-hidden">
            {options.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-extrabold border transition-all whitespace-nowrap active:scale-95 ${currentValue === item.id
                        ? 'bg-brand-green text-white border-brand-green shadow-md shadow-brand-green/10'
                        : 'bg-white text-secondary-text border-gray-100 hover:bg-gray-50'
                        }`}
                >
                    <item.icon size={11} />
                    {item.label}
                </button>
            ))}
        </div>
    )
}

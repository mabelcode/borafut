import { useState } from 'react'

const POSITION_COLORS: Record<string, string> = {
    GOALKEEPER: 'bg-amber-100 text-amber-700 border-amber-200',
    DEFENSE: 'bg-blue-100 text-blue-700 border-blue-200',
    ATTACK: 'bg-red-100 text-red-700 border-red-200',
}

const DEFAULT_COLOR = 'bg-brand-green/10 text-brand-green border-brand-green/20'

interface Props {
    src?: string | null
    name: string
    /** Optional position to colorize the fallback circle */
    position?: string | null
    size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
    sm: 'size-8 text-[10px]',
    md: 'size-10 text-sm',
    lg: 'size-28 text-3xl',
}

/**
 * Reusable avatar component.
 * Shows the player's Google OAuth photo when available,
 * falls back to colored initials on error or when missing.
 */
export default function PlayerAvatar({ src, name, position, size = 'md' }: Props) {
    const [imgError, setImgError] = useState(false)
    const initials = name
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?'

    const sizeClass = SIZE_MAP[size]
    const colorClass = position ? (POSITION_COLORS[position] ?? DEFAULT_COLOR) : DEFAULT_COLOR

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={name}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className={`${sizeClass} rounded-full object-cover border shrink-0`}
            />
        )
    }

    return (
        <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold border shrink-0 ${colorClass}`}>
            {initials}
        </div>
    )
}

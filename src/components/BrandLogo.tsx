interface BrandLogoProps {
    className?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function BrandLogo({ className = '', size = 'md' }: BrandLogoProps) {
    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl',
        xl: 'text-5xl',
    }

    return (
        <span className={`font-extrabold tracking-tight select-none ${sizeClasses[size]} ${className}`}>
            <span className="text-primary-text">Bora</span>
            <span className="text-brand-green">Fut</span>
        </span>
    )
}

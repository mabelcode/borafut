import { CheckCircle } from 'lucide-react'

export default function Home() {
    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <header className="flex flex-col gap-2 pt-4">
                <h1 className="text-4xl font-extrabold tracking-tight text-primary-text">
                    bora<span className="text-brand-green">fut</span>
                </h1>
                <p className="text-secondary-text text-sm">
                    Seu aplicativo de futebol favorito 🟢
                </p>
            </header>

            {/* Demo card */}
            <div className="bg-surface rounded-2xl shadow-sm p-6 flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-primary-text">
                    Configuração do Tema
                </h2>

                <ul className="flex flex-col gap-2 text-sm text-secondary-text">
                    <li className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-brand-green" />
                        Vite + React + TypeScript
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-brand-green" />
                        Tailwind CSS com paleta personalizada
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-brand-green" />
                        Fonte Inter via Google Fonts
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-brand-green" />
                        React Query + Supabase instalados
                    </li>
                    <li className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-brand-green" />
                        Path alias @/* configurado
                    </li>
                </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3">
                <button className="w-full bg-brand-green text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all duration-150">
                    Botão de Ação Principal
                </button>
                <button className="w-full bg-brand-red text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all duration-150">
                    Botão Destrutivo
                </button>
                <button className="w-full bg-surface text-primary-text font-semibold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all duration-150 shadow-sm">
                    Botão Secundário
                </button>
            </div>

            {/* Color palette preview */}
            <div className="bg-surface rounded-2xl shadow-sm p-6 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wide">
                    Paleta de Cores
                </h2>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { name: 'brand-green', color: '#10B981' },
                        { name: 'brand-red', color: '#EF4444' },
                        { name: 'surface', color: '#FFFFFF' },
                        { name: 'background', color: '#F3F4F6' },
                        { name: 'primary-text', color: '#111827' },
                        { name: 'secondary-text', color: '#6B7280' },
                    ].map(({ name, color }) => (
                        <div key={name} className="flex flex-col gap-1 items-center">
                            <div
                                className="w-full h-10 rounded-lg border border-gray-200"
                                style={{ backgroundColor: color }}
                            />
                            <span className="text-[10px] text-secondary-text text-center leading-tight">
                                {name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

import { Users } from 'lucide-react'

interface Props {
    onRefresh?: () => void
}

export default function WaitingForInvite({ onRefresh }: Props) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-fade-in text-center px-6 py-4">
            <div className="size-20 rounded-3xl bg-brand-green/10 flex items-center justify-center">
                <Users size={36} className="text-brand-green" />
            </div>

            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-extrabold text-primary-text">
                    Aguardando convite
                </h1>
                <p className="text-secondary-text text-sm leading-relaxed max-w-[280px]">
                    Você ainda não faz parte de nenhuma bolha. Peça ao gerente do seu grupo
                    para compartilhar o link de convite.
                </p>
            </div>

            <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-4 w-full max-w-[300px] flex flex-col gap-2">
                <p className="text-xs font-semibold text-secondary-text uppercase tracking-wide">Como entrar</p>
                <div className="flex items-start gap-3 text-left">
                    <span className="size-6 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-sm text-primary-text">Peça o link de convite ao gerente da pelada</p>
                </div>
                <div className="flex items-start gap-3 text-left">
                    <span className="size-6 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-sm text-primary-text">Abra o link no seu celular</p>
                </div>
                <div className="flex items-start gap-3 text-left">
                    <span className="size-6 rounded-full bg-brand-green/10 text-brand-green text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-sm text-primary-text">Pronto! Você entra automaticamente na bolha</p>
                </div>
            </div>

            {onRefresh && (
                <button
                    onClick={onRefresh}
                    className="text-sm text-brand-green font-semibold hover:underline transition-colors"
                >
                    Já entrei pelo link — atualizar
                </button>
            )}
        </div>
    )
}

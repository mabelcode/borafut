import * as Sentry from '@sentry/react'
import { useEffect, useRef, useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Session } from '@supabase/supabase-js'

interface Props {
    token: string
    session: Session
    onSuccess: () => void
    onError: () => void
}

type JoinState = 'loading' | 'success' | 'expired' | 'already-member' | 'error'

export default function JoinGroup({ token, session, onSuccess, onError }: Props) {
    const [state, setState] = useState<JoinState>('loading')
    const [groupName, setGroupName] = useState('')

    // Stabilize onSuccess callback which might be passed inline
    const onSuccessRef = useRef(onSuccess)
    useEffect(() => {
        onSuccessRef.current = onSuccess
    }, [onSuccess])

    useEffect(() => {
        let cancelled = false
        let timeoutId: ReturnType<typeof setTimeout> | null = null

        async function join() {
            try {
                // 1. Get group info to show the name
                const { data: groupData, error: groupErr } = await supabase
                    .rpc('get_group_by_token', { token_text: token })

                if (cancelled) return

                const group = Array.isArray(groupData) ? groupData[0] : groupData

                if (groupErr || !group) {
                    setState('error')
                    return
                }

                setGroupName(group.name)

                // 2. Try to join via secure RPC
                const { error: joinErr } = await supabase.rpc('join_group_via_token', { token_text: token })

                if (cancelled) return

                if (joinErr) {
                    if (joinErr.message.includes('expirado')) {
                        setState('expired')
                    } else {
                        setState('error')
                        logger.error('Erro ao entrar no grupo via RPC', joinErr)
                        Sentry.captureException(joinErr, { tags: { context: 'JoinGroup.rpc' } })
                    }
                    return
                }

                setState('success')
                timeoutId = setTimeout(() => {
                    if (!cancelled) {
                        onSuccessRef.current()
                    }
                }, 1800)
            } catch (err) {
                if (!cancelled) {
                    logger.error('Erro inesperado ao entrar no grupo', err)
                    setState('error')
                }
            }
        }

        join()

        return () => {
            cancelled = true
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [token, session.user.id])

    const configs: Record<JoinState, { icon: React.ReactNode; title: string; desc: string; color: string }> = {
        loading: {
            icon: <Loader2 size={36} className="animate-spin text-brand-green" />,
            title: 'Entrando na bolha…',
            desc: 'Verificando o link de convite.',
            color: 'bg-brand-green/10',
        },
        success: {
            icon: <CheckCircle2 size={36} className="text-brand-green" />,
            title: `Bem-vindo à ${groupName}!`,
            desc: 'Você entrou na bolha com sucesso.',
            color: 'bg-brand-green/10',
        },
        'already-member': {
            icon: <CheckCircle2 size={36} className="text-brand-green" />,
            title: 'Você já faz parte!',
            desc: `Você já é membro de ${groupName}.`,
            color: 'bg-brand-green/10',
        },
        expired: {
            icon: <XCircle size={36} className="text-amber-500" />,
            title: 'Link expirado',
            desc: 'Este link de convite não é mais válido. Peça um novo ao gerente.',
            color: 'bg-amber-50',
        },
        error: {
            icon: <XCircle size={36} className="text-brand-red" />,
            title: 'Link inválido',
            desc: 'Não foi possível encontrar este grupo. Verifique o link e tente novamente.',
            color: 'bg-red-50',
        },
    }

    const cfg = configs[state]

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-fade-in px-4 text-center">
            <div className={`size-20 rounded-3xl ${cfg.color} flex items-center justify-center`}>
                {cfg.icon}
            </div>
            <div className="flex flex-col gap-2">
                <h1 className="text-xl font-extrabold text-primary-text">{cfg.title}</h1>
                <p className="text-secondary-text text-sm leading-relaxed max-w-[280px]">{cfg.desc}</p>
            </div>
            {(state === 'expired' || state === 'error') && (
                <button
                    onClick={onError}
                    className="text-sm text-secondary-text hover:text-primary-text transition-colors"
                >
                    Voltar ao início
                </button>
            )}
        </div>
    )
}

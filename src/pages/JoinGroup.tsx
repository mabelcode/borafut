import * as Sentry from '@sentry/react'
import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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

    useEffect(() => {
        async function join() {
            // 1. Find group by token
            const { data: group, error: groupErr } = await supabase
                .from('groups')
                .select('id, name, inviteExpiresAt')
                .eq('inviteToken', token)
                .single()

            if (groupErr || !group) {
                if (groupErr) Sentry.captureException(groupErr, { tags: { context: 'JoinGroup.findGroup' } })
                setState('error')
                return
            }

            setGroupName(group.name)

            // 2. Check expiry
            if (group.inviteExpiresAt && new Date(group.inviteExpiresAt) < new Date()) {
                setState('expired')
                return
            }

            // 3. Check if already a member
            const { data: existing } = await supabase
                .from('group_members')
                .select('id')
                .eq('groupId', group.id)
                .eq('userId', session.user.id)
                .maybeSingle()

            if (existing) {
                setState('already-member')
                setTimeout(onSuccess, 1500)
                return
            }

            // 4. Insert membership as PLAYER
            const { error: insertErr } = await supabase
                .from('group_members')
                .insert({ groupId: group.id, userId: session.user.id, role: 'PLAYER' })

            if (insertErr) {
                Sentry.captureException(insertErr, { tags: { context: 'JoinGroup.insertMember' } })
                setState('error')
                return
            }

            setState('success')
            setTimeout(onSuccess, 1800)
        }

        join()
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

import { useState, useEffect } from 'react'
import { Loader2, Info, User, Target, Clock, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/react'

export default function AuditLogsTab() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    async function fetchLogs() {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('audit_log')
                .select(`
          *,
          actor:users(displayName)
        `)
                .order('createdAt', { ascending: false })
                .limit(50)

            if (error) throw error
            setLogs(data || [])
        } catch (err) {
            logger.error('Erro ao buscar logs de auditoria', err)
            Sentry.captureException(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    function formatAction(action: string) {
        const actions: Record<string, string> = {
            CREATE_GROUP: 'Criou um grupo',
            DELETE_GROUP: 'Deletou um grupo',
            PROMOTE_ADMIN: 'Promoveu a Admin',
            DEMOTE_PLAYER: 'Rebaixou a Jogador',
            CONFIRM_PAYMENT: 'Confirmou pagamento',
            UPDATE_GROUP: 'Atualizou um grupo',
            ADD_GROUP_MEMBER: 'Adicionou integrante',
        }
        return actions[action] || action
    }

    return (
        <div className="p-4 flex flex-col gap-4">
            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-secondary-text" />
                </div>
            ) : logs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <Info size={32} className="text-gray-200" />
                    <p className="text-sm text-secondary-text">Nenhum log registrado</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {logs.map((log) => (
                        <div key={log.id} className="relative pl-5 border-l-2 border-gray-100 flex flex-col gap-1.5">
                            <div className="absolute -left-[5px] top-1 size-2 rounded-full bg-brand-green shadow-[0_0_0_3px_white]" />

                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-primary-text uppercase tracking-wider">
                                    {formatAction(log.action)}
                                </span>
                                <span className="text-[9px] text-secondary-text flex items-center gap-1">
                                    <Clock size={10} />
                                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1 text-[10px] text-secondary-text bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                    <User size={10} />
                                    {log.actor?.displayName || 'Sistema'}
                                </div>
                                {log.targetType && (
                                    <div className="flex items-center gap-1 text-[10px] text-secondary-text bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                        <Target size={10} />
                                        {log.targetType}: {log.targetId?.split('-')[0]}
                                    </div>
                                )}
                            </div>

                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="flex items-start gap-1 p-2 bg-gray-50 rounded-lg border border-gray-100 mt-1">
                                    <MessageSquare size={10} className="text-secondary-text mt-0.5 shrink-0" />
                                    <pre className="text-[9px] text-secondary-text font-mono whitespace-pre-wrap">
                                        {JSON.stringify(log.metadata)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

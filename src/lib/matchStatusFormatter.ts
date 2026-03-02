/**
 * Pure formatter for match status sharing text.
 * Generates a professional, emoji-rich message suitable for WhatsApp groups.
 *
 * Deadline logic:
 *   deadlineDate = scheduledAt − confirmationDeadlineHours
 *   Only shown when the match was created with enough lead time for
 *   the deadline to be meaningful (i.e. deadlineDate > createdAt).
 */

export interface MatchStatusInput {
    title: string
    scheduledAt: string
    maxPlayers: number
    price: number
    confirmationDeadlineHours: number
    createdAt: string
    registrations: Array<{
        status: 'RESERVED' | 'CONFIRMED' | 'WAITLIST'
        displayName: string
    }>
}

function formatDateLong(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    })
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatCurrencyBRL(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value)
}

function formatDeadlineDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
}

function formatDeadlineTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

export interface DeadlineInfo {
    /** The date/time by which players must confirm */
    deadlineDate: Date
    hoursRemaining: number
    isExpired: boolean
    /** Whether the deadline is applicable (match created with enough lead time) */
    isApplicable: boolean
    label: string
}

/**
 * Computes the confirmation deadline.
 *
 * The deadline = scheduledAt − confirmationDeadlineHours.
 * It is only "applicable" when the match was created early enough
 * for the deadline to fall after createdAt (i.e. logically meaningful).
 */
export function computeDeadline(
    scheduledAt: string,
    confirmationDeadlineHours: number,
    createdAt: string,
    now: Date = new Date(),
): DeadlineInfo {
    const scheduledMs = new Date(scheduledAt).getTime()
    const createdMs = new Date(createdAt).getTime()
    const deadlineMs = scheduledMs - confirmationDeadlineHours * 60 * 60 * 1000
    const deadlineDate = new Date(deadlineMs)

    // Deadline is only meaningful if it falls after the match was created
    const isApplicable = deadlineMs > createdMs

    const diffMs = deadlineMs - now.getTime()
    const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))
    const minutesRemaining = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)))
    const isExpired = diffMs <= 0

    let label: string
    if (!isApplicable) {
        label = 'Sem prazo definido'
    } else if (isExpired) {
        label = 'Prazo expirado'
    } else if (hoursRemaining >= 1) {
        label = `${hoursRemaining}h restantes`
    } else {
        label = `${minutesRemaining}min restantes`
    }

    return { deadlineDate, hoursRemaining, isExpired, isApplicable, label }
}

export function formatMatchStatus(input: MatchStatusInput, now: Date = new Date()): string {
    const {
        title, scheduledAt, maxPlayers, price,
        confirmationDeadlineHours, createdAt, registrations,
    } = input

    const confirmed = registrations.filter(r => r.status === 'CONFIRMED')
    const reserved = registrations.filter(r => r.status === 'RESERVED')
    const totalOccupied = confirmed.length + reserved.length
    const spotsLeft = Math.max(0, maxPlayers - totalOccupied)

    const deadline = computeDeadline(scheduledAt, confirmationDeadlineHours, createdAt, now)

    const lines: string[] = []

    // Header
    lines.push('⚽ *BORAFUT — Status da partida*')
    lines.push('')

    // Match info
    lines.push(`📋 *${title}*`)
    lines.push(`📅 ${capitalizeFirst(formatDateLong(scheduledAt))}`)
    lines.push(`⏰ ${formatTime(scheduledAt)}`)
    lines.push('')

    // Spots & Price
    const spotsText = spotsLeft > 0
        ? `${totalOccupied}/${maxPlayers} (${spotsLeft} disponíveis)`
        : `${totalOccupied}/${maxPlayers} (Lotado!)`
    lines.push(`👥 Vagas: ${spotsText}`)
    lines.push(`💰 Taxa: ${formatCurrencyBRL(price)}`)
    lines.push('')

    // Confirmed players
    if (confirmed.length > 0) {
        lines.push(`✅ *Confirmados (${confirmed.length}):*`)
        confirmed.forEach(p => lines.push(`  • ${p.displayName}`))
        lines.push('')
    }

    // Pending payment
    if (reserved.length > 0) {
        lines.push(`⏳ *Aguardando Pagamento (${reserved.length}):*`)
        reserved.forEach(p => lines.push(`  • ${p.displayName}`))
        lines.push('')
    }

    // No players
    if (confirmed.length === 0 && reserved.length === 0) {
        lines.push('📭 Nenhum jogador inscrito ainda.')
        lines.push('')
    }

    // Deadline — only show when applicable (match created with enough lead time)
    if (deadline.isApplicable) {
        if (deadline.isExpired) {
            lines.push('🔴 *Prazo para confirmação expirado*')
        } else {
            lines.push(`⚠️ Prazo para confirmação: *${deadline.label}*`)
            lines.push(`   (Confirme até ${formatDeadlineDate(deadline.deadlineDate.toISOString())} às ${formatDeadlineTime(deadline.deadlineDate.toISOString())})`)
        }
        lines.push('')
    }

    lines.push('🔗 borafut.com.br')

    return lines.join('\n')
}

function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

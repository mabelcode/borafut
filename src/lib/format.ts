/**
 * Formats a number as a Brazilian real currency string.
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value)
}

/**
 * Formats an ISO date string into a readable date and time.
 */
export function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

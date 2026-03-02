import { describe, it, expect } from 'vitest'
import { formatMatchStatus, computeDeadline } from './matchStatusFormatter'

// Match created 3 days before, scheduled 4 days after creation → 48h deadline is applicable
const baseInput = {
    title: 'Pelada de Quinta',
    scheduledAt: '2026-03-10T23:00:00Z', // match at 20:00 BRT on 10/03
    maxPlayers: 10,
    price: 25,
    confirmationDeadlineHours: 48,
    createdAt: '2026-03-06T01:00:00Z',   // created 22:00 BRT on 05/03
    registrations: [
        { status: 'CONFIRMED' as const, displayName: 'João Silva' },
        { status: 'CONFIRMED' as const, displayName: 'Pedro Santos' },
        { status: 'RESERVED' as const, displayName: 'Carlos Lima' },
        { status: 'RESERVED' as const, displayName: 'Ana Souza' },
    ],
}

describe('formatMatchStatus', () => {
    // "now" is 2 days before the match → deadline (scheduledAt - 48h) = 08/03 23:00 UTC
    // 24h remaining from this "now"
    const now = new Date('2026-03-07T23:00:00Z')

    it('contains match title', () => {
        const text = formatMatchStatus(baseInput, now)
        expect(text).toContain('Pelada de Quinta')
    })

    it('contains BORAFUT header', () => {
        const text = formatMatchStatus(baseInput, now)
        expect(text).toContain('⚽ *BORAFUT — Status da partida*')
    })

    it('lists confirmed players', () => {
        const text = formatMatchStatus(baseInput, now)
        expect(text).toContain('✅ *Confirmados (2):*')
        expect(text).toContain('• João Silva')
        expect(text).toContain('• Pedro Santos')
    })

    it('lists reserved players', () => {
        const text = formatMatchStatus(baseInput, now)
        expect(text).toContain('⏳ *Aguardando Pagamento (2):*')
        expect(text).toContain('• Carlos Lima')
        expect(text).toContain('• Ana Souza')
    })

    it('shows correct spots info', () => {
        const text = formatMatchStatus(baseInput, now)
        expect(text).toContain('4/10 (6 disponíveis)')
    })

    it('shows Lotado when full', () => {
        const fullInput = { ...baseInput, maxPlayers: 4 }
        const text = formatMatchStatus(fullInput, now)
        expect(text).toContain('Lotado!')
    })

    it('shows deadline info when applicable', () => {
        const text = formatMatchStatus(baseInput, now)
        expect(text).toContain('24h restantes')
        expect(text).toContain('Prazo para confirmação')
    })

    it('shows expired deadline', () => {
        const expiredNow = new Date('2026-03-10T00:00:00Z') // past deadline
        const text = formatMatchStatus(baseInput, expiredNow)
        expect(text).toContain('Prazo para confirmação expirado')
    })

    it('omits deadline when match is too close (not applicable)', () => {
        const closeMatch = {
            ...baseInput,
            scheduledAt: '2026-03-06T02:00:00Z', // only 1h after creation
            createdAt: '2026-03-06T01:00:00Z',
            confirmationDeadlineHours: 48,
        }
        const text = formatMatchStatus(closeMatch, new Date('2026-03-06T01:30:00Z'))
        expect(text).not.toContain('Prazo para confirmação')
        expect(text).not.toContain('restantes')
        // Should still contain the rest of the info
        expect(text).toContain('Pelada de Quinta')
        expect(text).toContain('borafut.com.br')
    })

    it('shows empty state', () => {
        const emptyInput = { ...baseInput, registrations: [] }
        const text = formatMatchStatus(emptyInput, now)
        expect(text).toContain('Nenhum jogador inscrito ainda')
    })

    it('contains branding footer', () => {
        const text = formatMatchStatus(baseInput, now)
        expect(text).toContain('borafut.com.br')
    })

    it('contains price', () => {
        const text = formatMatchStatus(baseInput, now)
        expect(text).toMatch(/R\$\s*25,00/)
    })
})

describe('computeDeadline', () => {
    it('calculates deadline as scheduledAt minus hours', () => {
        // Match at 10/03 23:00, deadline 48h before = 08/03 23:00
        const result = computeDeadline(
            '2026-03-10T23:00:00Z', // scheduledAt
            48,                      // hours
            '2026-03-06T00:00:00Z', // createdAt
            new Date('2026-03-07T23:00:00Z'), // now
        )
        // Deadline is 08/03 23:00, now is 07/03 23:00 → 24h remaining
        expect(result.hoursRemaining).toBe(24)
        expect(result.isExpired).toBe(false)
        expect(result.isApplicable).toBe(true)
    })

    it('returns expired when past deadline', () => {
        const result = computeDeadline(
            '2026-03-10T23:00:00Z',
            48,
            '2026-03-06T00:00:00Z',
            new Date('2026-03-09T00:00:00Z'), // past 08/03 23:00
        )
        expect(result.hoursRemaining).toBe(0)
        expect(result.isExpired).toBe(true)
        expect(result.isApplicable).toBe(true)
        expect(result.label).toBe('Prazo expirado')
    })

    it('shows minutes when less than 1 hour remaining', () => {
        const result = computeDeadline(
            '2026-03-10T23:00:00Z',
            48,
            '2026-03-06T00:00:00Z',
            new Date('2026-03-08T22:30:00Z'), // 30 min before deadline
        )
        expect(result.hoursRemaining).toBe(0)
        expect(result.isExpired).toBe(false)
        expect(result.label).toBe('30min restantes')
    })

    it('marks not applicable when match created too close', () => {
        // Match at 01:00, created at 00:00 → deadline would be 00:00 - 48h = 2 days ago
        // deadlineMs < createdMs → not applicable
        const result = computeDeadline(
            '2026-03-06T01:00:00Z', // scheduledAt (1h after creation)
            48,
            '2026-03-06T00:00:00Z', // createdAt
            new Date('2026-03-06T00:30:00Z'),
        )
        expect(result.isApplicable).toBe(false)
        expect(result.label).toBe('Sem prazo definido')
    })

    it('marks applicable when match has enough lead time', () => {
        // Match in 72h, deadline 48h → deadline is 24h from now → applicable
        const result = computeDeadline(
            '2026-03-09T00:00:00Z',
            48,
            '2026-03-06T00:00:00Z',
            new Date('2026-03-06T00:00:00Z'),
        )
        expect(result.isApplicable).toBe(true)
        expect(result.hoursRemaining).toBe(24)
    })
})

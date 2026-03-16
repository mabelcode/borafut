import { describe, it, expect } from 'vitest'
import {
    calculateRegistrationOutcome,
    type ExistingRegistration,
} from './registrationPriority'

function makeReg(
    overrides: Partial<ExistingRegistration> & { id: string },
): ExistingRegistration {
    return {
        status: 'CONFIRMED',
        subscriptionType: 'AVULSO',
        createdAt: new Date().toISOString(),
        ...overrides,
    }
}

describe('calculateRegistrationOutcome', () => {
    const MAX = 10

    it('Cenário A: Avulso com vagas → RESERVED', () => {
        const existing: ExistingRegistration[] = [
            makeReg({ id: 'r1', status: 'CONFIRMED' }),
        ]
        const result = calculateRegistrationOutcome('AVULSO', existing, MAX)

        expect(result.newPlayerStatus).toBe('RESERVED')
        expect(result.displacedRegistrationId).toBeNull()
    })

    it('Cenário A: Mensalista com vagas → CONFIRMED', () => {
        const existing: ExistingRegistration[] = [
            makeReg({ id: 'r1', status: 'CONFIRMED' }),
        ]
        const result = calculateRegistrationOutcome('MENSALISTA', existing, MAX)

        expect(result.newPlayerStatus).toBe('CONFIRMED')
        expect(result.displacedRegistrationId).toBeNull()
    })

    it('Avulso sem vagas → WAITLIST', () => {
        const existing: ExistingRegistration[] = Array.from({ length: MAX }, (_, i) =>
            makeReg({ id: `r${i}`, status: 'CONFIRMED' })
        )
        const result = calculateRegistrationOutcome('AVULSO', existing, MAX)

        expect(result.newPlayerStatus).toBe('WAITLIST')
        expect(result.displacedRegistrationId).toBeNull()
    })

    it('Cenário B: Mensalista desloca último Avulso RESERVED', () => {
        const existing: ExistingRegistration[] = [
            ...Array.from({ length: MAX - 2 }, (_, i) =>
                makeReg({ id: `c${i}`, status: 'CONFIRMED' })
            ),
            makeReg({ id: 'res-old', status: 'RESERVED', subscriptionType: 'AVULSO', createdAt: '2024-01-01T10:00:00Z' }),
            makeReg({ id: 'res-new', status: 'RESERVED', subscriptionType: 'AVULSO', createdAt: '2024-01-01T11:00:00Z' }),
        ]
        const result = calculateRegistrationOutcome('MENSALISTA', existing, MAX)

        expect(result.newPlayerStatus).toBe('CONFIRMED')
        // Desloca o mais recente
        expect(result.displacedRegistrationId).toBe('res-new')
    })

    it('Cenário B: Múltiplos RESERVED avulsos — desloca apenas o mais recente', () => {
        const existing: ExistingRegistration[] = [
            ...Array.from({ length: MAX - 3 }, (_, i) =>
                makeReg({ id: `c${i}`, status: 'CONFIRMED' })
            ),
            makeReg({ id: 'res-1', status: 'RESERVED', subscriptionType: 'AVULSO', createdAt: '2024-01-01T08:00:00Z' }),
            makeReg({ id: 'res-2', status: 'RESERVED', subscriptionType: 'AVULSO', createdAt: '2024-01-01T09:00:00Z' }),
            makeReg({ id: 'res-3', status: 'RESERVED', subscriptionType: 'AVULSO', createdAt: '2024-01-01T10:00:00Z' }),
        ]
        const result = calculateRegistrationOutcome('MENSALISTA', existing, MAX)

        expect(result.newPlayerStatus).toBe('CONFIRMED')
        expect(result.displacedRegistrationId).toBe('res-3')
    })

    it('Cenário C: Mensalista sem vagas, todos CONFIRMED → WAITLIST', () => {
        const existing: ExistingRegistration[] = Array.from({ length: MAX }, (_, i) =>
            makeReg({ id: `c${i}`, status: 'CONFIRMED' })
        )
        const result = calculateRegistrationOutcome('MENSALISTA', existing, MAX)

        expect(result.newPlayerStatus).toBe('WAITLIST')
        expect(result.displacedRegistrationId).toBeNull()
    })

    it('Cenário B: Não desloca RESERVED de outro Mensalista', () => {
        const existing: ExistingRegistration[] = [
            ...Array.from({ length: MAX - 1 }, (_, i) =>
                makeReg({ id: `c${i}`, status: 'CONFIRMED' })
            ),
            makeReg({ id: 'res-m', status: 'RESERVED', subscriptionType: 'MENSALISTA', createdAt: '2024-01-01T10:00:00Z' }),
        ]
        const result = calculateRegistrationOutcome('MENSALISTA', existing, MAX)

        // Não pode deslocar outro mensalista — vai pra WAITLIST
        expect(result.newPlayerStatus).toBe('WAITLIST')
        expect(result.displacedRegistrationId).toBeNull()
    })

    it('Limite de jogadores nunca é ultrapassado', () => {
        // Todos os cenários testados acima mantêm no máximo MAX jogadores em CONFIRMED+RESERVED
        const existing: ExistingRegistration[] = Array.from({ length: MAX }, (_, i) =>
            makeReg({ id: `c${i}`, status: 'CONFIRMED' })
        )

        // Avulso fica na waitlist
        const r1 = calculateRegistrationOutcome('AVULSO', existing, MAX)
        expect(r1.newPlayerStatus).toBe('WAITLIST')

        // Mensalista fica na waitlist (todos confirmed)
        const r2 = calculateRegistrationOutcome('MENSALISTA', existing, MAX)
        expect(r2.newPlayerStatus).toBe('WAITLIST')
    })

    it('Partida vazia: primeiro avulso entra como RESERVED', () => {
        const result = calculateRegistrationOutcome('AVULSO', [], MAX)
        expect(result.newPlayerStatus).toBe('RESERVED')
    })

    it('Partida vazia: primeiro mensalista entra como CONFIRMED', () => {
        const result = calculateRegistrationOutcome('MENSALISTA', [], MAX)
        expect(result.newPlayerStatus).toBe('CONFIRMED')
    })
})

/**
 * Pure business logic for match registration priority.
 * Mirrors the SQL RPC `register_for_match` for deterministic unit testing.
 */

export type SubscriptionType = 'MENSALISTA' | 'AVULSO'
export type RegistrationStatus = 'RESERVED' | 'CONFIRMED' | 'WAITLIST'

export interface ExistingRegistration {
    id: string
    status: RegistrationStatus
    subscriptionType: SubscriptionType
    createdAt: string
}

export interface RegistrationOutcome {
    /** Status final atribuído ao novo jogador */
    newPlayerStatus: RegistrationStatus
    /** ID do registro deslocado para WAITLIST (se houver) */
    displacedRegistrationId: string | null
}

/**
 * Calcula o resultado da inscrição de um jogador em uma partida.
 *
 * Cenários:
 *   A) Vagas disponíveis: Avulso → RESERVED, Mensalista → CONFIRMED
 *   B) Vagas cheias + Mensalista entrando: desloca o último Avulso RESERVED → WAITLIST
 *   C) Vagas cheias + todos CONFIRMED: vai para WAITLIST
 */
export function calculateRegistrationOutcome(
    playerSubscription: SubscriptionType,
    existingRegistrations: ExistingRegistration[],
    maxPlayers: number,
): RegistrationOutcome {
    const occupied = existingRegistrations.filter(
        r => r.status === 'CONFIRMED' || r.status === 'RESERVED'
    )

    // Cenário A: há vagas
    if (occupied.length < maxPlayers) {
        return {
            newPlayerStatus: playerSubscription === 'MENSALISTA' ? 'CONFIRMED' : 'RESERVED',
            displacedRegistrationId: null,
        }
    }

    // Vagas cheias
    if (playerSubscription === 'MENSALISTA') {
        // Cenário B: tentar deslocar último avulso RESERVED
        const avulsosReserved = existingRegistrations
            .filter(r => r.status === 'RESERVED' && r.subscriptionType === 'AVULSO')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        const target = avulsosReserved[0]

        if (target) {
            return {
                newPlayerStatus: 'CONFIRMED',
                displacedRegistrationId: target.id,
            }
        }

        // Cenário C: todos CONFIRMED, mensalista vai pra fila
        return {
            newPlayerStatus: 'WAITLIST',
            displacedRegistrationId: null,
        }
    }

    // Avulso sem vaga → WAITLIST
    return {
        newPlayerStatus: 'WAITLIST',
        displacedRegistrationId: null,
    }
}

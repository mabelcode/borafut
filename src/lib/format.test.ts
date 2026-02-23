import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDateTime } from './format'

describe('Formatting Utilities', () => {
    describe('formatCurrency', () => {
        it('should format numbers to BRL currency', () => {
            // Note: Intl might use non-breaking spaces depending on environment
            const result = formatCurrency(12.5)
            expect(result).toMatch(/R\$\s?12,50/)
        })

        it('should handle zero correctly', () => {
            const result = formatCurrency(0)
            expect(result).toMatch(/R\$\s?0,00/)
        })
    })

    describe('formatDateTime', () => {
        it('should format ISO strings to pt-BR format', () => {
            const date = '2024-12-25T15:30:00Z'
            // Expected result depends on timezone, but we can check the pattern
            const result = formatDateTime(date)
            expect(result).toMatch(/\d{2}\/\d{2}\/\d{2}/)
            expect(result).toMatch(/\d{2}:\d{2}/)
        })
    })
})

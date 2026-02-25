import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GroupAdmin from './GroupAdmin'

// Mock sub-components
vi.mock('./admin/GroupMatchesTab', () => ({
    default: () => <div data-testid="matches-tab">Matches Tab</div>
}))
vi.mock('./admin/GroupFinanceTab', () => ({
    default: () => <div data-testid="finance-tab">Finance Tab</div>
}))
vi.mock('./admin/GroupDetailsView', () => ({
    default: () => <div data-testid="members-tab">Members Tab</div>
}))
vi.mock('./admin/GroupSettingsTab', () => ({
    default: () => <div data-testid="settings-tab">Settings Tab</div>
}))

describe('GroupAdmin Component', () => {
    const mockGroupId = 'test-group-id'
    const mockOnBack = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        // Reset URL
        window.history.replaceState({}, '', '/')
    })

    it('renders "Partidas" tab by default', () => {
        render(<GroupAdmin groupId={mockGroupId} onBack={mockOnBack} />)

        expect(screen.getByTestId('matches-tab')).toBeInTheDocument()
        expect(screen.getByText('Partidas')).toBeInTheDocument()
    })

    it('switches to "Financeiro" tab when clicked', () => {
        render(<GroupAdmin groupId={mockGroupId} onBack={mockOnBack} />)

        fireEvent.click(screen.getByText('Financeiro'))

        expect(screen.getByTestId('finance-tab')).toBeInTheDocument()
        expect(screen.queryByTestId('matches-tab')).not.toBeInTheDocument()
    })

    it('switches to "Membros" tab when clicked', () => {
        render(<GroupAdmin groupId={mockGroupId} onBack={mockOnBack} />)

        fireEvent.click(screen.getByText('Membros'))

        expect(screen.getByTestId('members-tab')).toBeInTheDocument()
    })

    it('switches to "Ajustes" tab when clicked', () => {
        render(<GroupAdmin groupId={mockGroupId} onBack={mockOnBack} />)

        fireEvent.click(screen.getByText('Ajustes'))

        expect(screen.getByTestId('settings-tab')).toBeInTheDocument()
    })

    it('reads initial tab from URL search params', () => {
        // Set URL with tab=finance
        const url = new URL(window.location.href)
        url.searchParams.set('tab', 'finance')
        window.history.replaceState({}, '', url.toString())

        render(<GroupAdmin groupId={mockGroupId} onBack={mockOnBack} />)

        expect(screen.getByTestId('finance-tab')).toBeInTheDocument()
    })

    it('updates URL search params when tab changes', () => {
        render(<GroupAdmin groupId={mockGroupId} onBack={mockOnBack} />)

        fireEvent.click(screen.getByText('Ajustes'))

        const params = new URLSearchParams(window.location.search)
        expect(params.get('tab')).toBe('settings')
    })
})

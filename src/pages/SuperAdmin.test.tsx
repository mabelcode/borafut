import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SuperAdmin from './SuperAdmin'

// Mock all internal Tabs to simplify the test
vi.mock('./admin/GroupsTab', () => ({
    default: ({ onSelectGroup }: any) => (
        <div data-testid="groups-tab">
            Groups Tab
            <button onClick={() => onSelectGroup('group-1')}>Select Group</button>
        </div>
    )
}))

vi.mock('./admin/UsersTab', () => ({
    default: ({ onSelectUser }: any) => (
        <div data-testid="users-tab">
            Users Tab
            <button onClick={() => onSelectUser('user-1')}>Select User</button>
        </div>
    )
}))

vi.mock('./admin/AuditLogsTab', () => ({
    default: () => <div data-testid="logs-tab">Logs Tab</div>
}))

// Mock replaceState
const replaceStateMock = vi.fn()
Object.defineProperty(window, 'history', {
    value: {
        replaceState: replaceStateMock
    }
})

describe('SuperAdmin Component', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    function renderComponent(initialUrl = '/') {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { search: initialUrl, href: `http://localhost/super-admin${initialUrl}` }
        })

        return render(<SuperAdmin onSelectGroup={vi.fn()} onSelectUser={vi.fn()} />)
    }

    it('renders correct initial tab based on URL search params', () => {
        const { unmount } = renderComponent('?tab=logs')
        expect(screen.getByTestId('logs-tab')).toBeInTheDocument()
        unmount()

        // And groups is the fallback default
        renderComponent('')
        expect(screen.getByTestId('groups-tab')).toBeInTheDocument()
    })

    it('updates URL search params when changing tabs', () => {
        renderComponent('')

        const logsTabBtn = screen.getByRole('button', { name: /Histórico/i })
        fireEvent.click(logsTabBtn)

        expect(screen.getByTestId('logs-tab')).toBeInTheDocument()
        expect(replaceStateMock).toHaveBeenCalledWith(
            expect.anything(),
            '',
            'http://localhost/super-admin?tab=logs'
        )
    })

    it('calls onSelectGroup when a group is selected in GroupsTab', () => {
        const handleSelectGroup = vi.fn()
        render(<SuperAdmin onSelectGroup={handleSelectGroup} onSelectUser={vi.fn()} />)

        fireEvent.click(screen.getByText('Select Group'))
        expect(handleSelectGroup).toHaveBeenCalledWith('group-1')
    })

    it('calls onSelectUser when a user is selected in UsersTab', () => {
        // We need to render with tab=users to see UsersTab
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { search: '?tab=users', href: 'http://localhost/super-admin?tab=users' }
        })

        const handleSelectUser = vi.fn()
        render(<SuperAdmin onSelectGroup={vi.fn()} onSelectUser={handleSelectUser} />)

        fireEvent.click(screen.getByText('Select User'))
        expect(handleSelectUser).toHaveBeenCalledWith('user-1')
    })
})

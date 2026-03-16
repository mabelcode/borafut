import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import GroupInviteShare from './GroupInviteShare'

const mockOnClose = vi.fn()
const defaultProps = {
    groupName: 'Amigos FC',
    inviteToken: 'abc123token',
    inviteExpiresAt: new Date(Date.now() + 86400000).toISOString(), // +24h
    onClose: mockOnClose
}

// Mock clipboard
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve())
    },
    share: vi.fn().mockImplementation(() => Promise.resolve())
})

describe('GroupInviteShare', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders correctly with default props', () => {
        render(<GroupInviteShare {...defaultProps} />)
        expect(screen.getByText('Convidar Amigo')).toBeInTheDocument()
        expect(screen.getByText(/Amigos FC/)).toBeInTheDocument()
        expect(screen.getByText(/abc123token/)).toBeInTheDocument()
    })

    it('handles copy correctly', async () => {
        render(<GroupInviteShare {...defaultProps} />)
        const copyBtn = screen.getByText('COPIAR')
        fireEvent.click(copyBtn)

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('?token=abc123token')
        )

        await waitFor(() => {
            expect(screen.getByText('COPIADO')).toBeInTheDocument()
        })
    })

    it('displays expired message if token is expired', () => {
        render(<GroupInviteShare {...defaultProps} inviteExpiresAt={new Date(Date.now() - 86400000).toISOString()} />)
        expect(screen.getByText(/este grupo expirou/i)).toBeInTheDocument()
    })

    it('calls onClose when close button or X is clicked', () => {
        render(<GroupInviteShare {...defaultProps} />)
        const closeBtns = screen.getAllByRole('button', { name: /Fechar/i })
        fireEvent.click(closeBtns[0])
        expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
})

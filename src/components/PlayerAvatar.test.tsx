import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PlayerAvatar from '@/components/PlayerAvatar'

describe('PlayerAvatar Component', () => {
    it('should render initials when no src is provided', () => {
        render(<PlayerAvatar name="Marcos Silva" />)
        // M and S should be the initials
        expect(screen.getByText('MS')).toBeInTheDocument()
    })

    it('should fall back to initials if image fails to load', () => {
        render(<PlayerAvatar name="Test User" src="broken.jpg" />)
        const img = screen.getByRole('img')
        // Simulate image load error
        fireEvent.error(img)
        expect(screen.queryByRole('img')).not.toBeInTheDocument()
        expect(screen.getByText('TU')).toBeInTheDocument()
    })

    it('should render an image initially when src is valid', () => {
        render(<PlayerAvatar name="Valid User" src="https://example.com/valid.jpg" />)
        const img = screen.getByRole('img')
        expect(img).toHaveAttribute('src', 'https://example.com/valid.jpg')
    })

    it('should apply specific sizing classes based on size prop', () => {
        const { container: containerSm } = render(<PlayerAvatar name="Small" size="sm" />)
        expect(containerSm.firstChild).toHaveClass('size-8')

        const { container: containerLg } = render(<PlayerAvatar name="Large" size="lg" />)
        expect(containerLg.firstChild).toHaveClass('size-28')
    })
})

import { render, screen, fireEvent } from '@/test/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { User, Star, Calendar } from 'lucide-react'
import SortSelector from './SortSelector'

const mockOptions = [
    { id: 'NAME', label: 'NOME', icon: User },
    { id: 'SCORE', label: 'NÍVEL', icon: Star },
    { id: 'DATE', label: 'DATA', icon: Calendar },
]

describe('SortSelector Component', () => {

    it('should render all options correctly', () => {
        render(
            <SortSelector
                options={mockOptions}
                currentValue="NAME"
                onChange={vi.fn()}
            />
        )

        expect(screen.getByText('NOME')).toBeInTheDocument()
        expect(screen.getByText('NÍVEL')).toBeInTheDocument()
        expect(screen.getByText('DATA')).toBeInTheDocument()
    })

    it('should highlight the currently selected value', () => {
        render(
            <SortSelector
                options={mockOptions}
                currentValue="SCORE"
                onChange={vi.fn()}
            />
        )

        const scoreButton = screen.getByText('NÍVEL').closest('button')
        const nameButton = screen.getByText('NOME').closest('button')

        expect(scoreButton).toHaveClass('bg-brand-green', 'text-white')
        expect(nameButton).not.toHaveClass('bg-brand-green', 'text-white')
    })

    it('should call onChange with the correct id when an option is clicked', () => {
        const handleChange = vi.fn()

        render(
            <SortSelector
                options={mockOptions}
                currentValue="NAME"
                onChange={handleChange}
            />
        )

        const dateButton = screen.getByText('DATA')
        fireEvent.click(dateButton)

        expect(handleChange).toHaveBeenCalledTimes(1)
        expect(handleChange).toHaveBeenCalledWith('DATE')
    })
})

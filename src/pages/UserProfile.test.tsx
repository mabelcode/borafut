import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import UserProfile from './UserProfile'
import { BrowserRouter } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUserProfileData } from '@/hooks/useUserProfileData'

// Mock Hooks
vi.mock('@/hooks/useCurrentUser', () => ({
    useCurrentUser: vi.fn()
}))

vi.mock('@/hooks/useUserProfileData', () => ({
    useUserProfileData: vi.fn()
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { user_metadata: { avatar_url: 'http://example.com/photo.jpg' } } }
            }),
            signOut: vi.fn().mockResolvedValue({ error: null })
        }
    }
}))

const mockUser = {
    id: 'u1',
    displayName: 'Test Player',
    phoneNumber: null,
    globalScore: 4.8,
    mainPosition: 'ATTACK',
    pixKey: 'test@pix.com',
    isSuperAdmin: false,
    createdAt: '2022-01-01T00:00:00Z'
}

const mockGroups = [
    { id: 'g1', name: 'Bola de Ouro', role: 'PLAYER', joinedAt: '2023-01-01' }
]

const mockHistory = [
    { id: 'm1', title: 'Racha de Terça', scheduledAt: '2023-12-01', groupName: 'Bola de Ouro' }
]

describe('UserProfile', () => {
    beforeEach(() => {
        vi.clearAllMocks()

            ; (useCurrentUser as any).mockReturnValue({
                user: mockUser,
                refetch: vi.fn(),
                updateProfile: vi.fn().mockResolvedValue(true)
            })

            ; (useUserProfileData as any).mockReturnValue({
                groups: mockGroups,
                history: mockHistory,
                loading: false,
                error: null,
                leaveGroup: vi.fn().mockResolvedValue(true)
            })
    })

    it('renders the user profile with data', () => {
        render(
            <BrowserRouter>
                <UserProfile onBack={vi.fn()} />
            </BrowserRouter>
        )

        // Assert loaded identity
        expect(screen.getByDisplayValue('Test Player')).toBeInTheDocument()
        expect(screen.getByDisplayValue('test@pix.com')).toBeInTheDocument()

        // Assert stats
        expect(screen.getByText('4.8')).toBeInTheDocument() // Score
        expect(screen.getByText('1')).toBeInTheDocument()   // Matches played

        // Assert groups & history
        expect(screen.getByText('Meus Grupos (1)')).toBeInTheDocument()
        expect(screen.getAllByText('Bola de Ouro')[0]).toBeInTheDocument()
        expect(screen.getByText('Histórico Recente')).toBeInTheDocument()
        expect(screen.getByText('Racha de Terça')).toBeInTheDocument()
    })

    it('handles profile update', async () => {
        const updateMock = vi.fn().mockResolvedValue(true)
            ; (useCurrentUser as any).mockReturnValue({
                user: mockUser,
                refetch: vi.fn(),
                updateProfile: updateMock
            })

        render(
            <BrowserRouter>
                <UserProfile onBack={vi.fn()} />
            </BrowserRouter>
        )

        const nameInput = screen.getByDisplayValue('Test Player')
        fireEvent.change(nameInput, { target: { value: 'New Name' } })

        const saveButton = screen.getByText('Salvar Alterações')
        fireEvent.click(saveButton)

        await waitFor(() => {
            expect(updateMock).toHaveBeenCalledWith({
                displayName: 'New Name',
                phoneNumber: null,
                mainPosition: 'ATTACK',
                pixKey: 'test@pix.com'
            })
        })
    })

    it('handles leaving a group', async () => {
        const leaveMock = vi.fn().mockResolvedValue(true)
            ; (useUserProfileData as any).mockReturnValue({
                groups: mockGroups,
                history: [],
                loading: false,
                error: null,
                leaveGroup: leaveMock
            })

        // Mock window.confirm
        const confirmSpy = vi.spyOn(window, 'confirm')
        confirmSpy.mockImplementation(() => true)

        render(
            <BrowserRouter>
                <UserProfile onBack={vi.fn()} />
            </BrowserRouter>
        )

        const leaveButton = screen.getByTitle('Sair do grupo')
        fireEvent.click(leaveButton)

        expect(confirmSpy).toHaveBeenCalledWith('Tem certeza que deseja sair do grupo Bola de Ouro?')
        expect(leaveMock).toHaveBeenCalledWith('g1')

        confirmSpy.mockRestore()
    })
})

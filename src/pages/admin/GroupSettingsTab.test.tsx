import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GroupSettingsTab from './GroupSettingsTab'
import { supabase } from '@/lib/supabase'

const mockGroupData = {
    id: 'group-123',
    name: 'Pelada dos Amigos',
    inviteToken: 'testtoken123',
    inviteExpiresAt: '2026-12-31T23:59:59Z'
}

describe('GroupSettingsTab Component', () => {
    const mockGroupId = 'group-123'

    beforeEach(() => {
        vi.clearAllMocks()

            // Mock supabase generic from chain
            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockGroupData, error: null }),
                update: vi.fn().mockResolvedValue({ error: null })
            })
    })

    it('displays group name and invite link information', async () => {
        render(<GroupSettingsTab groupId={mockGroupId} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('Pelada dos Amigos')).toBeInTheDocument()
            expect(screen.getByText(/testtoken123/)).toBeInTheDocument()
        })
    })

    it('handles group name editing', async () => {
        const mockUpdate = vi.fn().mockResolvedValue({ error: null })
            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockGroupData, error: null }),
                update: mockUpdate
            })

        render(<GroupSettingsTab groupId={mockGroupId} />)

        await waitFor(() => screen.getByDisplayValue('Pelada dos Amigos'))

        fireEvent.click(screen.getByText('Editar'))

        const input = screen.getByDisplayValue('Pelada dos Amigos')
        fireEvent.change(input, { target: { value: 'Novo Nome da Pelada' } })

        fireEvent.click(screen.getByText('Salvar'))

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith({ name: 'Novo Nome da Pelada' })
        })
    })

    it('shows warning when invite link is expired', async () => {
        const expiredData = {
            ...mockGroupData,
            inviteExpiresAt: '2020-01-01T00:00:00Z'
        }

            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: expiredData, error: null })
            })

        render(<GroupSettingsTab groupId={mockGroupId} />)

        await waitFor(() => {
            expect(screen.getByText(/Este link expirou/)).toBeInTheDocument()
        })
    })

    it('handles invite link regeneration', async () => {
        const mockUpdate = vi.fn().mockResolvedValue({ error: null })
            ; (supabase.from as any).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockGroupData, error: null }),
                update: mockUpdate
            })

        render(<GroupSettingsTab groupId={mockGroupId} />)

        await waitFor(() => screen.getByText('GERAR NOVO LINK'))

        // Select an expiry option
        fireEvent.click(screen.getByText('24 horas'))

        fireEvent.click(screen.getByText('GERAR NOVO LINK'))

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                inviteToken: expect.any(String),
                inviteExpiresAt: expect.any(String)
            }))
        })
    })
})

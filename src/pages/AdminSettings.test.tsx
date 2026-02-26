import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminSettings from './AdminSettings';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    }
}));

describe('AdminSettings Component', () => {
    const mockOnBack = vi.fn();
    const mockSession = { user: { id: 'user-1' } } as any;
    const mockGroups = [{ groupId: 'group-1', groupName: 'Bolha Teste', inviteToken: 'token-123', inviteExpiresAt: null, role: 'ADMIN' as const }];

    beforeEach(() => {
        vi.clearAllMocks();

        // Default select mock for initial pixKey fetch
        const mockSelect = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { pixKey: '12345678909' }, error: null })
            })
        });

        const mockUpdate = vi.fn().mockResolvedValue({ error: null });

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'users') {
                return { select: mockSelect, update: vi.fn().mockReturnValue({ eq: mockUpdate }) } as any;
            }
            if (table === 'groups') {
                return { update: vi.fn().mockReturnValue({ eq: mockUpdate }) } as any;
            }
            return {} as any;
        });
    });

    it('renders loading state initially', () => {
        // Delay the resolution to test loading state
        const mockSelect = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), 100)))
            })
        });
        vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

        const { container } = render(<AdminSettings session={mockSession} adminGroups={mockGroups} onBack={mockOnBack} />);

        // Assert loader is present
        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders content after loading', async () => {
        render(<AdminSettings session={mockSession} adminGroups={mockGroups} onBack={mockOnBack} />);

        await waitFor(() => {
            expect(screen.getByText('Configurações')).toBeInTheDocument();
        });

        expect(screen.getByText('Link de convite')).toBeInTheDocument();
        expect(screen.getByText(/token-123/)).toBeInTheDocument();
        expect(screen.getByDisplayValue('12345678909')).toBeInTheDocument(); // loaded pixKey
    });

    it('regenerates invite link successfully', async () => {
        const user = userEvent.setup();
        const mockUpdateEq = vi.fn().mockResolvedValue({ error: null }); // success
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) } as any;
            if (table === 'groups') return { update: vi.fn().mockReturnValue({ eq: mockUpdateEq }) } as any;
            return {} as any;
        });

        render(<AdminSettings session={mockSession} adminGroups={mockGroups} onBack={mockOnBack} />);

        await waitFor(() => {
            expect(screen.getByText('Configurações')).toBeInTheDocument();
        });

        // Click regenerate button
        const regenBtn = screen.getByRole('button', { name: /Gerar novo link/i });
        await user.click(regenBtn);

        await waitFor(() => {
            expect(mockUpdateEq).toHaveBeenCalledWith('id', 'group-1');
            // The URL field should update with a new token
            // Since crypto.randomUUID is used, it should not be token-123 anymore
            expect(screen.queryByText(/token-123/)).not.toBeInTheDocument();
        });
    });

    it('handles invite link regeneration error', async () => {
        const user = userEvent.setup();
        const mockUpdateEq = vi.fn().mockResolvedValue({ error: { message: 'Network error' } }); // failure
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) } as any;
            if (table === 'groups') return { update: vi.fn().mockReturnValue({ eq: mockUpdateEq }) } as any;
            return {} as any;
        });

        render(<AdminSettings session={mockSession} adminGroups={mockGroups} onBack={mockOnBack} />);

        await waitFor(() => {
            expect(screen.getByText('Configurações')).toBeInTheDocument();
        });

        const regenBtn = screen.getByRole('button', { name: /Gerar novo link/i });
        await user.click(regenBtn);

        await waitFor(() => {
            expect(mockUpdateEq).toHaveBeenCalled();
            // It should rollback/keep original token since it failed
            expect(screen.getByText(/token-123/)).toBeInTheDocument();
        });
    });

    it('saves PIX key successfully', async () => {
        const user = userEvent.setup();
        const mockUpdateEq = vi.fn().mockResolvedValue({ error: null }); // success
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'users') return {
                select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }),
                update: vi.fn().mockReturnValue({ eq: mockUpdateEq })
            } as any;
            return {} as any;
        });

        render(<AdminSettings session={mockSession} adminGroups={mockGroups} onBack={mockOnBack} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Com DDI e DDD/i)).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText(/Com DDI e DDD/i);
        await user.type(input, '+5511999999999');

        const saveBtn = screen.getByRole('button', { name: /Salvar chave Pix/i });
        expect(saveBtn).not.toBeDisabled();
        await user.click(saveBtn);

        await waitFor(() => {
            expect(mockUpdateEq).toHaveBeenCalledWith('id', 'user-1');
            expect(screen.getByRole('button', { name: /Salvo!/i })).toBeInTheDocument();
        });
    });

    it('handles PIX key save error', async () => {
        const user = userEvent.setup();
        const mockUpdateEq = vi.fn().mockResolvedValue({ error: { message: 'Validaton failed' } }); // failure
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'users') return {
                select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }),
                update: vi.fn().mockReturnValue({ eq: mockUpdateEq })
            } as any;
            return {} as any;
        });

        render(<AdminSettings session={mockSession} adminGroups={mockGroups} onBack={mockOnBack} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Com DDI e DDD/i)).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText(/Com DDI e DDD/i);
        await user.type(input, '+5511999999999');

        const saveBtn = screen.getByRole('button', { name: /Salvar chave Pix/i });
        await user.click(saveBtn);

        await waitFor(() => {
            expect(screen.getByText('Erro: Validaton failed')).toBeInTheDocument();
        });
    });

    it('validates PIX key is required before enabling save', async () => {
        const user = userEvent.setup();
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            if (table === 'users') return {
                select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }),
                update: vi.fn()
            } as any;
            return {} as any;
        });

        render(<AdminSettings session={mockSession} adminGroups={mockGroups} onBack={mockOnBack} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Com DDI e DDD/i)).toBeInTheDocument();
        });

        const saveBtn = screen.getByRole('button', { name: /Salvar chave Pix/i });
        expect(saveBtn).toBeDisabled(); // Empty initially since mock returns no data

        const input = screen.getByPlaceholderText(/Com DDI e DDD/i);
        await user.type(input, 'a');
        expect(saveBtn).not.toBeDisabled();

        await user.clear(input);
        expect(saveBtn).toBeDisabled();
    });
});

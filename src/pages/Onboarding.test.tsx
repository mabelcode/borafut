import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Onboarding from './Onboarding';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        auth: {
            signOut: vi.fn().mockResolvedValue({ error: null })
        }
    }
}));

describe('Onboarding Component', () => {
    const mockOnComplete = vi.fn();
    const mockOnSignOut = vi.fn();
    const mockSession = { user: { id: 'user-1' } } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders form fields correctly', () => {
        render(<Onboarding session={mockSession} onComplete={mockOnComplete} onSignOut={mockOnSignOut} />);

        expect(screen.getByPlaceholderText(/Ex: Marcos/i)).toBeInTheDocument();
        expect(screen.getByText('Goleiro')).toBeInTheDocument();
        expect(screen.getByText('Defesa')).toBeInTheDocument();
        expect(screen.getByText('Ataque')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/\(11\) 99999-9999/i)).toBeInTheDocument(); // Phone input
        expect(screen.getByRole('button', { name: /Entrar no app/i })).toBeDisabled();
    });

    it('validates minimum name length', async () => {
        const user = userEvent.setup();
        render(<Onboarding session={mockSession} onComplete={mockOnComplete} onSignOut={mockOnSignOut} />);

        const nameInput = screen.getByPlaceholderText(/Ex: Marcos/i);
        await user.type(nameInput, 'A');

        expect(screen.getByText('Mínimo de 2 caracteres.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Entrar no app/i })).toBeDisabled();

        await user.type(nameInput, 'B');
        expect(screen.queryByText('Mínimo de 2 caracteres.')).not.toBeInTheDocument();
    });

    it('validates phone number', async () => {
        const user = userEvent.setup();
        render(<Onboarding session={mockSession} onComplete={mockOnComplete} onSignOut={mockOnSignOut} />);

        // In RTL, the phone input doesn't have a specific semantic label, we can find it by type tel or placeholder
        const phoneInput = screen.getByPlaceholderText(/\(11\) 99999-9999/i);
        await user.type(phoneInput, '1188888888'); // Invalid: must be 11 digits and start with 9 after DDD

        expect(screen.getByText('Digite um celular válido com DDD.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Entrar no app/i })).toBeDisabled();

        await user.clear(phoneInput);
        await user.type(phoneInput, '11999999999'); // Valid
        expect(screen.queryByText('Digite um celular válido com DDD.')).not.toBeInTheDocument();
    });

    it('enables submit button only when form is fully valid', async () => {
        const user = userEvent.setup();
        render(<Onboarding session={mockSession} onComplete={mockOnComplete} onSignOut={mockOnSignOut} />);

        const submitBtn = screen.getByRole('button', { name: /Entrar no app/i });
        expect(submitBtn).toBeDisabled();

        // 1. Enter Name
        await user.type(screen.getByPlaceholderText(/Ex: Marcos/i), 'Marcos');
        expect(submitBtn).toBeDisabled();

        // 2. Select Position
        await user.click(screen.getByText('Ataque'));
        expect(submitBtn).toBeDisabled();

        // 3. Enter Valid Phone
        await user.type(screen.getByPlaceholderText(/\(11\) 99999-9999/i), '11988887777');
        expect(submitBtn).not.toBeDisabled();
    });

    it('handles successful form submission', async () => {
        const user = userEvent.setup();
        const mockUpsert = vi.fn().mockResolvedValue({ error: null });
        vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);

        render(<Onboarding session={mockSession} onComplete={mockOnComplete} onSignOut={mockOnSignOut} />);

        await user.type(screen.getByPlaceholderText(/Ex: Marcos/i), 'Marcos');
        await user.click(screen.getByText('Ataque'));
        await user.type(screen.getByPlaceholderText(/\(11\) 99999-9999/i), '11988887777');

        await user.click(screen.getByRole('button', { name: /Entrar no app/i }));

        await waitFor(() => {
            expect(mockUpsert).toHaveBeenCalledWith({
                id: 'user-1',
                phoneNumber: '+5511988887777',
                displayName: 'Marcos',
                mainPosition: 'ATTACK'
            });
            expect(mockOnComplete).toHaveBeenCalled();
        });
    });

    it('handles submission error gracefully', async () => {
        const user = userEvent.setup();
        const mockUpsert = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });
        vi.mocked(supabase.from).mockReturnValue({ upsert: mockUpsert } as any);

        render(<Onboarding session={mockSession} onComplete={mockOnComplete} onSignOut={mockOnSignOut} />);

        await user.type(screen.getByPlaceholderText(/Ex: Marcos/i), 'Marcos');
        await user.click(screen.getByText('Ataque'));
        await user.type(screen.getByPlaceholderText(/\(11\) 99999-9999/i), '11988887777');

        await user.click(screen.getByRole('button', { name: /Entrar no app/i }));

        await waitFor(() => {
            expect(screen.getByText('Erro: Database error')).toBeInTheDocument();
            // Should not call onComplete
            expect(mockOnComplete).not.toHaveBeenCalled();
        });
    });

    it('handles sign out correctly', async () => {
        const user = userEvent.setup();
        render(<Onboarding session={mockSession} onComplete={mockOnComplete} onSignOut={mockOnSignOut} />);

        const signOutBtn = screen.getByRole('button', { name: /Entrar com outra conta/i });
        await user.click(signOutBtn);

        await waitFor(() => {
            expect(supabase.auth.signOut).toHaveBeenCalled();
            expect(mockOnSignOut).toHaveBeenCalled();
        });
    });
});

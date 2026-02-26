import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import WaitingForInvite from './WaitingForInvite';

describe('WaitingForInvite Component', () => {
    it('renders static content correctly', () => {
        render(<WaitingForInvite />);

        expect(screen.getByText('Aguardando convite')).toBeInTheDocument();
        expect(screen.getByText(/Você ainda não faz parte de nenhuma bolha/i)).toBeInTheDocument();
        expect(screen.getByText('Como entrar')).toBeInTheDocument();
        expect(screen.getByText(/Peça o link de convite ao gerente/i)).toBeInTheDocument();
        expect(screen.getByText(/Abra o link no seu celular/i)).toBeInTheDocument();
        expect(screen.getByText(/Você entra automaticamente/i)).toBeInTheDocument();

        // Refresh button should not be present if no prop is passed
        expect(screen.queryByRole('button', { name: /Já entrei pelo link/i })).not.toBeInTheDocument();
    });

    it('renders and calls onRefresh when passed', async () => {
        const user = userEvent.setup();
        const mockRefresh = vi.fn();

        render(<WaitingForInvite onRefresh={mockRefresh} />);

        const refreshBtn = screen.getByRole('button', { name: /Já entrei pelo link/i });
        expect(refreshBtn).toBeInTheDocument();

        await user.click(refreshBtn);

        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
});

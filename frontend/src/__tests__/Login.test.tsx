import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/CustomIcon', () => ({
    CustomIcon: vi.fn(({ name }: { name: string }) => <span data-testid={`icon-${name}`} />)
}));

vi.mock('../store/authStore', () => ({
    useAuthStore: vi.fn()
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn()
    };
});

import { Login } from '../pages/Login';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

describe('Login Component', () => {
    const mockLogin = vi.fn();
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            login: mockLogin,
            isAuthenticated: false,
            isLoading: false
        });
        (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
    });

    it('renderiza el formulario de login', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        expect(screen.getByText('Acceso seguro')).toBeDefined();
        expect(screen.getByRole('button', { name: /iniciar sesi/i })).toBeDefined();
    });

    it('tiene campos de email y password', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        const emailInput = screen.getByLabelText(/correo electr[oó]nico/i);
        const passwordInput = screen.getByLabelText(/contrase[nñ]a/i);

        expect(emailInput.getAttribute('type')).toBe('email');
        expect(passwordInput.getAttribute('type')).toBe('password');
    });

    it('llama a login con credenciales', async () => {
        mockLogin.mockResolvedValue(true);

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/correo electr[oó]nico/i), { target: { value: 'test@curiel.com' } });
        fireEvent.change(screen.getByLabelText(/contrase[nñ]a/i), { target: { value: 'Password123*' } });
        fireEvent.click(screen.getByRole('button', { name: /iniciar sesi[oó]n/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith({
                email: 'test@curiel.com',
                password: 'Password123*'
            });
        });
    });

    it('navega a /dashboard despues de login exitoso', async () => {
        mockLogin.mockResolvedValue(true);

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/correo electr[oó]nico/i), { target: { value: 'test@curiel.com' } });
        fireEvent.change(screen.getByLabelText(/contrase[nñ]a/i), { target: { value: 'Password123*' } });
        fireEvent.click(screen.getByRole('button', { name: /iniciar sesi[oó]n/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('no navega cuando login falla', async () => {
        mockLogin.mockResolvedValue(false);

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText(/correo electr[oó]nico/i), { target: { value: 'test@curiel.com' } });
        fireEvent.change(screen.getByLabelText(/contrase[nñ]a/i), { target: { value: 'WrongPassword*' } });
        fireEvent.click(screen.getByRole('button', { name: /iniciar sesi[oó]n/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalled();
        });
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('muestra estado de loading', () => {
        (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            login: mockLogin,
            isAuthenticated: false,
            isLoading: true
        });

        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        const button = screen.getByRole('button');
        expect(button.getAttribute('disabled')).not.toBeNull();
    });

    it('muestra footer con copyright', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        );

        expect(screen.getByText(/2026 CURIEL/)).toBeDefined();
    });
});

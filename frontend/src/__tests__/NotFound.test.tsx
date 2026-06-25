import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/CustomIcon', () => ({
    CustomIcon: vi.fn(({ name }: { name: string }) => <span data-testid={`icon-${name}`} />)
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn()
    };
});

import { NotFound } from '../pages/NotFound';
import { useNavigate } from 'react-router-dom';

describe('NotFound Component', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
    });

    it('muestra el titulo 404', () => {
        render(
            <MemoryRouter>
                <NotFound />
            </MemoryRouter>
        );

        expect(screen.getByText('Error 404')).toBeDefined();
        expect(screen.getByText('Pagina no encontrada')).toBeDefined();
    });

    it('muestra descripcion del error', () => {
        render(
            <MemoryRouter>
                <NotFound />
            </MemoryRouter>
        );

        expect(screen.getByText(/la pagina que buscas no existe/i)).toBeDefined();
    });

    it('tiene boton para ir al dashboard', () => {
        render(
            <MemoryRouter>
                <NotFound />
            </MemoryRouter>
        );

        const btn = screen.getByRole('button', { name: /ir al dashboard/i });
        fireEvent.click(btn);

        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('tiene boton para volver atras', () => {
        render(
            <MemoryRouter>
                <NotFound />
            </MemoryRouter>
        );

        const btn = screen.getByRole('button', { name: /volver/i });
        fireEvent.click(btn);

        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('renderiza icono de advertencia', () => {
        render(
            <MemoryRouter>
                <NotFound />
            </MemoryRouter>
        );

        expect(screen.getByTestId('icon-warning-circle')).toBeDefined();
    });
});

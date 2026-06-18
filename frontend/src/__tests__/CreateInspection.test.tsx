import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

vi.mock('../services/inspection.service', () => ({
    default: {
        createInspection: vi.fn()
    }
}));

vi.mock('../services/user.service', () => ({
    default: {
        getInspectors: vi.fn()
    }
}));

vi.mock('../api/axios', () => ({
    getApiErrorMessage: vi.fn((error: any, fallback: string) => fallback)
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

import { CreateInspection } from '../pages/CreateInspection';
import { useNavigate } from 'react-router-dom';
import userService from '../services/user.service';

const mockInspectors = [
    {
        id: '1',
        firstName: 'Inspector',
        lastName: 'One',
        email: 'inspector1@curiel.com',
        role: 'inspector',
        isActive: true
    }
];

describe('CreateInspection Component', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
        (userService.getInspectors as ReturnType<typeof vi.fn>).mockResolvedValue(mockInspectors);
    });

    it('renderiza el formulario de creacion', async () => {
        render(
            <MemoryRouter>
                <CreateInspection />
            </MemoryRouter>
        );

        expect(screen.getByText(/nueva inspecci[oó]n/i)).toBeDefined();
    });

    it('carga inspectores al montar', async () => {
        render(
            <MemoryRouter>
                <CreateInspection />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(userService.getInspectors).toHaveBeenCalled();
        });
    });

    it('muestra campos del formulario', async () => {
        render(
            <MemoryRouter>
                <CreateInspection />
            </MemoryRouter>
        );

        expect(screen.getByLabelText(/fecha programada/i)).toBeDefined();
        expect(screen.getByLabelText(/nombre completo/i)).toBeDefined();
    });

    it('muestra selector de distrito', async () => {
        render(
            <MemoryRouter>
                <CreateInspection />
            </MemoryRouter>
        );

        expect(screen.getByLabelText(/distrito/i)).toBeDefined();
    });

    it('tiene boton de crear inspeccion', async () => {
        render(
            <MemoryRouter>
                <CreateInspection />
            </MemoryRouter>
        );

        expect(screen.getByRole('button', { name: /crear inspecci[oó]n/i })).toBeDefined();
    });

    it('tiene boton de cancelar', async () => {
        render(
            <MemoryRouter>
                <CreateInspection />
            </MemoryRouter>
        );

        expect(screen.getByText('Cancelar')).toBeDefined();
    });
});

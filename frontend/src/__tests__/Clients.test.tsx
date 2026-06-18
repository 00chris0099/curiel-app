import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/CustomIcon', () => ({
    CustomIcon: vi.fn(({ name }: { name: string }) => <span data-testid={`icon-${name}`} />)
}));

vi.mock('../services/client.service', () => ({
    default: {
        getAll: vi.fn(),
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        search: vi.fn(),
        getInspections: vi.fn(),
    },
}));

import { Clients } from '../pages/Clients';
import clientService from '../services/client.service';

const mockClientService = vi.mocked(clientService);

describe('Clients Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockClientService.getAll.mockResolvedValue({
            success: true,
            data: [
                {
                    id: '1',
                    documentType: 'dni',
                    documentNumber: '12345678',
                    firstName: 'Juan',
                    lastName: 'Perez',
                    email: 'juan@test.com',
                    phone: '999888777',
                    isProtected: false,
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-01T00:00:00Z',
                },
                {
                    id: '2',
                    documentType: 'ruc',
                    documentNumber: '20123456789',
                    razonSocial: 'Empresa Test SAC',
                    email: 'empresa@test.com',
                    isProtected: true,
                    createdAt: '2026-01-02T00:00:00Z',
                    updatedAt: '2026-01-02T00:00:00Z',
                },
            ],
            pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
        });
    });

    it('renderiza la tabla de clientes', async () => {
        render(
            <MemoryRouter>
                <Clients />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Juan Perez')).toBeDefined();
            expect(screen.getByText('Empresa Test SAC')).toBeDefined();
        });
    });

    it('muestra estadisticas de clientes', async () => {
        render(
            <MemoryRouter>
                <Clients />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/2 clientes registrados/)).toBeDefined();
        });
    });

    it('muestra boton de nuevo cliente', async () => {
        render(
            <MemoryRouter>
                <Clients />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /nuevo cliente/i })).toBeDefined();
        });
    });

    it('muestra campo de busqueda', async () => {
        render(
            <MemoryRouter>
                <Clients />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/buscar por nombre/i)).toBeDefined();
        });
    });

    it('muestra filtro de tipo de documento', async () => {
        render(
            <MemoryRouter>
                <Clients />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Todos los tipos')).toBeDefined();
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../components/CustomIcon', () => ({
    CustomIcon: vi.fn(({ name }: { name: string }) => <span data-testid={`icon-${name}`} />)
}));

vi.mock('../store/authStore', () => ({
    useAuthStore: vi.fn()
}));

vi.mock('../services/user.service', () => ({
    default: {
        getAllUsers: vi.fn(),
        getStats: vi.fn(),
        createUser: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        toggleUserStatus: vi.fn(),
        transferMasterAdmin: vi.fn()
    }
}));

vi.mock('../api/axios', () => ({
    getApiErrorMessage: vi.fn((error: any, fallback: string) => fallback)
}));

import { Users } from '../pages/Users';
import { useAuthStore } from '../store/authStore';
import userService from '../services/user.service';

const mockUsers = [
    {
        id: '1',
        email: 'admin@curiel.com',
        firstName: 'Admin',
        lastName: 'Test',
        fullName: 'Admin Test',
        role: 'admin',
        isActive: true,
        isMasterAdmin: true,
        phone: '999999999',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    },
    {
        id: '2',
        email: 'inspector@curiel.com',
        firstName: 'Inspector',
        lastName: 'Test',
        fullName: 'Inspector Test',
        role: 'inspector',
        isActive: true,
        isMasterAdmin: false,
        phone: '888888888',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01'
    }
];

const mockStats = {
    total: 2,
    active: 2,
    inactive: 0,
    byRole: [
        { role: 'admin', count: 1 },
        { role: 'inspector', count: 1 }
    ]
};

describe('Users Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuthStore as ReturnType<typeof vi.fn>).mockReturnValue({
            user: mockUsers[0],
            refreshProfile: vi.fn()
        });
        (userService.getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: mockUsers,
            pagination: { total: 2 }
        });
        (userService.getStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockStats);
    });

    it('renderiza la pagina y carga usuarios', async () => {
        render(
            <MemoryRouter>
                <Users />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('admin@curiel.com')).toBeDefined();
        }, { timeout: 5000 });

        expect(screen.getByText('inspector@curiel.com')).toBeDefined();
    });

    it('muestra boton de nuevo usuario despues de cargar', async () => {
        render(
            <MemoryRouter>
                <Users />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Nuevo Usuario')).toBeDefined();
        }, { timeout: 5000 });
    });

    it('muestra barra de busqueda despues de cargar', async () => {
        render(
            <MemoryRouter>
                <Users />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/nombre o email/i)).toBeDefined();
        }, { timeout: 5000 });
    });

    it('carga estadisticas', async () => {
        render(
            <MemoryRouter>
                <Users />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(userService.getStats).toHaveBeenCalled();
        }, { timeout: 5000 });
    });

    it('llama a getAllUsers al montar', async () => {
        render(
            <MemoryRouter>
                <Users />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(userService.getAllUsers).toHaveBeenCalled();
        }, { timeout: 5000 });
    });
});

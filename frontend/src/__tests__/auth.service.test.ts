import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import authService from '../services/auth.service';

vi.mock('../api/axios', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        put: vi.fn(),
    },
}));

import api from '../api/axios';
const mockApi = vi.mocked(api);

describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('storeTokens / getAccessToken / getRefreshToken', () => {
        it('almacena y recupera tokens', () => {
            authService.storeTokens('access-123', 'refresh-456');
            expect(authService.getAccessToken()).toBe('access-123');
            expect(authService.getRefreshToken()).toBe('refresh-456');
        });

        it('retorna null cuando no hay tokens', () => {
            expect(authService.getAccessToken()).toBeNull();
            expect(authService.getRefreshToken()).toBeNull();
        });
    });

    describe('clearTokens', () => {
        it('limpia todos los tokens y usuario', () => {
            authService.storeTokens('a', 'b');
            localStorage.setItem('user', JSON.stringify({ id: 1 }));
            authService.clearTokens();
            expect(authService.getAccessToken()).toBeNull();
            expect(authService.getRefreshToken()).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
        });
    });

    describe('getCurrentUser', () => {
        it('retorna null cuando no hay usuario', () => {
            expect(authService.getCurrentUser()).toBeNull();
        });

        it('retorna usuario cuando hay datos validos', () => {
            const user = { id: 1, email: 'test@test.com', firstName: 'Test', lastName: 'User' };
            localStorage.setItem('user', JSON.stringify(user));
            expect(authService.getCurrentUser()).toEqual(user);
        });

        it('retorna null cuando el JSON es invalido', () => {
            localStorage.setItem('user', '{invalid json');
            expect(authService.getCurrentUser()).toBeNull();
        });
    });

    describe('isAuthenticated', () => {
        it('retorna false cuando no hay token', () => {
            expect(authService.isAuthenticated()).toBe(false);
        });

        it('retorna true cuando hay token', () => {
            authService.storeTokens('some-token', 'some-refresh');
            expect(authService.isAuthenticated()).toBe(true);
        });
    });

    describe('login', () => {
        it('almacena tokens y usuario en login exitoso', async () => {
            const mockResponse = {
                data: {
                    success: true,
                    data: {
                        token: 'access-token',
                        refreshToken: 'refresh-token',
                        user: { id: 1, email: 'a@b.com' },
                    },
                },
            };
            mockApi.post.mockResolvedValue(mockResponse);

            const result = await authService.login({ email: 'a@b.com', password: 'Pass123*' });

            expect(result.success).toBe(true);
            expect(authService.getAccessToken()).toBe('access-token');
            expect(authService.getRefreshToken()).toBe('refresh-token');
            expect(JSON.parse(localStorage.getItem('user')!)).toEqual({ id: 1, email: 'a@b.com' });
        });

        it('no almacena tokens cuando login falla', async () => {
            mockApi.post.mockResolvedValue({ data: { success: false, message: 'Credenciales invalidas' } });

            const result = await authService.login({ email: 'a@b.com', password: 'Wrong' });

            expect(result.success).toBe(false);
            expect(authService.getAccessToken()).toBeNull();
        });
    });

    describe('register', () => {
        it('almacena tokens cuando registro tiene token', async () => {
            mockApi.post.mockResolvedValue({
                data: {
                    success: true,
                    data: { token: 'reg-token', refreshToken: 'reg-refresh', user: { id: 2 } },
                },
            });

            const result = await authService.register({
                email: 'new@b.com', password: 'Pass123*', firstName: 'N', lastName: 'U',
            });

            expect(result.success).toBe(true);
            expect(authService.getAccessToken()).toBe('reg-token');
        });

        it('no almacena tokens cuando registro no tiene token', async () => {
            mockApi.post.mockResolvedValue({ data: { success: true, data: {} } });

            const result = await authService.register({
                email: 'new@b.com', password: 'Pass123*', firstName: 'N', lastName: 'U',
            });

            expect(result.success).toBe(true);
            expect(authService.getAccessToken()).toBeNull();
        });
    });

    describe('refresh', () => {
        it('retorna nuevos tokens cuando refresh es exitoso', async () => {
            mockApi.post.mockResolvedValue({
                data: { success: true, data: { token: 'new-access', refreshToken: 'new-refresh' } },
            });

            const result = await authService.refresh('old-refresh');

            expect(result).toEqual({ token: 'new-access', refreshToken: 'new-refresh' });
            expect(authService.getAccessToken()).toBe('new-access');
        });

        it('retorna null cuando refresh falla', async () => {
            mockApi.post.mockRejectedValue(new Error('Unauthorized'));

            const result = await authService.refresh('bad-refresh');

            expect(result).toBeNull();
        });

        it('retorna null cuando respuesta no es exitosa', async () => {
            mockApi.post.mockResolvedValue({ data: { success: false } });

            const result = await authService.refresh('old-refresh');

            expect(result).toBeNull();
        });
    });

    describe('logout', () => {
        it('limpia tokens y envia request al backend', () => {
            authService.storeTokens('a', 'b');
            mockApi.post.mockResolvedValue({});

            authService.logout();

            expect(authService.getAccessToken()).toBeNull();
            expect(authService.getRefreshToken()).toBeNull();
            expect(mockApi.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'b' });
        });

        it('no envia request cuando no hay refresh token', () => {
            authService.logout();
            expect(mockApi.post).not.toHaveBeenCalled();
        });

        it('no lanza error cuando la request al backend falla', () => {
            authService.storeTokens('a', 'b');
            mockApi.post.mockRejectedValue(new Error('Network error'));

            expect(() => authService.logout()).not.toThrow();
            expect(authService.getAccessToken()).toBeNull();
        });
    });

    describe('getProfile', () => {
        it('retorna usuario y lo almacena', async () => {
            const user = { id: 1, email: 'a@b.com' };
            mockApi.get.mockResolvedValue({ data: { success: true, data: user } });

            const result = await authService.getProfile();

            expect(result).toEqual(user);
            expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user);
        });

        it('retorna usuario aunque success sea false', async () => {
            const user = { id: 1, email: 'a@b.com' };
            mockApi.get.mockResolvedValue({ data: { success: false, data: user } });

            const result = await authService.getProfile();

            expect(result).toEqual(user);
            expect(localStorage.getItem('user')).toBeNull();
        });
    });

    describe('updateProfile', () => {
        it('actualiza perfil y lo almacena', async () => {
            const user = { id: 1, firstName: 'Updated' };
            mockApi.put.mockResolvedValue({ data: { success: true, data: user } });

            const result = await authService.updateProfile({ firstName: 'Updated' });

            expect(result).toEqual(user);
            expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user);
        });

        it('retorna usuario aunque success sea false', async () => {
            const user = { id: 1, firstName: 'X' };
            mockApi.put.mockResolvedValue({ data: { success: false, data: user } });

            const result = await authService.updateProfile({ firstName: 'X' });

            expect(result).toEqual(user);
            expect(localStorage.getItem('user')).toBeNull();
        });
    });

    describe('changePassword', () => {
        it('envia currentPassword y newPassword', async () => {
            mockApi.put.mockResolvedValue({});

            await authService.changePassword('OldPass1*', 'NewPass1*');

            expect(mockApi.put).toHaveBeenCalledWith('/auth/change-password', {
                currentPassword: 'OldPass1*',
                newPassword: 'NewPass1*',
            });
        });
    });
});

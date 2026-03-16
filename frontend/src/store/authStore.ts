import { create } from 'zustand';
import authService from '../services/auth.service';
import toast from 'react-hot-toast';
import type { User, LoginCredentials } from '../types';

// ============================================
// Inicializar estado de autenticación
// ============================================
const initialUser = authService.getCurrentUser();
const initialAuth = authService.isAuthenticated();

// ============================================

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<boolean>;
    logout: () => void;
    loadUser: () => void;
    refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: initialUser,
    isAuthenticated: initialAuth,
    isLoading: false,

    login: async (credentials) => {
        set({ isLoading: true });
        try {
            const response = await authService.login(credentials);
            set({
                user: response.data.user,
                isAuthenticated: true,
                isLoading: false,
            });
            toast.success(`¡Bienvenido, ${response.data.user.firstName}!`);
            return true;
        } catch (error: any) {
            set({ isLoading: false });
            const message = error.response?.data?.error?.message || 'Error al iniciar sesión';
            toast.error(message);
            return false;
        }
    },

    logout: () => {
        authService.logout();
        set({
            user: null,
            isAuthenticated: false,
        });
        toast.success('Sesión cerrada correctamente');
    },

    loadUser: () => {
        const user = authService.getCurrentUser();
        const isAuthenticated = authService.isAuthenticated();
        set({ user, isAuthenticated });
    },

    refreshProfile: async () => {
        try {
            const user = await authService.getProfile();
            set({ user });
        } catch (error: any) {
            console.warn('[auth] refreshProfile falló:', error?.message || error);
        }
    },
}));

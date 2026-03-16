import apiClient, { N8N_ENDPOINTS } from '../api/axios';
import type {
    User,
    LoginCredentials,
    LoginResponse,
} from '../types';

// ============================================
// Servicio de autenticación → Webhooks n8n
// ============================================
const authService = {

    /**
     * Login de usuario
     * POST → VITE_N8N_LOGIN
     * n8n debe responder: { success, message, data: { user, token } }
     */
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
        try {
            const response = await apiClient.post<LoginResponse>(
                N8N_ENDPOINTS.login,
                credentials
            );

            if (response.data.success) {
                localStorage.setItem('token', response.data.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.data.user));
            }

            return response.data;
        } catch (error: any) {
            // Si n8n devuelve un error estructurado, lo propagamos
            // Si no hay respuesta (webhook offline), devolvemos un objeto de error uniforme
            if (!error.response) {
                throw {
                    response: {
                        data: {
                            error: { message: 'No se pudo conectar con el servidor. Intenta más tarde.' },
                        },
                    },
                };
            }
            throw error;
        }
    },

    /**
     * Registro de usuario
     * POST → VITE_N8N_REGISTER
     * n8n debe responder: { success, message, data: { user, token } }
     */
    async register(userData: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }): Promise<LoginResponse> {
        try {
            const response = await apiClient.post<LoginResponse>(
                N8N_ENDPOINTS.register,
                userData
            );

            if (response.data.success) {
                localStorage.setItem('token', response.data.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.data.user));
            }

            return response.data;
        } catch (error: any) {
            if (!error.response) {
                throw {
                    response: {
                        data: {
                            error: { message: 'No se pudo conectar con el servidor. Intenta más tarde.' },
                        },
                    },
                };
            }
            throw error;
        }
    },

    /**
     * Logout de usuario (limpieza local)
     * No necesita llamada a n8n — el token se invalida al eliminarse del cliente
     */
    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    /**
     * Obtener usuario actual desde localStorage (sin llamada a red)
     */
    getCurrentUser(): User | null {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    /**
     * Verificar si hay un usuario autenticado (sin llamada a red)
     */
    isAuthenticated(): boolean {
        return !!localStorage.getItem('token');
    },

    /**
     * Obtener perfil actualizado desde n8n
     * POST → VITE_N8N_INSPECTION (endpoint reutilizable de datos de usuario)
     * n8n debe responder: { success, data: { user: {...} } }
     */
    async getProfile(): Promise<User> {
        try {
            // Usamos el endpoint de inspection como punto de verificación de sesión
            // Reemplaza con un endpoint dedicado de perfil cuando lo crees en n8n
            const token = localStorage.getItem('token');
            const response = await apiClient.post<{ success: boolean; data: User }>(
                N8N_ENDPOINTS.inspection,
                { action: 'getProfile', token }
            );

            const userData = response.data.data;

            if (response.data.success && userData) {
                localStorage.setItem('user', JSON.stringify(userData));
            }

            return userData;
        } catch (error: any) {
            // Si el webhook falla, devolvemos el usuario del localStorage como fallback
            console.warn('[n8n] getProfile: usando datos en caché del localStorage.');
            const cached = authService.getCurrentUser();
            if (cached) return cached;
            throw error;
        }
    },

    /**
     * Actualizar perfil del usuario
     * POST → VITE_N8N_INSPECTION (con acción "updateProfile")
     */
    async updateProfile(data: Partial<User>): Promise<User> {
        try {
            const response = await apiClient.post<{ success: boolean; data: User }>(
                N8N_ENDPOINTS.inspection,
                { action: 'updateProfile', ...data }
            );

            const userData = response.data.data;

            if (response.data.success && userData) {
                localStorage.setItem('user', JSON.stringify(userData));
            }

            return userData;
        } catch (error: any) {
            if (!error.response) {
                throw {
                    response: {
                        data: { error: { message: 'No se pudo actualizar el perfil. Intenta más tarde.' } },
                    },
                };
            }
            throw error;
        }
    },

    /**
     * Cambiar contraseña
     * POST → VITE_N8N_INSPECTION (con acción "changePassword")
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        try {
            await apiClient.post(
                N8N_ENDPOINTS.inspection,
                { action: 'changePassword', currentPassword, newPassword }
            );
        } catch (error: any) {
            if (!error.response) {
                throw {
                    response: {
                        data: { error: { message: 'No se pudo cambiar la contraseña. Intenta más tarde.' } },
                    },
                };
            }
            throw error;
        }
    },
};

export default authService;

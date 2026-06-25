import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';

/**
 * Prefetch datos criticos basado en la ruta actual
 * Se ejecuta despues del login para precargar datos esenciales
 */
export const usePrefetchCriticalData = () => {
    const location = useLocation();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user) return;

        const prefetchEndpoints: string[] = [];

        // Prefetch dashboard data si esta en login o home
        if (location.pathname === '/login' || location.pathname === '/') {
            prefetchEndpoints.push('/inspections?limit=5');
        }

        // Prefetch inspecciones si va a crear una
        if (location.pathname === '/inspections/create') {
            prefetchEndpoints.push('/clients?limit=50');
        }

        // Ejecutar prefetch en background usando la instancia axios con auth
        if (prefetchEndpoints.length > 0) {
            const controller = new AbortController();

            prefetchEndpoints.forEach(endpoint => {
                api.get(endpoint, {
                    signal: controller.signal,
                }).catch(() => {
                    // Ignorar errores de prefetch
                });
            });

            return () => controller.abort();
        }
    }, [location.pathname, user]);
};

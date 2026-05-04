import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, Mail, Phone, Calendar, Shield } from 'lucide-react';
import { Loader } from '../components/Loader';
import { getApiErrorMessage } from '../api/axios';
import toast from 'react-hot-toast';

export const Profile = () => {
    const { user, refreshProfile } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            await refreshProfile();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar perfil'));
        } finally {
            setIsLoading(false);
        }
    }, [refreshProfile]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    if (isLoading) {
        return <Loader fullScreen />;
    }

    const roleLabels: Record<string, string> = {
        admin: 'Administrador',
        arquitecto: 'Arquitecto',
        inspector: 'Inspector',
    };

    const roleColors: Record<string, string> = {
        admin: 'badge-danger',
        arquitecto: 'badge-info',
        inspector: 'badge-success',
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="card">
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {user?.firstName} {user?.lastName}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {user?.email}
                        </p>
                        <div className="mt-2">
                            <span className={`badge ${user?.role ? roleColors[user.role] : ''}`}>
                                {user?.role ? roleLabels[user.role] : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Información Personal */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Información Personal</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Nombre Completo</p>
                            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Correo Electrónico</p>
                            <p className="font-medium">{user?.email}</p>
                        </div>
                    </div>

                    {user?.phone && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
                                <p className="font-medium">{user.phone}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Rol en el Sistema</p>
                            <p className="font-medium capitalize">{user?.role ? roleLabels[user.role] : ''}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Miembro desde</p>
                            <p className="font-medium">
                                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                }) : ''}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estado de la Cuenta */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Estado de la Cuenta</h2>
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div>
                        <p className="font-medium text-green-900 dark:text-green-100">Cuenta Activa</p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Tu cuenta está completamente operativa
                        </p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
            </div>

            {/* Información del Sistema */}
            <div className="card bg-gray-50 dark:bg-gray-700/50">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    ID de Usuario
                </h3>
                <p className="text-xs font-mono text-gray-500 dark:text-gray-500 break-all">
                    {user?.id}
                </p>
            </div>
        </div>
    );
};

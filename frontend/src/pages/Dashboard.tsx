import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    CheckCircle,
    Clock,
    XCircle,
    Plus,
    TrendingUp,
    Users,
} from 'lucide-react';
import { Loader } from '../components/Loader';
import { getApiErrorMessage } from '../api/axios';
import inspectionService from '../services/inspection.service';
import toast from 'react-hot-toast';
import type { InspectionStats } from '../types';

export const Dashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState<InspectionStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await inspectionService.getStats();
            setStats(data);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar estadisticas'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <Loader fullScreen />;
    }

    const statsCards = [
        {
            title: 'Total Inspecciones',
            value: stats?.total || 0,
            icon: ClipboardList,
            color: 'bg-blue-500',
            textColor: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            title: 'Pendientes',
            value: stats?.pendiente || 0,
            icon: Clock,
            color: 'bg-yellow-500',
            textColor: 'text-yellow-600',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        },
        {
            title: 'En Proceso',
            value: stats?.en_proceso || 0,
            icon: TrendingUp,
            color: 'bg-purple-500',
            textColor: 'text-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
        {
            title: 'Finalizadas',
            value: stats?.finalizada || 0,
            icon: CheckCircle,
            color: 'bg-green-500',
            textColor: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            title: 'Canceladas',
            value: stats?.cancelada || 0,
            icon: XCircle,
            color: 'bg-red-500',
            textColor: 'text-red-600',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
        },
    ];

    return (
        <div className="space-y-6 pb-10">
            {/* Bienvenida */}
            <div className="card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            ¡Bienvenido, {user?.firstName}!
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Rol: <span className="capitalize font-medium">{user?.role}</span>
                        </p>
                    </div>

                    {(user?.role === 'admin' || user?.role === 'arquitecto') && (
                        <button
                            onClick={() => navigate('/inspections/create')}
                            className="btn btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
                        >
                            <Plus className="w-5 h-5" />
                            Nueva Inspección
                        </button>
                    )}
                </div>
            </div>

            {/* Estadísticas */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Resumen de Inspecciones</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                    {statsCards.map((stat) => (
                        <div
                            key={stat.title}
                            className={`card hover:shadow-md transition-shadow cursor-pointer ${stat.bgColor}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {stat.title}
                                    </p>
                                    <p className={`text-3xl font-bold ${stat.textColor}`}>
                                        {stat.value}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-full ${stat.color}`}>
                                    <stat.icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Accesos rápidos */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Accesos Rápidos</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <button
                        onClick={() => navigate('/inspections')}
                        className="card hover:shadow-md transition-shadow text-left"
                    >
                        <ClipboardList className="w-8 h-8 text-primary-600 mb-3" />
                        <h3 className="font-semibold text-lg mb-1">Ver Inspecciones</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Consulta todas las inspecciones registradas
                        </p>
                    </button>

                    {(user?.role === 'admin' || user?.role === 'arquitecto') && (
                        <button
                            onClick={() => navigate('/inspections/create')}
                            className="card hover:shadow-md transition-shadow text-left"
                        >
                            <Plus className="w-8 h-8 text-green-600 mb-3" />
                            <h3 className="font-semibold text-lg mb-1">Nueva Inspección</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Crea una nueva inspección técnica
                            </p>
                        </button>
                    )}

                    {user?.role === 'admin' && (
                        <button
                            onClick={() => navigate('/users')}
                            className="card hover:shadow-md transition-shadow text-left"
                        >
                            <Users className="w-8 h-8 text-red-600 mb-3" />
                            <h3 className="font-semibold text-lg mb-1">Gestionar Usuarios</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Administra cuentas, roles y estados del sistema
                            </p>
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/profile')}
                        className="card hover:shadow-md transition-shadow text-left"
                    >
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium mb-3">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Mi Perfil</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Ver y editar tu información personal
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
};

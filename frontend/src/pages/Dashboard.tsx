import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon, type CustomIconName } from '../components/CustomIcon';
import { DashboardSkeleton } from '../components/Skeleton';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import type { InspectionStats } from '../types';
import { canCreateInspection, canManageUsers } from '../utils/inspectionPermissions';

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
        return <DashboardSkeleton />;
    }

    const statsCards: Array<{ title: string; value: number; icon: CustomIconName; tone: 'cream' | 'amber' | 'blue' | 'sage' | 'rose'; accent: string; darkAccent: string }> = [
        { title: 'Total', value: stats?.total || 0, icon: 'clipboard-check', tone: 'blue', accent: 'text-sky-700', darkAccent: 'dark:text-sky-400' },
        { title: 'Pendientes', value: stats?.pendiente || 0, icon: 'clock', tone: 'amber', accent: 'text-amber-700', darkAccent: 'dark:text-amber-400' },
        { title: 'En proceso', value: stats?.en_proceso || 0, icon: 'play', tone: 'cream', accent: 'text-slate-700', darkAccent: 'dark:text-slate-300' },
        { title: 'Finalizadas', value: stats?.finalizada || 0, icon: 'seal-check', tone: 'sage', accent: 'text-emerald-700', darkAccent: 'dark:text-emerald-400' },
        { title: 'Canceladas', value: stats?.cancelada || 0, icon: 'x-circle', tone: 'rose', accent: 'text-rose-700', darkAccent: 'dark:text-rose-400' },
    ];

    const quickActions: Array<{ title: string; href: string; icon: CustomIconName; tone: 'cream' | 'mist' | 'blue' | 'sage' }> = [
        {
            title: 'Ver inspecciones',
            href: '/inspections',
            icon: 'folder-open',
            tone: 'cream',
        },
        {
            title: 'Mi perfil',
            href: '/profile',
            icon: 'user-gear',
            tone: 'mist',
        },
    ];

    if (canCreateInspection(user)) {
        quickActions.unshift({
            title: 'Nueva inspeccion',
            href: '/inspections/create',
            icon: 'plus',
            tone: 'blue',
        });
    }

    if (canManageUsers(user)) {
        quickActions.push({
            title: 'Gestionar usuarios',
            href: '/users',
            icon: 'users',
            tone: 'sage',
        });
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Welcome */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                            Bienvenido, {user?.fullName}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                    </div>

                    {canCreateInspection(user) && (
                        <button
                            onClick={() => navigate('/inspections/create')}
                            className="btn btn-primary flex items-center justify-center gap-2 sm:w-auto"
                        >
                            <CustomIcon name="plus" size="xs" tone="white" />
                            Nueva inspeccion
                        </button>
                    )}
                </div>
            </section>

            {/* Metrics */}
            <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Metricas</p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {statsCards.map((stat) => (
                        <div key={stat.title} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 sm:p-4">
                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                            <p className={`mt-1 text-lg font-bold sm:mt-2 sm:text-2xl ${stat.accent} ${stat.darkAccent}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Quick Actions */}
            <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Atajos</p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.title}
                            onClick={() => navigate(action.href)}
                            className="rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/80 sm:p-5"
                        >
                            <CustomIcon name={action.icon} tone={action.tone} size="sm" />
                            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{action.title}</h3>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};

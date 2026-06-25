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
            <section className="card overflow-hidden">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl lg:text-4xl">
                            Bienvenido, {user?.fullName}
                        </h1>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f5efe1] px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/80 sm:gap-3 sm:px-4 sm:py-2 sm:text-sm dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/80">
                            <CustomIcon name="dashboard" size="xs" tone="white" />
                            Rol: <span className="capitalize text-slate-900 dark:text-slate-100">{user?.role}</span>
                        </div>
                    </div>

                    {canCreateInspection(user) && (
                        <button
                            onClick={() => navigate('/inspections/create')}
                            className="btn btn-primary flex w-full items-center justify-center gap-3 sm:w-auto"
                        >
                            <CustomIcon name="plus" size="xs" tone="white" />
                            Nueva inspeccion
                        </button>
                    )}
                </div>
            </section>

            {/* Metrics */}
            <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 sm:text-sm">Metricas</p>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                    {statsCards.map((stat) => (
                        <div key={stat.title} className="rounded-2xl border border-slate-100 bg-white p-3 text-center sm:rounded-[24px] sm:border-slate-200 sm:p-5 sm:text-left dark:border-slate-700 dark:bg-slate-800">
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                            <p className={`mt-1 text-xl font-extrabold sm:mt-3 sm:text-3xl ${stat.accent} ${stat.darkAccent}`}>{stat.value}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Quick Actions — 2x2 grid on mobile, 4 cols on desktop */}
            <section>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 sm:text-sm">Atajos del equipo</p>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-4 xl:grid-cols-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.title}
                            onClick={() => navigate(action.href)}
                            className="rounded-2xl border border-slate-100 bg-white p-3 text-left transition-transform hover:-translate-y-0.5 sm:rounded-[24px] sm:border-slate-200 sm:p-5 dark:border-slate-700 dark:bg-slate-800"
                        >
                            <CustomIcon name={action.icon} tone={action.tone} size="sm" />
                            <h3 className="mt-2.5 text-sm font-semibold text-slate-900 sm:mt-5 sm:text-lg dark:text-slate-100">{action.title}</h3>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};

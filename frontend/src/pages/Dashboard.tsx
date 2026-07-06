import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon, type CustomIconName } from '../components/CustomIcon';
import { DashboardSkeleton } from '../components/Skeleton';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import type { Inspection, InspectionStats } from '../types';
import { canCreateInspection, canManageUsers } from '../utils/inspectionPermissions';
import { inspectionStatusLabels } from '../utils/inspectionStatus';

export const Dashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState<InspectionStats | null>(null);
    const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsData, inspectionsData] = await Promise.all([
                inspectionService.getStats(),
                inspectionService.getInspections({}),
            ]);
            setStats(statsData);
            setRecentInspections(inspectionsData.data?.slice(0, 5) || []);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar datos'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const statCards: Array<{
        title: string;
        value: number;
        icon: CustomIconName;
        bgColor: string;
        iconColor: string;
    }> = [
        { title: 'Total inspecciones', value: stats?.total || 0, icon: 'clipboard-check', bgColor: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
        { title: 'En proceso', value: stats?.en_proceso || 0, icon: 'play', bgColor: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
        { title: 'Finalizadas', value: stats?.finalizada || 0, icon: 'seal-check', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
        { title: 'Pendientes', value: stats?.pendiente || 0, icon: 'clock', bgColor: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-600 dark:text-orange-400' },
    ];

    return (
        <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Bienvenido, {user?.fullName}
                    </p>
                </div>
                {canCreateInspection(user) && (
                    <button
                        onClick={() => navigate('/inspections/create')}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <CustomIcon name="plus" size="xs" tone="white" />
                        Nueva inspeccion
                    </button>
                )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <div
                        key={stat.title}
                        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                                <CustomIcon name={stat.icon} size="xs" tone="cream" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Recent inspections - 2/3 width */}
                <div className="lg:col-span-2">
                    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Inspecciones recientes</h2>
                            <button
                                onClick={() => navigate('/inspections')}
                                className="text-xs font-medium text-[#17324a] hover:text-[#1d3d5c] dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                Ver todos
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {recentInspections.length === 0 ? (
                                <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No hay inspecciones recientes.
                                </div>
                            ) : (
                                recentInspections.map((inspection) => (
                                    <button
                                        key={inspection.id}
                                        onClick={() => navigate(`/inspections/${inspection.id}/execute`)}
                                        className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                                            <CustomIcon name="clipboard-check" size="xs" tone="mist" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                                {inspection.projectName}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(inspection.scheduledDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            inspection.status === 'en_proceso' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                : inspection.status === 'finalizada' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                            {inspectionStatusLabels[inspection.status] || inspection.status}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right sidebar - 1/3 width */}
                <div className="space-y-4">
                    {/* Quick actions */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Acciones rapidas</h3>
                        <div className="space-y-2">
                            {canCreateInspection(user) && (
                                <button
                                    onClick={() => navigate('/inspections/create')}
                                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#17324a]/30 hover:text-[#17324a] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-400/30 dark:hover:text-blue-400"
                                >
                                    <CustomIcon name="plus" size="xs" tone="cream" />
                                    Nueva inspeccion
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/inspections')}
                                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#17324a]/30 hover:text-[#17324a] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-400/30 dark:hover:text-blue-400"
                            >
                                <CustomIcon name="folder-open" size="xs" tone="cream" />
                                Ver inspecciones
                            </button>
                            {canManageUsers(user) && (
                                <button
                                    onClick={() => navigate('/users')}
                                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#17324a]/30 hover:text-[#17324a] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-400/30 dark:hover:text-blue-400"
                                >
                                    <CustomIcon name="users" size="xs" tone="cream" />
                                    Gestionar usuarios
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/profile')}
                                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-[#17324a]/30 hover:text-[#17324a] dark:border-gray-700 dark:text-gray-300 dark:hover:border-blue-400/30 dark:hover:text-blue-400"
                            >
                                <CustomIcon name="user-gear" size="xs" tone="cream" />
                                Mi perfil
                            </button>
                        </div>
                    </div>

                    {/* Status summary */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Resumen por estado</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Pendientes', value: stats?.pendiente || 0, color: 'bg-orange-500' },
                                { label: 'En proceso', value: stats?.en_proceso || 0, color: 'bg-amber-500' },
                                { label: 'Lista revision', value: stats?.lista_revision || 0, color: 'bg-blue-500' },
                                { label: 'Finalizadas', value: stats?.finalizada || 0, color: 'bg-emerald-500' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${item.color}`} />
                                        <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { CustomIcon } from '../components/CustomIcon';
import { getApiErrorMessage } from '../api/axios';
import evaluationService from '../services/evaluation.service';
import alertService from '../services/alert.service';
import type { Alert, Evaluation, DashboardKPIs } from '../types';

type RankingEntry = {
    userId: string;
    fullName: string;
    score: number;
    inspectionsCompleted?: number;
    punctualityRate?: number;
    inspectionsCreated?: number;
    approvalRate?: number;
};

export const SupervisorDashboard = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [inspectorRanking, setInspectorRanking] = useState<RankingEntry[]>([]);
    const [architectRanking, setArchitectRanking] = useState<RankingEntry[]>([]);
    const [recentEvaluations, setRecentEvaluations] = useState<Evaluation[]>([]);
    const [gravityFilter, setGravityFilter] = useState<number | ''>('');
    const [dashboardKpis, setDashboardKpis] = useState<DashboardKPIs | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [alertsRes, evaluationsRes, kpisRes] = await Promise.all([
                alertService.getAll({ limit: 10 }),
                evaluationService.getAll({ limit: 5 }),
                evaluationService.getDashboardKPIs(),
            ]);

            setAlerts(alertsRes.data ?? []);
            setRecentEvaluations(evaluationsRes.data ?? []);
            setDashboardKpis(kpisRes.data?.kpis ?? null);

            // Calculate current week for ranking
            const now = new Date();
            const dayOfWeek = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            const weekStart = monday.toISOString().split('T')[0];
            const weekEnd = sunday.toISOString().split('T')[0];

            const [inspectorRes, architectRes] = await Promise.all([
                evaluationService.getInspectorRanking(weekStart, weekEnd),
                evaluationService.getArchitectRanking(weekStart, weekEnd),
            ]);

            setInspectorRanking(inspectorRes.data?.ranking ?? []);
            setArchitectRanking(architectRes.data?.ranking ?? []);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar datos del dashboard'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredAlerts = gravityFilter !== ''
        ? alerts.filter(a => a.gravityLevel === gravityFilter)
        : alerts;

    const gravityBadge = (level: number) => {
        const styles: Record<number, string> = {
            1: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20',
            2: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20',
            3: 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/20',
        };
        const labels: Record<number, string> = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' };
        return (
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${styles[level] || styles[1]}`}>
                Nivel {level} - {labels[level] || 'Bajo'}
            </span>
        );
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            abierta: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-500/20',
            en_revision: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-500/20',
            resuelta: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20',
            borrador: 'bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300 border border-gray-500/20',
        };
        return (
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${styles[status] || styles['borrador']}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        Panel del Supervisor
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Métricas generales y gestión de equipos en tiempo real.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {([
                    { label: 'Inspecciones Activas', value: dashboardKpis?.totalActiveInspections ?? 0, bg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', icon: 'clipboard-check' as const },
                    { label: 'Vencidas', value: dashboardKpis?.overdueInspections ?? 0, bg: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400', icon: 'warning-circle' as const },
                    { label: 'Completadas (mes)', value: dashboardKpis?.completedThisMonth ?? 0, bg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: 'clipboard-check' as const },
                    { label: 'Tasa Cancelación', value: `${dashboardKpis?.cancellationRate ?? 0}%`, bg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400', icon: 'warning-circle' as const },
                ] as const).map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${stat.bg}`}>
                                <CustomIcon name={stat.icon} size="xs" tone="mist" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">{stat.label}</p>
                                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-3 gap-3">
                {([
                    { label: 'Inspectores', value: dashboardKpis?.activeInspectors ?? 0, bg: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400', icon: 'users' as const },
                    { label: 'Arquitectos', value: dashboardKpis?.activeArchitects ?? 0, bg: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400', icon: 'users' as const },
                    { label: 'Tiempo Prom.', value: `${dashboardKpis?.avgTimeGeneral ?? 0}h`, bg: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400', icon: 'clock' as const },
                ] as const).map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${stat.bg}`}>
                                <CustomIcon name={stat.icon} size="xs" tone="mist" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">{stat.label}</p>
                                <p className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Productividad Diaria */}
            {dashboardKpis?.dailyProductivity && dashboardKpis.dailyProductivity.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                Productividad Diaria (última semana)
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Inspecciones completadas por día</p>
                        </div>
                    </div>
                    <div className="flex items-end gap-2 sm:gap-4 h-44 pt-4 border-b border-gray-100 dark:border-gray-800">
                        {dashboardKpis.dailyProductivity.map((day) => {
                            const maxCount = Math.max(...dashboardKpis.dailyProductivity.map(d => d.count), 1);
                            const heightPercent = (day.count / maxCount) * 100;
                            return (
                                <div key={day.date} className="group relative flex flex-col items-center flex-1 h-full justify-end">
                                    <span className="mb-2 text-xs font-bold text-gray-900 dark:text-white opacity-90 group-hover:scale-110 transition-transform">
                                        {day.count}
                                    </span>
                                    <div className="w-full flex justify-center h-full items-end">
                                        <div
                                            className="w-full max-w-[36px] rounded-t-xl bg-gradient-to-t from-[#17324a] to-blue-600 dark:from-blue-800 dark:to-blue-500 shadow-sm transition-all duration-300 group-hover:brightness-110"
                                            style={{ height: `${Math.max(heightPercent, 8)}%` }}
                                        />
                                    </div>
                                    <span className="mt-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 capitalize">
                                        {new Date(day.date + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Rankings Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Inspector Ranking */}
                <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <CustomIcon name="seal-check" size="xs" tone="amber" />
                            Ranking de Inspectores
                        </h2>
                    </div>
                    {inspectorRanking.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm py-4">Sin datos de ranking esta semana</p>
                    ) : (
                        <div className="space-y-2.5">
                            {inspectorRanking.map((entry, idx) => (
                                <div key={entry.userId} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/60 p-3 transition-colors hover:bg-gray-100/80 dark:hover:bg-gray-800">
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                        idx === 0 ? 'bg-amber-500 text-white shadow-sm' : idx === 1 ? 'bg-gray-300 text-gray-800' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{entry.fullName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {entry.inspectionsCompleted ?? 0} inspecciones · {entry.punctualityRate ?? 0}% puntualidad
                                        </p>
                                    </div>
                                    <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">{entry.score} pt</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Architect Ranking */}
                <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <CustomIcon name="buildings" size="xs" tone="blue" />
                            Ranking de Arquitectos
                        </h2>
                    </div>
                    {architectRanking.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm py-4">Sin datos de ranking esta semana</p>
                    ) : (
                        <div className="space-y-2.5">
                            {architectRanking.map((entry, idx) => (
                                <div key={entry.userId} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/60 p-3 transition-colors hover:bg-gray-100/80 dark:hover:bg-gray-800">
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                        idx === 0 ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{entry.fullName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {entry.inspectionsCreated ?? 0} inspecciones · {entry.approvalRate ?? 0}% aprobación
                                        </p>
                                    </div>
                                    <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">{entry.score} pt</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Alerts */}
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Alertas Recientes
                    </h2>
                    <select
                        value={gravityFilter}
                        onChange={(e) => setGravityFilter(e.target.value ? Number(e.target.value) : '')}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                        <option value="">Todos los niveles</option>
                        <option value={1}>Nivel 1 - Bajo</option>
                        <option value={2}>Nivel 2 - Medio</option>
                        <option value={3}>Nivel 3 - Alto</option>
                    </select>
                </div>

                {filteredAlerts.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No hay alertas registradas</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/40 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    <th className="px-4 py-3">Título</th>
                                    <th className="px-4 py-3">Gravedad</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Supervisor</th>
                                    <th className="px-4 py-3">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                                {filteredAlerts.map((alert) => (
                                    <tr key={alert.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{alert.title}</td>
                                        <td className="px-4 py-3">{gravityBadge(alert.gravityLevel)}</td>
                                        <td className="px-4 py-3">{statusBadge(alert.status)}</td>
                                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{alert.supervisor?.fullName ?? '-'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{new Date(alert.createdAt).toLocaleDateString('es-PE')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Evaluations */}
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Evaluaciones Recientes
                </h2>
                {recentEvaluations.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No hay evaluaciones registradas</p>
                ) : (
                    <div className="space-y-3">
                        {recentEvaluations.map((evalItem: any) => (
                            <div key={evalItem.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 dark:border-gray-800 dark:bg-gray-800/60">
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{evalItem.inspector?.fullName || 'Inspector'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(evalItem.createdAt).toLocaleDateString('es-PE')}</p>
                                </div>
                                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{evalItem.score ?? 0} pts</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

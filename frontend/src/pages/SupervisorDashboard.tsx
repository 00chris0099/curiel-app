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
            1: 'bg-green-100 text-green-800',
            2: 'bg-yellow-100 text-yellow-800',
            3: 'bg-red-100 text-red-800',
        };
        const labels: Record<number, string> = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' };
        return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}>
                Nivel {level} - {labels[level]}
            </span>
        );
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            abierta: 'bg-orange-100 text-orange-800',
            en_revision: 'bg-blue-100 text-blue-800',
            resuelta: 'bg-green-100 text-green-800',
            borrador: 'bg-gray-100 text-gray-800',
            confirmada: 'bg-blue-100 text-blue-800',
            enviada: 'bg-green-100 text-green-800',
        };
        return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100">
                        Panel del Supervisor
                    </h1>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                {([
                    { label: 'Inspecciones Activas', value: dashboardKpis?.totalActiveInspections ?? 0, bg: 'bg-blue-100', icon: 'clipboard-check' as const, iconColor: 'text-blue-600' },
                    { label: 'Vencidas', value: dashboardKpis?.overdueInspections ?? 0, bg: 'bg-red-100', icon: 'warning-circle' as const, iconColor: 'text-red-600' },
                    { label: 'Completadas (mes)', value: dashboardKpis?.completedThisMonth ?? 0, bg: 'bg-green-100', icon: 'clipboard-check' as const, iconColor: 'text-green-600' },
                    { label: 'Tasa Cancelacion', value: `${dashboardKpis?.cancellationRate ?? 0}%`, bg: 'bg-yellow-100', icon: 'warning-circle' as const, iconColor: 'text-yellow-600' },
                ] as const).map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800 sm:p-5 sm:text-left">
                        <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                            <div className={`hidden h-8 w-8 items-center justify-center rounded-lg sm:flex ${stat.bg}`}>
                                <CustomIcon name={stat.icon} className={`h-4 w-4 ${stat.iconColor}`} />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                                <p className="text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-slate-100">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3">
                {([
                    { label: 'Inspectores', value: dashboardKpis?.activeInspectors ?? 0, bg: 'bg-purple-100', icon: 'users' as const, iconColor: 'text-purple-600' },
                    { label: 'Arquitectos', value: dashboardKpis?.activeArchitects ?? 0, bg: 'bg-indigo-100', icon: 'users' as const, iconColor: 'text-indigo-600' },
                    { label: 'Tiempo Prom.', value: `${dashboardKpis?.avgTimeGeneral ?? 0}h`, bg: 'bg-teal-100', icon: 'clipboard-check' as const, iconColor: 'text-teal-600' },
                ] as const).map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800 sm:p-5 sm:text-left">
                        <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                            <div className={`hidden h-8 w-8 items-center justify-center rounded-lg sm:flex ${stat.bg}`}>
                                <CustomIcon name={stat.icon} className={`h-4 w-4 ${stat.iconColor}`} />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                                <p className="text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-slate-100">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Productividad Diaria */}
            {dashboardKpis?.dailyProductivity && dashboardKpis.dailyProductivity.length > 0 && (
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                        Productividad Diaria (ultima semana)
                    </h2>
                    <div className="flex items-end gap-2 h-40">
                        {dashboardKpis.dailyProductivity.map((day) => {
                            const maxCount = Math.max(...dashboardKpis.dailyProductivity.map(d => d.count), 1);
                            const heightPercent = (day.count / maxCount) * 100;
                            return (
                                <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{day.count}</span>
                                    <div className="w-full flex justify-center">
                                        <div
                                            className="w-8 rounded-t-lg bg-primary-500 transition-all"
                                            style={{ height: `${Math.max(heightPercent, 4)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {new Date(day.date + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Inspector Ranking */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                        Ranking de Inspectores
                    </h2>
                    {inspectorRanking.length === 0 ? (
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Sin datos de ranking esta semana</p>
                    ) : (
                        <div className="space-y-3">
                            {inspectorRanking.map((entry, idx) => (
                                <div key={entry.userId} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{entry.fullName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {entry.inspectionsCompleted ?? 0} inspecciones | {entry.punctualityRate ?? 0}% puntualidad
                                        </p>
                                    </div>
                                    <span className="text-lg font-bold text-primary-600">{entry.score}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Architect Ranking */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                        Ranking de Arquitectos
                    </h2>
                    {architectRanking.length === 0 ? (
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Sin datos de ranking esta semana</p>
                    ) : (
                        <div className="space-y-3">
                            {architectRanking.map((entry, idx) => (
                                <div key={entry.userId} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{entry.fullName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {entry.inspectionsCreated ?? 0} inspecciones | {entry.approvalRate ?? 0}% aprobacion
                                        </p>
                                    </div>
                                    <span className="text-lg font-bold text-purple-600">{entry.score}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Alerts */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                        Alertas Recientes
                    </h2>
                    <select
                        value={gravityFilter}
                        onChange={(e) => setGravityFilter(e.target.value ? Number(e.target.value) : '')}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                        <option value="">Todos los niveles</option>
                        <option value={1}>Nivel 1 - Bajo</option>
                        <option value={2}>Nivel 2 - Medio</option>
                        <option value={3}>Nivel 3 - Alto</option>
                    </select>
                </div>
                {filteredAlerts.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No hay alertas registradas</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                                    <th className="pb-3 pr-4">Titulo</th>
                                    <th className="pb-3 pr-4">Gravedad</th>
                                    <th className="pb-3 pr-4">Estado</th>
                                    <th className="pb-3 pr-4">Supervisor</th>
                                    <th className="pb-3">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredAlerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{alert.title}</td>
                                        <td className="py-3 pr-4">{gravityBadge(alert.gravityLevel)}</td>
                                        <td className="py-3 pr-4">{statusBadge(alert.status)}</td>
                                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{alert.supervisor?.fullName ?? '-'}</td>
                                        <td className="py-3 text-slate-500 dark:text-slate-400">{new Date(alert.createdAt).toLocaleDateString('es-PE')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Evaluations */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    Evaluaciones Recientes
                </h2>
                {recentEvaluations.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No hay evaluaciones registradas</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                                    <th className="pb-3 pr-4">Evaluado</th>
                                    <th className="pb-3 pr-4">Semana</th>
                                    <th className="pb-3 pr-4">Score</th>
                                    <th className="pb-3 pr-4">Completadas</th>
                                    <th className="pb-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {recentEvaluations.map((ev) => (
                                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">{ev.evaluatedUser?.fullName ?? '-'}</td>
                                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                                            {ev.weekStart} - {ev.weekEnd}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className={`font-bold ${ev.compositeScore >= 70 ? 'text-green-600' : ev.compositeScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {ev.compositeScore}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{ev.inspectionsCompleted}</td>
                                        <td className="py-3">{statusBadge(ev.status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

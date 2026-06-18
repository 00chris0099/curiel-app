import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { CustomIcon } from '../components/CustomIcon';
import { getApiErrorMessage } from '../api/axios';
import evaluationService from '../services/evaluation.service';
import alertService from '../services/alert.service';
import type { Alert, Evaluation } from '../types';

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

    const loadData = useCallback(async () => {
        try {
            const [alertsRes, evaluationsRes] = await Promise.all([
                alertService.getAll({ limit: 10 }),
                evaluationService.getAll({ limit: 5 }),
            ]);

            setAlerts(alertsRes.data ?? []);
            setRecentEvaluations(evaluationsRes.data ?? []);

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
                    <h1 className="font-display text-3xl font-bold text-slate-900">
                        Panel del Supervisor
                    </h1>
                    <p className="mt-1 text-slate-500">
                        Monitoreo de calidad, evaluaciones y alertas
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                            <CustomIcon name="alert-triangle" className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Alertas Abiertas</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {alerts.filter(a => a.status === 'abierta').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100">
                            <CustomIcon name="alert-triangle" className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Nivel 3 - Alto</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {alerts.filter(a => a.gravityLevel === 3 && a.status !== 'resuelta').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                            <CustomIcon name="clipboard-check" className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Evaluaciones (mes)</p>
                            <p className="text-2xl font-bold text-slate-900">{recentEvaluations.length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                            <CustomIcon name="users" className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Inspectores Activos</p>
                            <p className="text-2xl font-bold text-slate-900">{inspectorRanking.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Inspector Ranking */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                    <h2 className="font-display text-xl font-bold text-slate-900 mb-4">
                        Ranking de Inspectores
                    </h2>
                    {inspectorRanking.length === 0 ? (
                        <p className="text-slate-500 text-sm">Sin datos de ranking esta semana</p>
                    ) : (
                        <div className="space-y-3">
                            {inspectorRanking.map((entry, idx) => (
                                <div key={entry.userId} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{entry.fullName}</p>
                                        <p className="text-xs text-slate-500">
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
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                    <h2 className="font-display text-xl font-bold text-slate-900 mb-4">
                        Ranking de Arquitectos
                    </h2>
                    {architectRanking.length === 0 ? (
                        <p className="text-slate-500 text-sm">Sin datos de ranking esta semana</p>
                    ) : (
                        <div className="space-y-3">
                            {architectRanking.map((entry, idx) => (
                                <div key={entry.userId} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{entry.fullName}</p>
                                        <p className="text-xs text-slate-500">
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
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h2 className="font-display text-xl font-bold text-slate-900">
                        Alertas Recientes
                    </h2>
                    <select
                        value={gravityFilter}
                        onChange={(e) => setGravityFilter(e.target.value ? Number(e.target.value) : '')}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">Todos los niveles</option>
                        <option value={1}>Nivel 1 - Bajo</option>
                        <option value={2}>Nivel 2 - Medio</option>
                        <option value={3}>Nivel 3 - Alto</option>
                    </select>
                </div>
                {filteredAlerts.length === 0 ? (
                    <p className="text-slate-500 text-sm">No hay alertas registradas</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                                    <th className="pb-3 pr-4">Titulo</th>
                                    <th className="pb-3 pr-4">Gravedad</th>
                                    <th className="pb-3 pr-4">Estado</th>
                                    <th className="pb-3 pr-4">Supervisor</th>
                                    <th className="pb-3">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAlerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-slate-50">
                                        <td className="py-3 pr-4 font-medium text-slate-900">{alert.title}</td>
                                        <td className="py-3 pr-4">{gravityBadge(alert.gravityLevel)}</td>
                                        <td className="py-3 pr-4">{statusBadge(alert.status)}</td>
                                        <td className="py-3 pr-4 text-slate-600">{alert.supervisor?.fullName ?? '-'}</td>
                                        <td className="py-3 text-slate-500">{new Date(alert.createdAt).toLocaleDateString('es-PE')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Evaluations */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                <h2 className="font-display text-xl font-bold text-slate-900 mb-4">
                    Evaluaciones Recientes
                </h2>
                {recentEvaluations.length === 0 ? (
                    <p className="text-slate-500 text-sm">No hay evaluaciones registradas</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                                    <th className="pb-3 pr-4">Evaluado</th>
                                    <th className="pb-3 pr-4">Semana</th>
                                    <th className="pb-3 pr-4">Score</th>
                                    <th className="pb-3 pr-4">Completadas</th>
                                    <th className="pb-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentEvaluations.map((ev) => (
                                    <tr key={ev.id} className="hover:bg-slate-50">
                                        <td className="py-3 pr-4 font-medium text-slate-900">{ev.evaluatedUser?.fullName ?? '-'}</td>
                                        <td className="py-3 pr-4 text-slate-600">
                                            {ev.weekStart} - {ev.weekEnd}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className={`font-bold ${ev.compositeScore >= 70 ? 'text-green-600' : ev.compositeScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {ev.compositeScore}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-slate-600">{ev.inspectionsCompleted}</td>
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

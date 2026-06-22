import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { getApiErrorMessage } from '../api/axios';
import alertService from '../services/alert.service';
import type { Alert, CreateAlertDto, GravityLevel } from '../types';

export const Alerts = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [gravityFilter, setGravityFilter] = useState<number | ''>('');
    const [form, setForm] = useState<CreateAlertDto>({
        gravityLevel: 1,
        title: '',
        description: '',
    });

    const loadAlerts = useCallback(async () => {
        try {
            const response = await alertService.getAll({
                status: statusFilter || undefined,
                gravityLevel: gravityFilter !== '' ? gravityFilter : undefined,
                limit: 50,
            });
            setAlerts(response.data ?? []);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar alertas'));
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, gravityFilter]);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await alertService.create(form);
            toast.success('Alerta creada exitosamente');
            setShowForm(false);
            setForm({ gravityLevel: 1, title: '', description: '' });
            loadAlerts();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al crear alerta'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (alertId: string, newStatus: string) => {
        try {
            await alertService.update(alertId, { status: newStatus });
            toast.success('Alerta actualizada');
            loadAlerts();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al actualizar alerta'));
        }
    };

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
        };
        return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100">Alertas</h1>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Gestion de alertas por niveles de gravedad</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                    {showForm ? 'Cancelar' : '+ Nueva Alerta'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nivel de Gravedad *</label>
                            <select
                                value={form.gravityLevel}
                                onChange={(e) => setForm({ ...form, gravityLevel: Number(e.target.value) as GravityLevel })}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            >
                                <option value={1}>Nivel 1 - Bajo</option>
                                <option value={2}>Nivel 2 - Medio</option>
                                <option value={3}>Nivel 3 - Alto</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Titulo *</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Titulo de la alerta"
                                required
                                minLength={5}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion *</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            rows={3}
                            placeholder="Descripcion detallada de la alerta"
                            required
                            minLength={10}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creando...' : 'Crear Alerta'}
                        </button>
                    </div>
                </form>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">Todos los estados</option>
                    <option value="abierta">Abierta</option>
                    <option value="en_revision">En Revision</option>
                    <option value="resuelta">Resuelta</option>
                </select>
                <select
                    value={gravityFilter}
                    onChange={(e) => setGravityFilter(e.target.value ? Number(e.target.value) : '')}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">Todos los niveles</option>
                    <option value={1}>Nivel 1 - Bajo</option>
                    <option value={2}>Nivel 2 - Medio</option>
                    <option value={3}>Nivel 3 - Alto</option>
                </select>
            </div>

            {/* Alerts Table */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden">
                {alerts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">No hay alertas registradas</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                                    <th className="px-4 py-3">Titulo</th>
                                    <th className="px-4 py-3">Gravedad</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Supervisor</th>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {alerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">{alert.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{alert.description}</p>
                                        </td>
                                        <td className="px-4 py-3">{gravityBadge(alert.gravityLevel)}</td>
                                        <td className="px-4 py-3">{statusBadge(alert.status)}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{alert.supervisor?.fullName ?? '-'}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(alert.createdAt).toLocaleDateString('es-PE')}</td>
                                        <td className="px-4 py-3">
                                            {alert.status === 'abierta' && (
                                                <button
                                                    onClick={() => handleStatusChange(alert.id, 'en_revision')}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    Marcar en revision
                                                </button>
                                            )}
                                            {alert.status === 'en_revision' && (
                                                <button
                                                    onClick={() => handleStatusChange(alert.id, 'resuelta')}
                                                    className="text-xs font-medium text-green-600 hover:text-green-800"
                                                >
                                                    Resolver
                                                </button>
                                            )}
                                        </td>
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

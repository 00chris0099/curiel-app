import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { CustomIcon } from '../components/CustomIcon';
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
        };
        return (
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${styles[status] || 'bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Alertas</h1>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">Gestión de alertas e incidencias por niveles de gravedad.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`btn flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold ${
                        showForm ? 'btn-secondary' : 'btn-primary'
                    }`}
                >
                    <CustomIcon name={showForm ? 'dots-three' : 'plus'} size="xs" tone={showForm ? 'mist' : 'white'} />
                    {showForm ? 'Cancelar' : 'Nueva Alerta'}
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Registrar nueva alerta</h2>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nivel de Gravedad *</label>
                                <select
                                    value={form.gravityLevel}
                                    onChange={(e) => setForm({ ...form, gravityLevel: Number(e.target.value) as GravityLevel })}
                                    className="input text-xs sm:text-sm"
                                    required
                                >
                                    <option value={1}>Nivel 1 - Bajo</option>
                                    <option value={2}>Nivel 2 - Medio</option>
                                    <option value={3}>Nivel 3 - Alto</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Título *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="input text-xs sm:text-sm"
                                    placeholder="Título de la alerta..."
                                    required
                                    minLength={5}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción *</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="input text-xs sm:text-sm"
                                rows={3}
                                placeholder="Descripción detallada de la alerta..."
                                required
                                minLength={10}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="btn btn-secondary text-xs py-2 px-4"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn-primary text-xs py-2 px-4"
                            >
                                {isSubmitting ? 'Guardando...' : 'Crear Alerta'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input text-xs sm:text-sm max-w-[200px]"
                >
                    <option value="">Todos los estados</option>
                    <option value="abierta">Abierta</option>
                    <option value="en_revision">En Revisión</option>
                    <option value="resuelta">Resuelta</option>
                </select>
                <select
                    value={gravityFilter}
                    onChange={(e) => setGravityFilter(e.target.value ? Number(e.target.value) : '')}
                    className="input text-xs sm:text-sm max-w-[200px]"
                >
                    <option value="">Todos los niveles</option>
                    <option value={1}>Nivel 1 - Bajo</option>
                    <option value={2}>Nivel 2 - Medio</option>
                    <option value={3}>Nivel 3 - Alto</option>
                </select>
            </div>

            {/* Alerts Container */}
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm overflow-hidden">
                {alerts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No hay alertas registradas</div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/60 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        <th className="px-5 py-3.5">Título</th>
                                        <th className="px-5 py-3.5">Gravedad</th>
                                        <th className="px-5 py-3.5">Estado</th>
                                        <th className="px-5 py-3.5">Supervisor</th>
                                        <th className="px-5 py-3.5">Fecha</th>
                                        <th className="px-5 py-3.5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {alerts.map((alert) => (
                                        <tr key={alert.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                                            <td className="px-5 py-3.5">
                                                <p className="font-bold text-gray-900 dark:text-white">{alert.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{alert.description}</p>
                                            </td>
                                            <td className="px-5 py-3.5">{gravityBadge(alert.gravityLevel)}</td>
                                            <td className="px-5 py-3.5">{statusBadge(alert.status)}</td>
                                            <td className="px-5 py-3.5 text-xs text-gray-600 dark:text-gray-300">{alert.supervisor?.fullName ?? '-'}</td>
                                            <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">{new Date(alert.createdAt).toLocaleDateString('es-PE')}</td>
                                            <td className="px-5 py-3.5 text-right">
                                                {alert.status === 'abierta' && (
                                                    <button
                                                        onClick={() => handleStatusChange(alert.id, 'en_revision')}
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                                    >
                                                        Marcar en revisión
                                                    </button>
                                                )}
                                                {alert.status === 'en_revision' && (
                                                    <button
                                                        onClick={() => handleStatusChange(alert.id, 'resuelta')}
                                                        className="text-xs font-bold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
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

                        {/* Mobile Cards View */}
                        <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{alert.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alert.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {gravityBadge(alert.gravityLevel)}
                                        {statusBadge(alert.status)}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800/60 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{new Date(alert.createdAt).toLocaleDateString('es-PE')}</span>
                                        {alert.status === 'abierta' && (
                                            <button
                                                onClick={() => handleStatusChange(alert.id, 'en_revision')}
                                                className="font-bold text-blue-600 dark:text-blue-400"
                                            >
                                                En revisión
                                            </button>
                                        )}
                                        {alert.status === 'en_revision' && (
                                            <button
                                                onClick={() => handleStatusChange(alert.id, 'resuelta')}
                                                className="font-bold text-emerald-600 dark:text-emerald-400"
                                            >
                                                Resolver
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

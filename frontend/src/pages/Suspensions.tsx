import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { CustomIcon } from '../components/CustomIcon';
import { getApiErrorMessage } from '../api/axios';
import suspensionService from '../services/suspension.service';
import userService from '../services/user.service';
import type { Suspension, GravityLevel, SuspensionReason, User } from '../types';

export const Suspensions = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [suspensions, setSuspensions] = useState<Suspension[]>([]);
    const [inspectors, setInspectors] = useState<User[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [form, setForm] = useState({
        inspectorId: '',
        reason: 'rendimiento' as SuspensionReason,
        description: '',
        gravityLevel: 1 as GravityLevel,
    });

    const loadData = useCallback(async () => {
        try {
            const [suspensionsRes, inspectorsRes] = await Promise.all([
                suspensionService.getAll({ status: statusFilter || undefined, limit: 50 }),
                userService.getInspectors(),
            ]);
            setSuspensions(suspensionsRes.data ?? []);
            setInspectors(inspectorsRes ?? []);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar datos'));
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.description.length < 50) {
            toast.error('La descripción debe tener al menos 50 caracteres');
            return;
        }
        setIsSubmitting(true);
        try {
            await suspensionService.create(form);
            toast.success('Suspensión creada exitosamente');
            setShowForm(false);
            setForm({ inspectorId: '', reason: 'rendimiento', description: '', gravityLevel: 1 });
            loadData();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al crear suspensión'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLift = async (id: string) => {
        try {
            await suspensionService.lift(id);
            toast.success('Suspensión levantada');
            loadData();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al levantar suspensión'));
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
            activa: 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/20',
            levantada: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20',
        };
        return (
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${styles[status] || 'bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-6 sm:space-y-8 pb-10 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Suspensiones</h1>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">Gestión de suspensiones de inspectores y auditoría.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`btn flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold ${
                        showForm ? 'btn-secondary' : 'btn-primary'
                    }`}
                >
                    <CustomIcon name={showForm ? 'dots-three' : 'plus'} size="xs" tone={showForm ? 'mist' : 'white'} />
                    {showForm ? 'Cancelar' : 'Nueva Suspensión'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Registrar nueva suspensión</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Inspector *</label>
                            <select
                                value={form.inspectorId}
                                onChange={(e) => setForm({ ...form, inspectorId: e.target.value })}
                                className="input text-xs sm:text-sm"
                                required
                            >
                                <option value="">Seleccionar inspector</option>
                                {inspectors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Motivo *</label>
                            <select
                                value={form.reason}
                                onChange={(e) => setForm({ ...form, reason: e.target.value as SuspensionReason })}
                                className="input text-xs sm:text-sm"
                                required
                            >
                                <option value="abandono">Abandono</option>
                                <option value="rendimiento">Rendimiento</option>
                                <option value="conducta">Conducta</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Gravedad *</label>
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
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción * (mínimo 50 caracteres)</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="input text-xs sm:text-sm"
                            rows={3}
                            required
                            minLength={50}
                            placeholder="Descripción detallada del motivo de suspensión..."
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
                            {isSubmitting ? 'Creando...' : 'Crear Suspensión'}
                        </button>
                    </div>
                </form>
            )}

            {/* Filter */}
            <div className="flex gap-3">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input text-xs sm:text-sm max-w-[200px]"
                >
                    <option value="">Todos los estados</option>
                    <option value="activa">Activa</option>
                    <option value="levantada">Levantada</option>
                </select>
            </div>

            {/* Table / Cards Container */}
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm overflow-hidden">
                {suspensions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No hay suspensiones registradas</div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/60 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        <th className="px-5 py-3.5">Inspector</th>
                                        <th className="px-5 py-3.5">Motivo</th>
                                        <th className="px-5 py-3.5">Gravedad</th>
                                        <th className="px-5 py-3.5">Estado</th>
                                        <th className="px-5 py-3.5">Supervisor</th>
                                        <th className="px-5 py-3.5">Fecha</th>
                                        <th className="px-5 py-3.5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {suspensions.map((s) => (
                                        <tr key={s.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                                            <td className="px-5 py-3.5 font-bold text-gray-900 dark:text-white">{s.inspector?.fullName ?? '-'}</td>
                                            <td className="px-5 py-3.5 text-xs text-gray-600 dark:text-gray-300 capitalize">{s.reason}</td>
                                            <td className="px-5 py-3.5">{gravityBadge(s.gravityLevel)}</td>
                                            <td className="px-5 py-3.5">{statusBadge(s.status)}</td>
                                            <td className="px-5 py-3.5 text-xs text-gray-600 dark:text-gray-300">{s.supervisor?.fullName ?? '-'}</td>
                                            <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">{new Date(s.createdAt).toLocaleDateString('es-PE')}</td>
                                            <td className="px-5 py-3.5 text-right">
                                                {s.status === 'activa' && (
                                                    <button
                                                        onClick={() => handleLift(s.id)}
                                                        className="text-xs font-bold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                                                    >
                                                        Levantar
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
                            {suspensions.map((s) => (
                                <div key={s.id} className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{s.inspector?.fullName ?? '-'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">Motivo: {s.reason}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {gravityBadge(s.gravityLevel)}
                                        {statusBadge(s.status)}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800/60 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{new Date(s.createdAt).toLocaleDateString('es-PE')}</span>
                                        {s.status === 'activa' && (
                                            <button
                                                onClick={() => handleLift(s.id)}
                                                className="font-bold text-emerald-600 dark:text-emerald-400"
                                            >
                                                Levantar
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

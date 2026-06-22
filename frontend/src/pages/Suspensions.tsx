import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
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
            toast.error('La descripcion debe tener al menos 50 caracteres');
            return;
        }
        setIsSubmitting(true);
        try {
            await suspensionService.create(form);
            toast.success('Suspension creada exitosamente');
            setShowForm(false);
            setForm({ inspectorId: '', reason: 'rendimiento', description: '', gravityLevel: 1 });
            loadData();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al crear suspension'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLift = async (id: string) => {
        try {
            await suspensionService.lift(id);
            toast.success('Suspension levantada');
            loadData();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al levantar suspension'));
        }
    };

    const gravityBadge = (level: number) => {
        const styles: Record<number, string> = { 1: 'bg-green-100 text-green-800', 2: 'bg-yellow-100 text-yellow-800', 3: 'bg-red-100 text-red-800' };
        const labels: Record<number, string> = { 1: 'Bajo', 2: 'Medio', 3: 'Alto' };
        return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}>Nivel {level} - {labels[level]}</span>;
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = { activa: 'bg-red-100 text-red-800', levantada: 'bg-green-100 text-green-800' };
        return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
    };

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100">Suspensiones</h1>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Gestion de suspensiones de inspectores</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
                    {showForm ? 'Cancelar' : '+ Nueva Suspension'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Inspector *</label>
                            <select value={form.inspectorId} onChange={(e) => setForm({ ...form, inspectorId: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required>
                                <option value="">Seleccionar inspector</option>
                                {inspectors.map((i) => <option key={i.id} value={i.id}>{i.fullName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo *</label>
                            <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value as SuspensionReason })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required>
                                <option value="abandono">Abandono</option>
                                <option value="rendimiento">Rendimiento</option>
                                <option value="conducta">Conducta</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Gravedad *</label>
                            <select value={form.gravityLevel} onChange={(e) => setForm({ ...form, gravityLevel: Number(e.target.value) as GravityLevel })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required>
                                <option value={1}>Nivel 1 - Bajo</option>
                                <option value={2}>Nivel 2 - Medio</option>
                                <option value={3}>Nivel 3 - Alto</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion * (min 50 caracteres)</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} required minLength={50} placeholder="Descripcion detallada del motivo de suspension..." />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{isSubmitting ? 'Creando...' : 'Crear Suspension'}</button>
                    </div>
                </form>
            )}

            <div className="flex gap-3">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Todos los estados</option>
                    <option value="activa">Activa</option>
                    <option value="levantada">Levantada</option>
                </select>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden">
                {suspensions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">No hay suspensiones registradas</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                                    <th className="px-4 py-3">Inspector</th>
                                    <th className="px-4 py-3">Motivo</th>
                                    <th className="px-4 py-3">Gravedad</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Supervisor</th>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {suspensions.map((s) => (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.inspector?.fullName ?? '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">{s.reason}</td>
                                        <td className="px-4 py-3">{gravityBadge(s.gravityLevel)}</td>
                                        <td className="px-4 py-3">{statusBadge(s.status)}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.supervisor?.fullName ?? '-'}</td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(s.createdAt).toLocaleDateString('es-PE')}</td>
                                        <td className="px-4 py-3">
                                            {s.status === 'activa' && (
                                                <button onClick={() => handleLift(s.id)} className="text-xs font-medium text-green-600 hover:text-green-800">Levantar</button>
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

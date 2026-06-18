import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { getApiErrorMessage } from '../api/axios';
import inspectionService from '../services/inspection.service';
import type { Inspection, GravityLevel } from '../types';

type ActionType = 'cancel' | 'delete' | 'reject';

export const SupervisorActions = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
    const [actionType, setActionType] = useState<ActionType>('cancel');
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        reasonCode: '',
        description: '',
        gravityLevel: 1 as GravityLevel,
    });

    const loadInspections = useCallback(async () => {
        try {
            const response = await inspectionService.getInspections({});
            setInspections(response.data ?? []);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar inspecciones'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInspections();
    }, [loadInspections]);

    const cancellationReasons = [
        { value: 'cliente_reprogramo', label: 'Cliente reprogramo' },
        { value: 'cliente_no_responde', label: 'Cliente no responde' },
        { value: 'cliente_cancelo_servicio', label: 'Cliente cancelo servicio' },
        { value: 'clima_adverso', label: 'Clima adverso' },
        { value: 'inspector_indisponible', label: 'Inspector indisponible' },
        { value: 'acceso_restringido', label: 'Acceso restringido' },
        { value: 'otro', label: 'Otro' },
    ];

    const deletionReasons = [
        { value: 'duplicada', label: 'Inspeccion duplicada' },
        { value: 'error_carga', label: 'Error de carga' },
        { value: 'cliente_lo_solicito', label: 'Cliente lo solicito' },
        { value: 'otro', label: 'Otro' },
    ];

    const rejectionReasons = [
        { value: 'faltan_fotos', label: 'Faltan fotos' },
        { value: 'faltan_observaciones', label: 'Faltan observaciones' },
        { value: 'calidad_incompleta', label: 'Calidad incompleta' },
        { value: 'datos_incorrectos', label: 'Datos incorrectos' },
        { value: 'otro', label: 'Otro' },
    ];

    const getReasons = () => {
        switch (actionType) {
            case 'cancel': return cancellationReasons;
            case 'delete': return deletionReasons;
            case 'reject': return rejectionReasons;
        }
    };

    const openAction = (inspection: Inspection, type: ActionType) => {
        setSelectedInspection(inspection);
        setActionType(type);
        setForm({ reasonCode: '', description: '', gravityLevel: 1 });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInspection) return;
        if (form.description.length < 20) {
            toast.error('La descripcion debe tener al menos 20 caracteres');
            return;
        }
        setIsSubmitting(true);
        try {
            if (actionType === 'cancel') {
                await inspectionService.updateStatus(selectedInspection.id, {
                    status: 'cancelada',
                    reasonCode: form.reasonCode,
                    comment: form.description,
                });
                toast.success('Solicitud de cancelacion enviada');
            } else if (actionType === 'reject') {
                await inspectionService.updateStatus(selectedInspection.id, {
                    status: 'pendiente',
                    reasonCode: form.reasonCode,
                    comment: form.description,
                });
                toast.success('Inspeccion rechazada, vuelve a pendiente');
            } else if (actionType === 'delete') {
                await inspectionService.deleteInspection(selectedInspection.id);
                toast.success('Inspeccion eliminada');
            }
            setShowForm(false);
            loadInspections();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al procesar accion'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pendiente: 'bg-yellow-100 text-yellow-800',
            en_proceso: 'bg-blue-100 text-blue-800',
            lista_revision: 'bg-purple-100 text-purple-800',
            finalizada: 'bg-green-100 text-green-800',
            cancelada: 'bg-red-100 text-red-800',
            reprogramada: 'bg-orange-100 text-orange-800',
        };
        return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>{status.replace('_', ' ')}</span>;
    };

    const actionTitle = () => {
        switch (actionType) {
            case 'cancel': return 'Cancelar Inspeccion';
            case 'delete': return 'Eliminar Inspeccion';
            case 'reject': return 'Rechazar Inspeccion';
        }
    };

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-3xl font-bold text-slate-900">Acciones de Supervisor</h1>
                <p className="mt-1 text-slate-500">Cancelar, eliminar o rechazar inspecciones</p>
            </div>

            {showForm && selectedInspection && (
                <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 space-y-4">
                    <h3 className="font-display text-lg font-bold text-slate-900">{actionTitle()}</h3>
                    <p className="text-sm text-slate-500">Inspeccion: {selectedInspection.projectName} ({selectedInspection.status})</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo *</label>
                            <select value={form.reasonCode} onChange={(e) => setForm({ ...form, reasonCode: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" required>
                                <option value="">Seleccionar motivo</option>
                                {getReasons().map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        {actionType === 'reject' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nivel de Gravedad</label>
                                <select value={form.gravityLevel} onChange={(e) => setForm({ ...form, gravityLevel: Number(e.target.value) as GravityLevel })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                                    <option value={1}>Nivel 1 - Bajo</option>
                                    <option value={2}>Nivel 2 - Medio</option>
                                    <option value={3}>Nivel 3 - Alto</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion * (min 20 caracteres)</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" rows={3} required minLength={20} placeholder="Describe el motivo..." />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{isSubmitting ? 'Procesando...' : 'Confirmar'}</button>
                    </div>
                </form>
            )}

            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                {inspections.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No hay inspecciones</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                                    <th className="px-4 py-3">Proyecto</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Inspector</th>
                                    <th className="px-4 py-3">Fecha</th>
                                    <th className="px-4 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {inspections.map((insp) => (
                                    <tr key={insp.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{insp.projectName}</td>
                                        <td className="px-4 py-3">{statusBadge(insp.status)}</td>
                                        <td className="px-4 py-3 text-slate-600">{insp.inspectorName ?? '-'}</td>
                                        <td className="px-4 py-3 text-slate-500">{new Date(insp.scheduledDate).toLocaleDateString('es-PE')}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                {insp.status !== 'finalizada' && insp.status !== 'cancelada' && (
                                                    <button onClick={() => openAction(insp, 'cancel')} className="text-xs font-medium text-orange-600 hover:text-orange-800">Cancelar</button>
                                                )}
                                                {insp.status === 'lista_revision' && (
                                                    <button onClick={() => openAction(insp, 'reject')} className="text-xs font-medium text-red-600 hover:text-red-800">Rechazar</button>
                                                )}
                                                {insp.status === 'pendiente' && (
                                                    <button onClick={() => openAction(insp, 'delete')} className="text-xs font-medium text-red-600 hover:text-red-800">Eliminar</button>
                                                )}
                                            </div>
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

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { getApiErrorMessage } from '../api/axios';
import evaluationService from '../services/evaluation.service';
import type { Evaluation } from '../types';

export const Evaluations = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editNotes, setEditNotes] = useState('');
    const [editActions, setEditActions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadEvaluations = useCallback(async () => {
        try {
            const response = await evaluationService.getAll({
                status: statusFilter || undefined,
                limit: 50,
            });
            setEvaluations(response.data ?? []);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar evaluaciones'));
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        loadEvaluations();
    }, [loadEvaluations]);

    const handleConfirm = async (id: string) => {
        try {
            await evaluationService.update(id, { status: 'confirmada' });
            toast.success('Evaluacion confirmada');
            loadEvaluations();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al confirmar evaluacion'));
        }
    };

    const handleSend = async (id: string) => {
        try {
            await evaluationService.update(id, { status: 'enviada' });
            toast.success('Evaluacion enviada');
            loadEvaluations();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al enviar evaluacion'));
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedEvaluation) return;
        setIsSubmitting(true);
        try {
            await evaluationService.update(selectedEvaluation.id, {
                notes: editNotes,
                actions: editActions,
            });
            toast.success('Notas actualizadas');
            setIsEditing(false);
            loadEvaluations();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al guardar notas'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (ev: Evaluation) => {
        setSelectedEvaluation(ev);
        setEditNotes(ev.notes || '');
        setEditActions(ev.actions || '');
        setIsEditing(true);
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            borrador: 'bg-gray-100 text-gray-800',
            confirmada: 'bg-blue-100 text-blue-800',
            enviada: 'bg-green-100 text-green-800',
        };
        return (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const scoreColor = (score: number) => {
        if (score >= 70) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (isLoading) return <Loader />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold text-slate-900">Evaluaciones</h1>
                    <p className="mt-1 text-slate-500">Historial de evaluaciones semanales de inspectores y arquitectos</p>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-3">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">Todos los estados</option>
                    <option value="borrador">Borrador</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="enviada">Enviada</option>
                </select>
            </div>

            {/* Evaluations Table */}
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                {evaluations.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No hay evaluaciones registradas</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase text-slate-500">
                                    <th className="px-4 py-3">Evaluado</th>
                                    <th className="px-4 py-3">Semana</th>
                                    <th className="px-4 py-3">Score</th>
                                    <th className="px-4 py-3">Completadas</th>
                                    <th className="px-4 py-3">Puntualidad</th>
                                    <th className="px-4 py-3">Rechazo</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {evaluations.map((ev) => (
                                    <tr key={ev.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">{ev.evaluatedUser?.fullName ?? '-'}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">
                                            {ev.weekStart} al {ev.weekEnd}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-lg font-bold ${scoreColor(ev.compositeScore)}`}>
                                                {ev.compositeScore}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{ev.inspectionsCompleted}</td>
                                        <td className="px-4 py-3 text-slate-600">{ev.punctualityRate}%</td>
                                        <td className="px-4 py-3 text-slate-600">{ev.rejectionRate}%</td>
                                        <td className="px-4 py-3">{statusBadge(ev.status)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => startEdit(ev)}
                                                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                                                >
                                                    Editar
                                                </button>
                                                {ev.status === 'borrador' && (
                                                    <button
                                                        onClick={() => handleConfirm(ev.id)}
                                                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                                    >
                                                        Confirmar
                                                    </button>
                                                )}
                                                {ev.status === 'confirmada' && (
                                                    <button
                                                        onClick={() => handleSend(ev.id)}
                                                        className="text-xs font-medium text-green-600 hover:text-green-800"
                                                    >
                                                        Enviar
                                                    </button>
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

            {/* Edit Modal */}
            {isEditing && selectedEvaluation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
                        <h3 className="font-display text-xl font-bold text-slate-900 mb-4">
                            Editar Evaluacion
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            {selectedEvaluation.evaluatedUser?.fullName} - Semana {selectedEvaluation.weekStart}
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                                <textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    rows={3}
                                    placeholder="Notas sobre incidentes o observaciones"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Acciones Tomadas</label>
                                <textarea
                                    value={editActions}
                                    onChange={(e) => setEditActions(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    rows={3}
                                    placeholder="Acciones tomadas por el supervisor"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveNotes}
                                disabled={isSubmitting}
                                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

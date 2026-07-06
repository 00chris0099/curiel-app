import { memo, useState, type FormEvent } from 'react';
import { CustomIcon } from '../../components/CustomIcon';
import { observationSeverityIconMap } from '../../utils/iconSystem';
import { observationSeverityOptions, observationTypeOptions, observationStatusOptions, severityBadges } from './executionConstants';
import { type ObservationFormState, emptyObservationForm } from './executionTypes';
import type { InspectionArea, InspectionObservation, ObservationSeverity, ObservationType, ObservationResolutionStatus } from '../../types';
import type { OfflineSyncItem } from '../../utils/offlineDb';

type ModuleObservacionesProps = {
    areas: InspectionArea[];
    observations: InspectionObservation[];
    busyAction: string | null;
    canEdit: boolean;
    getEntitySyncState: (entityType: OfflineSyncItem['entityType'], entityId: string) => 'pending' | 'failed' | 'synced';
    onSaveObservation: (form: ObservationFormState, editingId?: string) => void;
    onDeleteObservation: (observationId: string) => void;
};

export const ModuleObservaciones = memo(({
    areas,
    observations,
    busyAction,
    canEdit,
    getEntitySyncState,
    onSaveObservation,
    onDeleteObservation,
}: ModuleObservacionesProps) => {
    const [form, setForm] = useState<ObservationFormState>(emptyObservationForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedAreaId, setExpandedAreaId] = useState<string | null>(areas[0]?.id || null);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) return;
        onSaveObservation(form, editingId || undefined);
        setForm(emptyObservationForm);
        setEditingId(null);
    };

    const handleEdit = (obs: InspectionObservation) => {
        setEditingId(obs.id);
        setForm({
            title: obs.title,
            description: obs.description,
            severity: obs.severity,
            type: obs.type,
            recommendation: obs.recommendation || '',
            metricValue: obs.metricValue?.toString() || '',
            metricUnit: obs.metricUnit || '',
            status: obs.status,
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm(emptyObservationForm);
    };

    const handleDelete = (obsId: string) => {
        if (!window.confirm('¿Eliminar esta observación técnica?')) return;
        onDeleteObservation(obsId);
    };

    return (
        <div className="space-y-4">
            {areas.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-900/40">
                    <CustomIcon name="rooms" size="md" tone="mist" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Primero debes crear áreas para poder registrar observaciones.
                    </p>
                </div>
            ) : (
                <>
                    {canEdit && (
                        <div className="rounded-2xl border border-dashed border-primary-300 bg-primary-50/50 p-4 dark:border-primary-700 dark:bg-primary-900/10">
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {editingId ? 'Editando observación' : 'Nueva observación'}
                                    </p>
                                    {editingId && (
                                        <button type="button" onClick={handleCancelEdit} className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400">
                                            Cancelar edición
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <input
                                        className="input"
                                        placeholder="Título"
                                        value={form.title}
                                        onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                                        required
                                    />
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-500">Severidad</label>
                                        <select
                                            className="input"
                                            value={form.severity}
                                            onChange={(e) => setForm((current) => ({ ...current, severity: e.target.value as ObservationSeverity }))}
                                        >
                                            {observationSeverityOptions.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-500">Tipo</label>
                                        <select
                                            className="input"
                                            value={form.type}
                                            onChange={(e) => setForm((current) => ({ ...current, type: e.target.value as ObservationType }))}
                                        >
                                            {observationTypeOptions.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-500">Estado</label>
                                        <select
                                            className="input"
                                            value={form.status}
                                            onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as ObservationResolutionStatus }))}
                                        >
                                            {observationStatusOptions.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <textarea
                                    className="input min-h-[100px]"
                                    value={form.description}
                                    onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                                    placeholder="Describe el hallazgo técnico..."
                                    required
                                />
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <input
                                        className="input"
                                        placeholder="Recomendación"
                                        value={form.recommendation}
                                        onChange={(e) => setForm((current) => ({ ...current, recommendation: e.target.value }))}
                                    />
                                    <input
                                        className="input"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Valor métrico"
                                        value={form.metricValue}
                                        onChange={(e) => setForm((current) => ({ ...current, metricValue: e.target.value }))}
                                    />
                                    <input
                                        className="input"
                                        placeholder="Unidad (m², %, und)"
                                        value={form.metricUnit}
                                        onChange={(e) => setForm((current) => ({ ...current, metricUnit: e.target.value }))}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary flex items-center gap-2"
                                    disabled={busyAction === 'save-observation'}
                                >
                                    {busyAction === 'save-observation' ? (
                                        <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Guardando...</>
                                    ) : (
                                        <>{editingId ? 'Guardar cambios' : 'Agregar observación'}</>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="space-y-3">
                        {areas.map((area) => {
                            const areaObs = observations.filter((o) => o.areaId === area.id);
                            const isExpanded = expandedAreaId === area.id;

                            return (
                                <div key={area.id} className="rounded-2xl border border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <CustomIcon name="rooms" size="xs" tone="mist" />
                                            <span className="font-medium text-gray-900 dark:text-white">{area.name}</span>
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                {areaObs.length} obs.
                                            </span>
                                        </div>
                                        <span className={`text-xs text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
                                            {areaObs.length === 0 ? (
                                                <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    No hay observaciones para esta área.
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {areaObs.map((obs) => (
                                                        <article key={obs.id} className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
                                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h4 className="font-semibold text-gray-900 dark:text-white">{obs.title}</h4>
                                                                        <span className={`badge ${severityBadges[obs.severity]}`}>
                                                                            <CustomIcon name={observationSeverityIconMap[obs.severity] ?? 'warning'} size="xs" tone="white" />
                                                                            {obs.severity}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                        {obs.type} · {obs.status}
                                                                        {obs.metricValue !== null && obs.metricValue !== undefined && ` · ${obs.metricValue} ${obs.metricUnit || ''}`}
                                                                    </p>
                                                                    <p className="mt-1 text-xs text-gray-400">
                                                                        {getEntitySyncState('observation', obs.id) === 'pending' && 'Pendiente de sincronizar'}
                                                                        {getEntitySyncState('observation', obs.id) === 'failed' && 'Error al sincronizar'}
                                                                        {(getEntitySyncState('observation', obs.id) === 'synced' || getEntitySyncState('observation', obs.id) === undefined) && 'Guardado'}
                                                                    </p>
                                                                </div>
                                                                {canEdit && (
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleEdit(obs)}
                                                                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-600"
                                                                        >
                                                                            Editar
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDelete(obs.id)}
                                                                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 dark:border-red-800 dark:text-red-300"
                                                                        >
                                                                            Eliminar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{obs.description}</p>
                                                            {obs.recommendation && (
                                                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                                    <span className="font-medium">Recomendación:</span> {obs.recommendation}
                                                                </p>
                                                            )}
                                                        </article>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
});
ModuleObservaciones.displayName = 'ModuleObservaciones';

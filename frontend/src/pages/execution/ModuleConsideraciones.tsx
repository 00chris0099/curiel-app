import { memo } from 'react';
import type { SummaryFormState } from './executionTypes';
import type { ExecutionReportStatus, Inspection } from '../../types';

type ModuleConsideracionesProps = {
    summaryForm: SummaryFormState;
    inspection: Inspection | null;
    busyAction: string | null;
    canEdit: boolean;
    canApproveReport: boolean;
    onSummaryChange: (updater: (current: SummaryFormState) => SummaryFormState) => void;
    onSaveSummary: () => void;
};

export const ModuleConsideraciones = memo(({
    summaryForm,
    busyAction,
    canEdit,
    canApproveReport,
    onSummaryChange,
    onSaveSummary,
}: ModuleConsideracionesProps) => (
    <div className="space-y-4">
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Conclusión general</label>
            <textarea
                className="input min-h-[130px]"
                value={summaryForm.generalConclusion}
                onChange={(e) => onSummaryChange((current) => ({ ...current, generalConclusion: e.target.value }))}
                placeholder="Resume el estado global del departamento, el nivel de riesgo y el criterio técnico principal."
                disabled={!canEdit}
            />
        </div>

        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Recomendaciones finales</label>
            <textarea
                className="input min-h-[130px]"
                value={summaryForm.finalRecommendations}
                onChange={(e) => onSummaryChange((current) => ({ ...current, finalRecommendations: e.target.value }))}
                placeholder="Indica acciones correctivas, prioridad de intervención y sugerencias para revisión posterior."
                disabled={!canEdit}
            />
        </div>

        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Estado del informe</label>
            <select
                className="input"
                value={summaryForm.reportStatus}
                onChange={(e) => onSummaryChange((current) => ({ ...current, reportStatus: e.target.value as ExecutionReportStatus }))}
                disabled={!canEdit}
            >
                <option value="borrador">Borrador</option>
                <option value="listo_para_revision">Listo para revisión</option>
                {canApproveReport && <option value="aprobado">Aprobado</option>}
            </select>
        </div>

        {canEdit && (
            <button
                type="button"
                onClick={onSaveSummary}
                className="btn btn-primary flex items-center gap-2"
                disabled={busyAction === 'save-summary'}
            >
                {busyAction === 'save-summary' ? (
                    <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Guardando...</>
                ) : (
                    <>Guardar resumen</>
                )}
            </button>
        )}
    </div>
));
ModuleConsideraciones.displayName = 'ModuleConsideraciones';

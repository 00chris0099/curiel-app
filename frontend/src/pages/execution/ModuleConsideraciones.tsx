import { memo } from 'react';
import type { SummaryFormState } from './executionTypes';

type ModuleConsideracionesProps = {
    summaryForm: SummaryFormState;
    busyAction: string | null;
    canEdit: boolean;
    onSummaryChange: (updater: (current: SummaryFormState) => SummaryFormState) => void;
    onSaveSummary: () => void;
};

export const ModuleConsideraciones = memo(({
    summaryForm,
    busyAction,
    canEdit,
    onSummaryChange,
    onSaveSummary,
}: ModuleConsideracionesProps) => (
    <div className="space-y-3">
        <textarea
            className="input min-h-[200px]"
            value={summaryForm.generalConclusion}
            onChange={(e) => onSummaryChange((current) => ({ ...current, generalConclusion: e.target.value }))}
            placeholder="Escribe las consideraciones finales y recomendaciones..."
            disabled={!canEdit}
        />

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
                    <>Guardar</>
                )}
            </button>
        )}
    </div>
));
ModuleConsideraciones.displayName = 'ModuleConsideraciones';

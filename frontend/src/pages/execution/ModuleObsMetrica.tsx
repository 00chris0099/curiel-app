import { memo, useState, useEffect } from 'react';
import { CustomIcon } from '../../components/CustomIcon';
import type { InspectionObservation } from '../../types';

type ModuleObsMetricaProps = {
    observations: InspectionObservation[];
    canEdit: boolean;
    onSaveMetric: (text: string) => void;
};

export const ModuleObsMetrica = memo(({
    observations,
    canEdit,
    onSaveMetric,
}: ModuleObsMetricaProps) => {
    const metricObs = observations.find((o) => o.areaId === 'metrico');
    const [text, setText] = useState(metricObs?.description || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setText(metricObs?.description || '');
    }, [metricObs?.description]);

    useEffect(() => {
        if (!text || text === (metricObs?.description || '')) return;

        const timer = setTimeout(() => {
            setIsSaving(true);
            onSaveMetric(text);
            setTimeout(() => setIsSaving(false), 1000);
        }, 2000);

        return () => clearTimeout(timer);
    }, [text]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Registra observaciones de tipo métrico: mediciones, cotas, desviaciones dimensionales, etc.
                </p>
                {isSaving && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                        <CustomIcon name="sync" size="xs" tone="cream" spin /> Guardando...
                    </span>
                )}
            </div>
            <textarea
                className="input min-h-[200px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe las observaciones métricas aquí..."
                disabled={!canEdit}
            />
        </div>
    );
});
ModuleObsMetrica.displayName = 'ModuleObsMetrica';

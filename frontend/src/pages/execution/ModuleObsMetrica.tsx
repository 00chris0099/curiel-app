import { memo, useState, useEffect, useMemo } from 'react';
import { CustomIcon } from '../../components/CustomIcon';
import type { InspectionArea, InspectionObservation } from '../../types';

type ModuleObsMetricaProps = {
    areas: InspectionArea[];
    observations: InspectionObservation[];
    canEdit: boolean;
    onSaveMetric: (text: string) => void;
};

export const ModuleObsMetrica = memo(({
    areas,
    observations,
    canEdit,
    onSaveMetric,
}: ModuleObsMetricaProps) => {
    const metricObs = observations.find((o) => o.areaId === 'metrico');
    const [text, setText] = useState(metricObs?.description || '');
    const [isSaving, setIsSaving] = useState(false);

    const murosYVanosPercentage = useMemo(() => {
        const murosArea = areas.find((a) => a.name.toLowerCase() === 'muros y vanos');
        if (!murosArea || !murosArea.calculatedAreaM2) return null;
        const totalArea = areas.reduce((sum, a) => sum + Number(a.calculatedAreaM2 || 0), 0);
        if (totalArea <= 0) return null;
        return (Number(murosArea.calculatedAreaM2) / totalArea) * 100;
    }, [areas]);

    const formalText = useMemo(() => {
        if (murosYVanosPercentage === null) {
            return '';
        }
        const pct = murosYVanosPercentage.toFixed(1);
        if (murosYVanosPercentage <= 12) {
            return `Cumple el área total del departamento con ${pct}% de muros y vanos, es aceptable.`;
        } else {
            return `El área total del departamento presenta ${pct}% de muros y vanos, supera el límite aceptable del 12%. Se recomienda revisar la distribución espacial.`;
        }
    }, [murosYVanosPercentage]);

    useEffect(() => {
        if (metricObs?.description) {
            setText(metricObs.description);
        } else if (formalText) {
            setText(formalText);
        }
    }, [metricObs?.description, formalText]);

    useEffect(() => {
        if (!text || text === (metricObs?.description || formalText)) return;

        const timer = setTimeout(() => {
            setIsSaving(true);
            onSaveMetric(text);
            setTimeout(() => setIsSaving(false), 1000);
        }, 2000);

        return () => clearTimeout(timer);
    }, [text]);

    return (
        <div className="space-y-3">
            {murosYVanosPercentage !== null && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                    murosYVanosPercentage > 12
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                }`}>
                    <CustomIcon name="ruler" size="xs" tone={murosYVanosPercentage > 12 ? 'rose' : 'sage'} />
                    <span className="font-medium">Muros y vanos: {murosYVanosPercentage.toFixed(1)}% del total</span>
                    <span className="text-xs opacity-75">({murosYVanosPercentage > 12 ? 'Fuera de rango' : 'Dentro de parámetros'})</span>
                </div>
            )}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Observaciones métricas para el informe.
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

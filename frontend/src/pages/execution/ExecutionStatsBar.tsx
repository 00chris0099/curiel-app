import { CustomIcon } from '../../components/CustomIcon';
import { reportStatusLabels } from './executionConstants';

type ExecutionStatsBarProps = {
    totalAreaM2: number;
    areasRegistered: number;
    totalObservations: number;
    criticalObservations: number;
    photosCount: number;
    reportStatus: string;
};

export const ExecutionStatsBar = ({
    totalAreaM2,
    areasRegistered,
    totalObservations,
    criticalObservations,
    photosCount,
    reportStatus,
}: ExecutionStatsBarProps) => (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-[#fbfbfa] px-4 py-2.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
            <CustomIcon name="ruler" size="xs" tone="blue" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">{totalAreaM2.toFixed(1)} m²</span>
        </span>
        <span className="text-gray-300">|</span>
        <span>{areasRegistered} áreas</span>
        <span className="text-gray-300">|</span>
        <span>{totalObservations} obs.</span>
        {criticalObservations > 0 && (
            <>
                <span className="text-gray-300">|</span>
                <span className="font-semibold text-red-600">{criticalObservations} críticas</span>
            </>
        )}
        <span className="text-gray-300">|</span>
        <span>{photosCount} fotos</span>
        <span className="text-gray-300">|</span>
        <span>Informe: {reportStatusLabels[reportStatus as keyof typeof reportStatusLabels] || 'Borrador'}</span>
    </div>
);

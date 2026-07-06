import { CustomIcon } from '../../components/CustomIcon';

type ExecutionStatsBarProps = {
    totalAreaM2: number;
    areasRegistered: number;
    totalObservations: number;
    criticalObservations: number;
    photosCount: number;
};

export const ExecutionStatsBar = ({
    totalAreaM2,
    areasRegistered,
    totalObservations,
    criticalObservations,
    photosCount,
}: ExecutionStatsBarProps) => (
    <>
        {/* Mobile: ultra compact */}
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#fbfbfa] px-3 py-2 text-[11px] text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 sm:hidden">
            <span className="flex items-center gap-1">
                <CustomIcon name="ruler" size="xs" tone="blue" />
                <span className="font-bold text-gray-900 dark:text-gray-100">{totalAreaM2.toFixed(1)}m²</span>
            </span>
            <span className="text-gray-300">·</span>
            <span>{areasRegistered} áreas</span>
            <span className="text-gray-300">·</span>
            <span>{totalObservations} obs.</span>
            {criticalObservations > 0 && (
                <>
                    <span className="text-gray-300">·</span>
                    <span className="font-bold text-red-600">{criticalObservations} crit.</span>
                </>
            )}
            <span className="text-gray-300">·</span>
            <span>{photosCount} fotos</span>
        </div>

        {/* Desktop: full stats */}
        <div className="hidden items-center gap-3 rounded-2xl border border-gray-100 bg-[#fbfbfa] px-4 py-2.5 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 sm:flex">
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
        </div>
    </>
);

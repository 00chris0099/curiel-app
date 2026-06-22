interface SkeletonProps {
    className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => (
    <div className={`animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700 ${className}`} />
);

export const SkeletonText = ({ lines = 3, className = '' }: SkeletonProps & { lines?: number }) => (
    <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
            />
        ))}
    </div>
);

export const SkeletonCard = ({ className = '' }: SkeletonProps) => (
    <div className={`rounded-[24px] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:rounded-[28px] ${className}`}>
        <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-1/2" />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl" />
        </div>
    </div>
);

export const SkeletonTable = ({ rows = 5, className = '' }: SkeletonProps & { rows?: number }) => (
    <div className={`rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:rounded-[28px] sm:p-6 ${className}`}>
        <div className="space-y-4">
            <div className="flex gap-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-700">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            ))}
        </div>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="space-y-6 pb-10">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:rounded-[28px]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl space-y-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-9 w-64" />
                    <SkeletonText lines={2} />
                    <Skeleton className="h-8 w-40 rounded-full" />
                </div>
                <Skeleton className="h-12 w-44 rounded-2xl" />
            </div>
        </div>

        <div>
            <div className="mb-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-6 w-40" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        </div>

        <div>
            <div className="mb-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-6 w-36" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-[24px] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:rounded-[28px]">
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                        <Skeleton className="mt-5 h-5 w-32" />
                        <SkeletonText lines={1} className="mt-2" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const ProfileSkeleton = () => (
    <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:rounded-[28px]">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <Skeleton className="h-28 w-28 shrink-0 rounded-[32px]" />
                <div className="flex-1 space-y-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-36" />
                    <div className="flex gap-3">
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                </div>
            </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:rounded-[28px]">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-48" />
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-[24px] border border-slate-200 bg-[#fbfbfa] p-4 dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-start gap-4">
                            <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const NotificationsSkeleton = () => (
    <div className="space-y-4 pb-10 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-11 w-40 rounded-2xl" />
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:rounded-[28px] sm:p-6">
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-[#fbfbfa] p-4 dark:border-slate-700 dark:bg-slate-800 sm:rounded-[24px]">
                        <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-2/3" />
                            <Skeleton className="h-3 w-1/4" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const InspectionsSkeleton = () => (
    <div className="space-y-4 pb-10 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-11 w-40 rounded-2xl" />
        </div>

        <SkeletonTable rows={8} />
    </div>
);

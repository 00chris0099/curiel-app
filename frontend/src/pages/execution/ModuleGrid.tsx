import { memo, useState, type ReactNode } from 'react';
import { CustomIcon, type CustomIconName } from '../../components/CustomIcon';
import { ModuleSheet } from './ModuleSheet';

type ModuleDefinition = {
    id: string;
    title: string;
    icon: CustomIconName;
    count: number;
};

type ModuleGridProps = {
    modules: ModuleDefinition[];
    children: ReactNode[];
};

export const ModuleGrid = memo(({ modules, children }: ModuleGridProps) => {
    const [activeModule, setActiveModule] = useState<string | null>(null);

    const activeIndex = activeModule ? modules.findIndex((m) => m.id === activeModule) : -1;
    const activeDef = activeIndex >= 0 ? modules[activeIndex] : null;

    return (
        <>
            {/* Grid of icon cards */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3">
                {modules.map((mod) => (
                    <button
                        key={mod.id}
                        type="button"
                        onClick={() => setActiveModule(mod.id)}
                        className="group relative flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 transition-all hover:border-primary-300 hover:shadow-md active:scale-[0.97] dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-600 sm:rounded-3xl sm:p-5"
                    >
                        {/* Badge */}
                        {mod.count > 0 && (
                            <span className="absolute right-2 top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-100 px-1.5 text-[10px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 sm:right-3 sm:top-3 sm:text-xs">
                                {mod.count}
                            </span>
                        )}

                        {/* Icon */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 transition-colors group-hover:bg-primary-50 dark:bg-gray-800 dark:group-hover:bg-primary-900/20 sm:h-14 sm:w-14 sm:rounded-3xl">
                            <CustomIcon name={mod.icon} size="sm" tone="mist" />
                        </div>

                        {/* Title */}
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 sm:text-sm">{mod.title}</span>
                    </button>
                ))}
            </div>

            {/* Sheet for active module */}
            {activeDef && (
                <ModuleSheet
                    isOpen={true}
                    title={activeDef.title}
                    icon={activeDef.icon}
                    onClose={() => setActiveModule(null)}
                >
                    {children[activeIndex]}
                </ModuleSheet>
            )}
        </>
    );
});
ModuleGrid.displayName = 'ModuleGrid';

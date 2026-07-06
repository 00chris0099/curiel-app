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

    const handleToggle = (id: string) => {
        setActiveModule((current) => (current === id ? null : id));
    };

    return (
        <>
            {/* Grid of icon cards — 2 columns */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {modules.map((mod) => {
                    const isActive = activeModule === mod.id;
                    return (
                        <button
                            key={mod.id}
                            type="button"
                            onClick={() => handleToggle(mod.id)}
                            className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all active:scale-[0.97] sm:p-6 ${
                                isActive
                                    ? 'border-primary-500 bg-primary-50 shadow-sm dark:border-primary-400 dark:bg-primary-900/20'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                            }`}
                        >
                            {/* Badge */}
                            {mod.count > 0 && (
                                <span className="absolute right-3 top-3 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-100 px-1.5 text-[10px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 sm:text-xs">
                                    {mod.count}
                                </span>
                            )}

                            {/* Icon */}
                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors sm:h-16 sm:w-16 ${
                                isActive
                                    ? 'bg-primary-100 dark:bg-primary-900/30'
                                    : 'bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-800 dark:group-hover:bg-gray-700'
                            }`}>
                                <CustomIcon name={mod.icon} size="sm" tone={isActive ? 'blue' : 'mist'} />
                            </div>

                            {/* Title */}
                            <span className={`text-sm font-semibold sm:text-base ${isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                {mod.title}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Mobile: full-screen sheet */}
            <div className="lg:hidden">
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
            </div>

            {/* Desktop: accordion inline */}
            <div className="hidden lg:block">
                {activeDef && (
                    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <CustomIcon name={activeDef.icon} size="sm" tone="cream" />
                                <h3 className="font-bold text-gray-900 dark:text-white">{activeDef.title}</h3>
                                {activeDef.count > 0 && (
                                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                                        {activeDef.count}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveModule(null)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                                aria-label="Cerrar modulo"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto p-5">
                            {children[activeIndex]}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
});
ModuleGrid.displayName = 'ModuleGrid';

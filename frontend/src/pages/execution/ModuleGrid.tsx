import { memo, useState } from 'react';
import { CustomIcon, type CustomIconName } from '../../components/CustomIcon';

type ModuleDefinition = {
    id: string;
    title: string;
    icon: CustomIconName;
    count: number;
};

type ModuleGridProps = {
    modules: ModuleDefinition[];
    children: React.ReactNode[];
};

const MODULE_ICONS: Record<string, CustomIconName> = {
    edificio: 'buildings',
    plano: 'ruler',
    areas: 'rooms',
    obs_metrica: 'note-pencil',
    observaciones: 'rooms',
    consideraciones: 'note-pencil',
};

export const ModuleGrid = memo(({ modules, children }: ModuleGridProps) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleModule = (id: string) => {
        setExpandedId((current) => (current === id ? null : id));
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {modules.map((mod) => {
                    const isExpanded = expandedId === mod.id;
                    return (
                        <button
                            key={mod.id}
                            type="button"
                            onClick={() => toggleModule(mod.id)}
                            className={`relative rounded-2xl border p-4 text-left transition-all sm:p-5 ${
                                isExpanded
                                    ? 'border-primary-500 bg-primary-50 shadow-sm dark:border-primary-400 dark:bg-primary-500/10'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                    isExpanded
                                        ? 'bg-primary-100 dark:bg-primary-900/30'
                                        : 'bg-gray-100 dark:bg-gray-800'
                                }`}>
                                    <CustomIcon
                                        name={MODULE_ICONS[mod.id] ?? 'clipboard-check'}
                                        size="sm"
                                        tone={isExpanded ? 'blue' : 'mist'}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-sm font-semibold ${
                                        isExpanded
                                            ? 'text-primary-700 dark:text-primary-300'
                                            : 'text-gray-900 dark:text-white'
                                    }`}>
                                        {mod.title}
                                    </p>
                                    {mod.count > 0 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {mod.count} elemento{mod.count !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {mod.count > 0 && (
                                <span className="absolute right-3 top-3 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-100 px-1.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                    {mod.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {modules.map((mod, index) => (
                expandedId === mod.id && (
                    <div
                        key={mod.id}
                        className="card animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <div className="mb-4 flex items-center gap-3">
                            <CustomIcon name={MODULE_ICONS[mod.id] ?? 'clipboard-check'} size="sm" tone="cream" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{mod.title}</h3>
                        </div>
                        {children[index]}
                    </div>
                )
            ))}
        </div>
    );
});
ModuleGrid.displayName = 'ModuleGrid';

import { memo, useEffect, useCallback } from 'react';
import { CustomIcon, type CustomIconName } from '../../components/CustomIcon';

type ModuleSheetProps = {
    isOpen: boolean;
    title: string;
    icon: CustomIconName;
    onClose: () => void;
    children: React.ReactNode;
};

export const ModuleSheet = memo(({
    isOpen,
    title,
    icon,
    onClose,
    children,
}: ModuleSheetProps) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Sheet — mobile: full-screen slide-up. Desktop: modal centered */}
            <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6 pointer-events-none">
                {/* Mobile: full screen panel */}
                <div className="pointer-events-auto flex h-full w-full flex-col bg-white dark:bg-slate-900 sm:hidden animate-in slide-in-from-bottom duration-300">
                    {/* Sheet header */}
                    <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                        >
                            <CustomIcon name="arrow-left" size="xs" tone="mist" />
                        </button>
                        <CustomIcon name={icon} size="sm" tone="cream" />
                        <h2 className="flex-1 truncate text-base font-bold text-gray-900 dark:text-white">{title}</h2>
                    </div>

                    {/* Sheet body */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {children}
                    </div>
                </div>

                {/* Desktop: centered modal */}
                <div className="pointer-events-auto hidden max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-slate-900 sm:flex animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <CustomIcon name={icon} size="sm" tone="cream" />
                        <h2 className="flex-1 text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
});
ModuleSheet.displayName = 'ModuleSheet';

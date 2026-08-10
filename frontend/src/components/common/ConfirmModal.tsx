import React from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    variant = 'warning',
    isLoading = false,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            iconBg: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
            confirmBtn: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700',
            Icon: Trash2
        },
        warning: {
            iconBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
            confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 dark:bg-amber-600 dark:hover:bg-amber-700',
            Icon: AlertTriangle
        },
        info: {
            iconBg: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',
            confirmBtn: 'bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500 dark:bg-sky-600 dark:hover:bg-sky-700',
            Icon: Info
        }
    };

    const style = variantStyles[variant] || variantStyles.warning;
    const IconComponent = style.Icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={onCancel}
            />

            {/* Modal Dialog Box */}
            <div className="relative w-full max-w-md transform rounded-2xl bg-white dark:bg-slate-900 p-6 text-left shadow-2xl transition-all border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <button
                    onClick={onCancel}
                    type="button"
                    className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex items-start space-x-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBg}`}>
                        <IconComponent className="h-6 w-6" />
                    </div>

                    <div className="mt-0.5 flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {message}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0">
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={onCancel}
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => onConfirm()}
                        className={`w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${style.confirmBtn}`}
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Procesando...</span>
                            </div>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

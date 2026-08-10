import { useState, useCallback } from 'react';
import { ConfirmModal, type ConfirmVariant } from './ConfirmModal';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
}

export function useConfirmDialog() {
    const [state, setState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
        resolve: ((value: boolean) => void) | null;
        isLoading: boolean;
    }>({
        isOpen: false,
        options: { title: '', message: '' },
        resolve: null,
        isLoading: false
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({
                isOpen: true,
                options,
                resolve,
                isLoading: false
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (state.resolve) {
            state.resolve(true);
        }
        setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
    }, [state.resolve]);

    const handleCancel = useCallback(() => {
        if (state.resolve) {
            state.resolve(false);
        }
        setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
    }, [state.resolve]);

    const ConfirmDialogComponent = useCallback(() => {
        return (
            <ConfirmModal
                isOpen={state.isOpen}
                title={state.options.title}
                message={state.options.message}
                confirmText={state.options.confirmText}
                cancelText={state.options.cancelText}
                variant={state.options.variant}
                isLoading={state.isLoading}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        );
    }, [state, handleConfirm, handleCancel]);

    return {
        confirm,
        ConfirmDialog: ConfirmDialogComponent
    };
}

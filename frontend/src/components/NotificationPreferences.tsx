import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from './CustomIcon';
import notificationService from '../services/notification.service';
import type { NotificationPreference } from '../types';

const categoryLabels: Record<string, string> = {
    inspection: 'Inspecciones',
    evaluation: 'Evaluaciones',
    alert: 'Alertas',
    system: 'Sistema'
};

export const NotificationPreferences = () => {
    const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadPreferences = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await notificationService.getPreferences();
            setPreferences(data);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudieron cargar las preferencias'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    const handleToggle = async (field: keyof NotificationPreference, value: boolean) => {
        if (!preferences) return;

        setIsSaving(true);
        try {
            const updated = await notificationService.updatePreferences({ [field]: value });
            setPreferences(updated);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCategoryToggle = async (category: string, enabled: boolean) => {
        if (!preferences) return;

        setIsSaving(true);
        try {
            const updated = await notificationService.updatePreferences({
                categories: { ...preferences.categories, [category]: enabled }
            });
            setPreferences(updated);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="card p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 w-48 rounded bg-slate-200" />
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="h-4 w-40 rounded bg-slate-200" />
                </div>
            </div>
        );
    }

    if (!preferences) return null;

    return (
        <div className="card space-y-6 p-6">
            <div>
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Preferencias de notificacion
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Configura como quieres recibir las notificaciones.
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CustomIcon name="check-circle" size="xs" tone="sage" />
                        <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Email</p>
                            <p className="text-xs text-slate-500">Recibe notificaciones por correo</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleToggle('emailEnabled', !preferences.emailEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            preferences.emailEnabled ? 'bg-[#17324a]' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences.emailEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CustomIcon name="bell" size="xs" tone="cream" />
                        <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">En la app</p>
                            <p className="text-xs text-slate-500">Notificaciones dentro de la aplicacion</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleToggle('inAppEnabled', !preferences.inAppEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            preferences.inAppEnabled ? 'bg-[#17324a]' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences.inAppEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CustomIcon name="settings" size="xs" tone="sage" />
                        <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Push</p>
                            <p className="text-xs text-slate-500">Notificaciones push en el celular</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleToggle('pushEnabled', !preferences.pushEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            preferences.pushEnabled ? 'bg-[#17324a]' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences.pushEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                </div>
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">Categorias</p>
                <div className="space-y-3">
                    {Object.entries(categoryLabels).map(([key, label]) => (
                        <div key={key} className="flex items-center justify-between">
                            <p className="text-sm text-slate-700 dark:text-slate-300">{label}</p>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleCategoryToggle(key, !(preferences.categories?.[key] !== false))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    preferences.categories?.[key] !== false ? 'bg-[#17324a]' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    preferences.categories?.[key] !== false ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

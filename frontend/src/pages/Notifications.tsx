import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { getApiErrorMessage } from '../api/axios';
import { Loader } from '../components/Loader';
import notificationService from '../services/notification.service';
import type { Notification } from '../types';

const safeArray = <T,>(value: T[] | undefined | null) => Array.isArray(value) ? value : [];

export const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await notificationService.getNotifications(1, 50);
            setNotifications(safeArray(response.data));
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudieron cargar las notificaciones'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleMarkAsRead = async (notification: Notification) => {
        try {
            await notificationService.markAsRead(notification.id);
            setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
            if (notification.inspectionId) {
                navigate(`/inspections/${notification.inspectionId}`);
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar la notificación'));
        }
    };

    const handleMarkAll = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
            toast.success('Notificaciones marcadas como leídas');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudieron marcar las notificaciones'));
        }
    };

    if (isLoading) {
        return <Loader fullScreen />;
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Notificaciones</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Revisa asignaciones, cambios de estado y avisos del sistema.</p>
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleMarkAll}>
                    Marcar todo como leído
                </button>
            </div>

            <div className="card space-y-3">
                {notifications.length === 0 ? (
                    <div className="py-10 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="mx-auto mb-3 h-10 w-10 text-primary-500" />
                        No tienes notificaciones todavía.
                    </div>
                ) : notifications.map((notification) => (
                    <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleMarkAsRead(notification)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${notification.readAt ? 'border-gray-200 dark:border-gray-700' : 'border-primary-200 bg-primary-50/60 dark:border-primary-900 dark:bg-primary-900/10'}`}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{notification.title}</p>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{new Date(notification.createdAt).toLocaleString('es-PE')}</p>
                            </div>
                            {!notification.readAt && <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary-500" />}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

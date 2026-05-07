import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
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
            toast.success('Notificaciones marcadas como leidas');
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
                    <p className="section-eyebrow">Centro de avisos</p>
                    <h1 className="mt-2 font-display text-3xl text-slate-900">Notificaciones</h1>
                    <p className="mt-2 text-slate-600">Revisa asignaciones, cambios de estado y avisos del sistema.</p>
                </div>
                <button type="button" className="btn btn-secondary flex items-center gap-3" onClick={handleMarkAll}>
                    <CustomIcon name="check-circle" size="xs" tone="sage" />
                    Marcar todo como leido
                </button>
            </div>

            <div className="card space-y-3">
                {notifications.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                        <div className="mb-4 flex justify-center">
                            <CustomIcon name="bell" size="lg" tone="cream" />
                        </div>
                        No tienes notificaciones todavia.
                    </div>
                ) : notifications.map((notification) => (
                    <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleMarkAsRead(notification)}
                        className={`w-full rounded-[24px] border px-5 py-5 text-left transition-colors hover:bg-white ${notification.readAt ? 'border-slate-200 bg-[#fbfbfa]' : 'border-[#eadfc8] bg-[#f5efe1]/70'}`}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex gap-3">
                                <CustomIcon name={notification.readAt ? 'clipboard-check' : 'bell'} size="sm" tone={notification.readAt ? 'white' : 'cream'} />
                                <div>
                                    <p className="font-semibold text-slate-900">{notification.title}</p>
                                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                                    <p className="mt-2 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString('es-PE')}</p>
                                </div>
                            </div>
                            {!notification.readAt && <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#17324a]" />}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

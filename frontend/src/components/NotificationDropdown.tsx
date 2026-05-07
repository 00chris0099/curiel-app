import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import notificationService from '../services/notification.service';
import type { Notification } from '../types';
import { CustomIcon } from './CustomIcon';

const safeArray = <T,>(value: T[] | undefined | null) => Array.isArray(value) ? value : [];

export const NotificationDropdown = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const [listResponse, count] = await Promise.all([
                notificationService.getNotifications(1, 5),
                notificationService.getUnreadCount(),
            ]);

            setNotifications(safeArray(listResponse.data));
            setUnreadCount(count);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudieron cargar las notificaciones'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
        const intervalId = window.setInterval(loadNotifications, 30000);
        return () => window.clearInterval(intervalId);
    }, [loadNotifications]);

    const latestNotifications = useMemo(() => safeArray(notifications), [notifications]);

    const handleToggle = async () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        if (nextOpen) {
            await loadNotifications();
        }
    };

    const handleMarkAsRead = async (notification: Notification) => {
        try {
            await notificationService.markAsRead(notification.id);
            setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
            setUnreadCount((current) => Math.max(0, current - (notification.readAt ? 0 : 1)));
            if (notification.inspectionId) {
                navigate(`/inspections/${notification.inspectionId}`);
                setIsOpen(false);
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar la notificación'));
        }
    };

    const handleMarkAll = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
            setUnreadCount(0);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudieron marcar las notificaciones'));
        }
    };

    return (
        <div className="relative">
            <button
                className="relative rounded-2xl border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50"
                aria-label="Notificaciones"
                onClick={handleToggle}
            >
                <CustomIcon name="bell" size="xs" tone="cream" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-[#17324a] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 z-20 mt-3 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(23,50,74,0.16)]">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <CustomIcon name="bell" size="sm" tone="cream" />
                                <div>
                                    <h3 className="font-semibold text-slate-900">Notificaciones</h3>
                                    <p className="text-xs text-slate-500">{unreadCount} sin leer</p>
                                </div>
                            </div>
                            <button type="button" onClick={handleMarkAll} className="text-sm font-semibold text-primary-700 hover:text-primary-800">
                                Marcar todo
                            </button>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto bg-[#fbfbfa]">
                            {isLoading ? (
                                <div className="px-5 py-6 text-sm text-slate-500">Cargando notificaciones...</div>
                            ) : latestNotifications.length === 0 ? (
                                <div className="px-5 py-8 text-center text-sm text-slate-500">
                                    <div className="mb-3 flex justify-center">
                                        <CustomIcon name="bell" size="md" tone="mist" />
                                    </div>
                                    No tienes notificaciones todavía.
                                </div>
                            ) : latestNotifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => handleMarkAsRead(notification)}
                                    className={`w-full border-b border-slate-200 px-5 py-4 text-left transition-colors hover:bg-white ${notification.readAt ? 'bg-transparent' : 'bg-[#f5efe1]/70'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <CustomIcon name={notification.readAt ? 'clipboard-check' : 'bell'} size="sm" tone={notification.readAt ? 'white' : 'cream'} />
                                            <div>
                                                <p className="font-semibold text-slate-900">{notification.title}</p>
                                                <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                                                <p className="mt-2 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString('es-PE')}</p>
                                            </div>
                                        </div>
                                        {!notification.readAt && <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#17324a]" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-slate-200 px-5 py-4">
                            <button
                                type="button"
                                onClick={() => {
                                    navigate('/notifications');
                                    setIsOpen(false);
                                }}
                                className="flex items-center gap-3 text-sm font-semibold text-primary-700 hover:text-primary-800"
                            >
                                <CustomIcon name="check-circle" size="xs" tone="sage" />
                                Ver todas
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

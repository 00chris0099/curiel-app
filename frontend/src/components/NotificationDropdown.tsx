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
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar la notificacion'));
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
                className="relative rounded-2xl border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                aria-label="Notificaciones"
                onClick={handleToggle}
            >
                <CustomIcon name="bell" size="xs" tone="cream" variant="plain" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-[#17324a] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-none" onClick={() => setIsOpen(false)} />

                    {/* Mobile: bottom sheet. Desktop: dropdown */}
                    <div className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] flex flex-col rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.15)] sm:static sm:inset-auto sm:bottom-auto sm:z-20 sm:mt-3 sm:max-h-none sm:w-[min(380px,calc(100vw-2rem))] sm:overflow-hidden sm:rounded-[28px] sm:border sm:border-slate-200 sm:shadow-[0_24px_60px_rgba(23,50,74,0.16)] dark:bg-slate-900 sm:dark:border-slate-700">
                        {/* Mobile drag handle */}
                        <div className="flex justify-center pt-3 sm:hidden">
                            <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </div>

                        <div className="flex items-center justify-between px-5 py-3 sm:border-b sm:border-slate-200 sm:py-4 dark:sm:border-slate-700">
                            <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notificaciones</h3>
                                {unreadCount > 0 && (
                                    <span className="rounded-full bg-[#17324a] px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-primary-600">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button type="button" onClick={handleMarkAll} className="text-xs font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">
                                        Marcar todo
                                    </button>
                                )}
                                <button type="button" onClick={() => setIsOpen(false)} className="min-w-8 flex items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:hidden dark:hover:bg-slate-800">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto sm:max-h-[380px]">
                            {isLoading ? (
                                <div className="space-y-0 px-3 py-2 sm:px-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="flex items-start gap-3 rounded-2xl px-3 py-4">
                                            <div className="h-10 w-10 shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-2/3 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                                                <div className="h-3 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                                                <div className="h-3 w-1/3 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : latestNotifications.length === 0 ? (
                                <div className="px-5 py-10 text-center sm:py-8">
                                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                        <CustomIcon name="bell" size="sm" tone="mist" variant="plain" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin notificaciones</p>
                                </div>
                            ) : latestNotifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => handleMarkAsRead(notification)}
                                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 sm:mx-2 sm:my-0.5 sm:w-[calc(100%-16px)] sm:rounded-2xl dark:hover:bg-slate-800 ${notification.readAt ? '' : 'bg-[#f5efe1]/50 dark:bg-amber-900/15'}`}
                                >
                                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${notification.readAt ? 'bg-slate-100 dark:bg-slate-800' : 'bg-[#17324a]'}`}>
                                        <CustomIcon name={notification.readAt ? 'clipboard-check' : 'bell'} size="xs" tone={notification.readAt ? 'mist' : 'cream'} variant="plain" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm ${notification.readAt ? 'font-medium text-slate-600 dark:text-slate-400' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>{notification.title}</p>
                                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-500">{notification.message}</p>
                                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-600">{new Date(notification.createdAt).toLocaleString('es-PE')}</p>
                                    </div>
                                    {!notification.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#17324a] dark:bg-primary-500" />}
                                </button>
                            ))}
                        </div>

                        <div className="hidden border-t border-slate-200 px-5 py-3 sm:block dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => {
                                    navigate('/notifications');
                                    setIsOpen(false);
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-primary-700 transition-colors hover:bg-slate-50 dark:text-primary-400 dark:hover:bg-slate-800"
                            >
                                Ver todas las notificaciones
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

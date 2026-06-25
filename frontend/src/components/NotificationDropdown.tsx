import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import notificationService from '../services/notification.service';
import type { Notification } from '../types';
import { CustomIcon } from './CustomIcon';
import { safeArray } from '../utils/offlineDb';

export const NotificationDropdown = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const loadNotifications = useCallback(async () => {
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

        const startPolling = () => {
            return window.setInterval(loadNotifications, 30000);
        };

        let intervalId = startPolling();

        const handleVisibility = () => {
            if (document.hidden) {
                window.clearInterval(intervalId);
            } else {
                loadNotifications();
                intervalId = startPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [loadNotifications]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const latestNotifications = useMemo(() => safeArray(notifications), [notifications]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOpen) {
            setIsOpen(false);
        } else {
            setIsOpen(true);
            setIsLoading(true);
            loadNotifications();
        }
    };

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsOpen(false);
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
                ref={buttonRef}
                className="relative rounded-2xl border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                aria-label="Notificaciones"
                aria-expanded={isOpen}
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
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-label="Panel de notificaciones"
                    className="
                        fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] flex flex-col rounded-t-[28px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.15)]
                        sm:absolute sm:right-0 sm:top-auto sm:z-[70] sm:mt-3 sm:w-[380px] sm:max-h-[480px] sm:rounded-[28px] sm:border sm:border-slate-200 sm:shadow-[0_24px_60px_rgba(23,50,74,0.16)]
                        dark:bg-slate-900 dark:sm:border-slate-700
                    "
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Mobile drag handle */}
                    <div className="flex justify-center pt-3 sm:hidden">
                        <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
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
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                                aria-label="Cerrar notificaciones"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="space-y-1 px-3 py-2 sm:px-2">
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
                            <div className="px-5 py-12 text-center">
                                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                    <CustomIcon name="bell" size="sm" tone="mist" variant="plain" />
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin notificaciones</p>
                            </div>
                        ) : (
                            <div className="py-1">
                                {latestNotifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() => handleMarkAsRead(notification)}
                                        className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 sm:mx-2 sm:my-0.5 sm:w-[calc(100%-16px)] sm:rounded-2xl dark:hover:bg-slate-800 ${notification.readAt ? '' : 'bg-[#f5efe1]/50 dark:bg-amber-900/15'}`}
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
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-700">
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
            )}
        </div>
    );
};

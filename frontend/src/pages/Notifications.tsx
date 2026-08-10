import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon, type CustomIconName } from '../components/CustomIcon';
import { NotificationPreferences } from '../components/NotificationPreferences';
import { NotificationsSkeleton } from '../components/Skeleton';
import notificationService from '../services/notification.service';
import type { Notification } from '../types';
import { safeArray } from '../utils/offlineDb';

type FilterTab = 'all' | 'inspection' | 'client' | 'unread';

const getNotificationIconName = (notification: Notification): CustomIconName => {
    const type = notification.type || '';
    const category = notification.category || '';

    if (category === 'client' || type.startsWith('client_')) {
        return 'users';
    }
    if (type === 'inspection_assigned') return 'user-gear';
    if (type === 'inspection_started') return 'play';
    if (type === 'inspection_rescheduled') return 'calendar';
    if (type === 'inspection_cancelled') return 'x-circle';
    if (type === 'inspection_approved') return 'seal-check';
    if (type === 'inspection_ready_for_review') return 'clipboard-check';
    if (category === 'inspection') return 'clipboard-check';
    if (category === 'system' || category === 'evaluation') return 'warning-circle';

    return notification.readAt ? 'check-circle' : 'bell';
};

export const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');

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
            } else if (notification.category === 'client' || notification.type?.startsWith('client_')) {
                navigate('/clients');
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar la notificación'));
        }
    };

    const handleMarkAll = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
            toast.success('Todas las notificaciones marcadas como leídas');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudieron marcar las notificaciones'));
        }
    };

    const filteredNotifications = useMemo(() => {
        return notifications.filter((n) => {
            if (activeTab === 'unread') return !n.readAt;
            if (activeTab === 'inspection') return n.category === 'inspection' || n.type?.startsWith('inspection_') || Boolean(n.inspectionId);
            if (activeTab === 'client') return n.category === 'client' || n.type?.startsWith('client_');
            return true;
        });
    }, [notifications, activeTab]);

    const unreadCount = useMemo(() => notifications.filter(n => !n.readAt).length, [notifications]);

    if (isLoading) {
        return <NotificationsSkeleton />;
    }

    return (
        <div className="space-y-4 sm:space-y-6 pb-10 animate-in fade-in duration-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="section-eyebrow">Centro de avisos</p>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Notificaciones</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Revisa asignaciones de inspecciones, actualizaciones de clientes y avisos del sistema.</p>
                </div>
                <button type="button" className="btn btn-secondary flex items-center gap-2 self-start text-xs font-medium" onClick={handleMarkAll}>
                    <CustomIcon name="check-circle" size="xs" tone="sage" />
                    Marcar todo como leído
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-gray-800">
                {[
                    { key: 'all', label: 'Todas', count: notifications.length },
                    { key: 'unread', label: 'Sin Leer', count: unreadCount },
                    { key: 'inspection', label: 'Inspecciones', count: notifications.filter(n => n.category === 'inspection' || n.type?.startsWith('inspection_') || Boolean(n.inspectionId)).length },
                    { key: 'client', label: 'Clientes', count: notifications.filter(n => n.category === 'client' || n.type?.startsWith('client_')).length },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key as FilterTab)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            activeTab === tab.key
                                ? 'bg-[#17324a] text-white font-bold dark:bg-blue-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                    >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="card space-y-3 overflow-hidden p-4">
                {filteredNotifications.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="mb-4 flex justify-center">
                            <CustomIcon name="bell" size="lg" tone="mist" />
                        </div>
                        No tienes notificaciones en esta categoría.
                    </div>
                ) : filteredNotifications.map((notification) => {
                    const iconName = getNotificationIconName(notification);
                    const isUnread = !notification.readAt;

                    return (
                        <button
                            key={notification.id}
                            type="button"
                            onClick={() => handleMarkAsRead(notification)}
                            className={`w-full rounded-xl border p-4 text-left transition-all hover:shadow-sm sm:px-5 sm:py-4 ${
                                isUnread
                                    ? 'border-[#17324a]/20 bg-[#17324a]/5 dark:border-blue-500/30 dark:bg-blue-900/15'
                                    : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900/50'
                            }`}
                        >
                            <div className="flex items-start gap-3.5">
                                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                    isUnread ? 'bg-[#17324a] text-white shadow-sm' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                                }`}>
                                    <CustomIcon name={iconName} size="xs" tone={isUnread ? 'white' : 'mist'} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={`text-sm ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                                            {notification.title}
                                        </p>
                                        {notification.priority === 'high' && (
                                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                                                Alta
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{notification.message}</p>
                                    <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                                        {new Date(notification.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                                {isUnread && (
                                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#17324a] dark:bg-blue-500" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <NotificationPreferences />
        </div>
    );
};

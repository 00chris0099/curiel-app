import apiClient from '../api/axios';
import type { ApiResponse, Notification, PaginatedResponse } from '../types';

const notificationService = {
    async getNotifications(page = 1, limit = 20): Promise<PaginatedResponse<Notification>> {
        const response = await apiClient.get<PaginatedResponse<Notification>>('/notifications', {
            params: { page, limit }
        });

        return response.data;
    },

    async getUnreadCount(): Promise<number> {
        const response = await apiClient.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
        return response.data.data?.unreadCount || 0;
    },

    async markAsRead(id: string): Promise<Notification> {
        const response = await apiClient.put<ApiResponse<Notification>>(`/notifications/${id}/read`);
        if (!response.data.data) {
            throw new Error('No se pudo marcar la notificación como leída');
        }

        return response.data.data;
    },

    async markAllAsRead(): Promise<void> {
        await apiClient.put('/notifications/read-all');
    }
};

export default notificationService;

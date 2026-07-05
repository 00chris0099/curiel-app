import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/api';
import { COLORS } from '../utils/colors';

const NotificationItem = ({ notification, onPress }) => {
    const isUnread = !notification.readAt;
    const icon = isUnread ? 'notifications' : 'notifications-outline';
    const iconColor = isUnread ? COLORS.primary : COLORS.textMuted;

    return (
        <TouchableOpacity
            style={[styles.notificationItem, isUnread && styles.unreadItem]}
            onPress={() => onPress(notification)}
        >
            <View style={[styles.iconContainer, isUnread && styles.unreadIcon]}>
                <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <View style={styles.content}>
                <Text style={[styles.title, isUnread && styles.unreadTitle]}>
                    {notification.title}
                </Text>
                <Text style={styles.message} numberOfLines={2}>
                    {notification.message}
                </Text>
                <Text style={styles.time}>
                    {new Date(notification.createdAt).toLocaleString('es-PE')}
                </Text>
            </View>
            {isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );
};

export default function NotificationsScreen({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadData = useCallback(async () => {
        try {
            const [notificationsRes, count] = await Promise.all([
                notificationService.getAll(1, 50),
                notificationService.getUnreadCount()
            ]);

            setNotifications(notificationsRes.data || []);
            setUnreadCount(count);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadData();
    };

    const handlePress = async (notification) => {
        try {
            if (!notification.readAt) {
                await notificationService.markAsRead(notification.id);
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notification.id
                            ? { ...n, readAt: new Date().toISOString() }
                            : n
                    )
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }

            if (notification.inspectionId) {
                navigation.navigate('InspectionDetail', { id: notification.inspectionId });
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAll = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notificaciones</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAll}>
                        <Text style={styles.markAllText}>Marcar todo como leido</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <NotificationItem notification={item} onPress={handlePress} />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.primary}
                    />
                }
                contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyView}>
                        <Ionicons name="notifications-outline" size={48} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No tienes notificaciones</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text
    },
    markAllText: {
        fontSize: 14,
        color: COLORS.primary
    },
    list: {
        paddingVertical: 8
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    unreadItem: {
        backgroundColor: COLORS.primaryLight
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    unreadIcon: {
        backgroundColor: COLORS.primaryLight
    },
    content: {
        flex: 1
    },
    title: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginBottom: 2
    },
    unreadTitle: {
        fontWeight: '600',
        color: COLORS.text
    },
    message: {
        fontSize: 13,
        color: COLORS.textMuted,
        lineHeight: 18
    },
    time: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 4
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginLeft: 8,
        marginTop: 4
    },
    emptyContainer: {
        flex: 1
    },
    emptyView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textMuted,
        marginTop: 12
    }
});

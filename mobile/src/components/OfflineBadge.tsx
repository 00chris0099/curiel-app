import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';

export const OfflineBadge = () => {
    const { isOnline, isSyncing, pendingCount } = useOffline();
    const { theme } = useTheme();

    if (isSyncing) {
        return (
            <View style={[styles.badge, styles.syncing]}>
                <Text style={[styles.text, { color: theme.colors.textOnPrimary }]}>Sincronizando...</Text>
            </View>
        );
    }

    if (!isOnline) {
        return (
            <View style={styles.container}>
                <View style={[styles.badge, styles.offline]}>
                    <Text style={[styles.text, { color: theme.colors.textOnPrimary }]}>Offline</Text>
                </View>
                {pendingCount > 0 && (
                    <View style={styles.pendingBadge}>
                        <Text style={[styles.pendingText, { color: theme.colors.textOnPrimary }]}>{pendingCount}</Text>
                    </View>
                )}
            </View>
        );
    }

    return (
        <View style={[styles.badge, styles.online]}>
            <Text style={[styles.text, { color: theme.colors.textOnPrimary }]}>Online</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    online: {
        backgroundColor: '#4caf50'
    },
    offline: {
        backgroundColor: '#f44336'
    },
    syncing: {
        backgroundColor: '#2196f3'
    },
    text: {
        fontSize: 11,
        fontWeight: '600'
    },
    pendingBadge: {
        backgroundColor: '#ff9800',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6
    },
    pendingText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold'
    }
});

export default OfflineBadge;

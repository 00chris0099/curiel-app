import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';

export const SyncButton = ({ style }) => {
    const { isOnline, isSyncing, pendingCount, syncNow } = useOffline();
    const { theme } = useTheme();

    if (!isOnline || pendingCount === 0) return null;

    return (
        <TouchableOpacity
            style={[styles.button, style, { backgroundColor: (!isOnline || isSyncing) ? '#9e9e9e' : theme.colors.info }, (!isOnline || isSyncing) && styles.disabled]}
            onPress={syncNow}
            disabled={!isOnline || isSyncing}
        >
            {isSyncing ? (
                <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
            ) : (
                <Text style={[styles.text, { color: theme.colors.textOnPrimary }]}>Sincronizar ({pendingCount})</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    disabled: {
        backgroundColor: '#9e9e9e'
    },
    text: {
        fontSize: 14,
        fontWeight: '600'
    }
});

export default SyncButton;

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useOffline } from '../context/OfflineContext';

export const SyncButton = ({ style }) => {
    const { isOnline, isSyncing, pendingCount, syncNow } = useOffline();

    if (!isOnline || pendingCount === 0) return null;

    return (
        <TouchableOpacity
            style={[styles.button, style, (!isOnline || isSyncing) && styles.disabled]}
            onPress={syncNow}
            disabled={!isOnline || isSyncing}
        >
            {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Text style={styles.text}>Sincronizar ({pendingCount})</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#2196f3',
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
        color: '#fff',
        fontSize: 14,
        fontWeight: '600'
    }
});

export default SyncButton;

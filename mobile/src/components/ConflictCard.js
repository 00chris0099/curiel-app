import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const ConflictCard = ({ conflict, onResolve }) => {
    const local = conflict.localData;
    const server = conflict.serverData;

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>Conflicto detectado</Text>
                <Text style={styles.entity}>{conflict.entity} #{conflict.entityId.slice(0, 8)}</Text>
            </View>

            <View style={styles.compareRow}>
                <View style={styles.column}>
                    <Text style={styles.columnTitle}>Local</Text>
                    <Text style={styles.data} numberOfLines={3}>
                        {local?.status || local?.name || JSON.stringify(local).slice(0, 100)}
                    </Text>
                </View>
                <View style={styles.column}>
                    <Text style={styles.columnTitle}>Servidor</Text>
                    <Text style={styles.data} numberOfLines={3}>
                        {server?.status || server?.name || JSON.stringify(server).slice(0, 100)}
                    </Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, styles.localBtn]}
                    onPress={() => onResolve(conflict.id, 'local')}
                >
                    <Text style={styles.buttonText}>Usar Local</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.serverBtn]}
                    onPress={() => onResolve(conflict.id, 'server')}
                >
                    <Text style={styles.buttonText}>Usar Servidor</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff3e0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ff9800'
    },
    header: {
        marginBottom: 12
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#e65100'
    },
    entity: {
        fontSize: 12,
        color: '#999',
        marginTop: 2
    },
    compareRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12
    },
    column: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10
    },
    columnTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#666',
        marginBottom: 4,
        textTransform: 'uppercase'
    },
    data: {
        fontSize: 13,
        color: '#333'
    },
    actions: {
        flexDirection: 'row',
        gap: 8
    },
    button: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center'
    },
    localBtn: {
        backgroundColor: '#2196f3'
    },
    serverBtn: {
        backgroundColor: '#4caf50'
    },
    buttonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600'
    }
});

export default ConflictCard;

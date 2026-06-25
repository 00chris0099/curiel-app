import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const ConflictCard = ({ conflict, onResolve }) => {
    const { theme } = useTheme();
    const local = conflict.localData;
    const server = conflict.serverData;

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.warningBg, borderColor: theme.colors.warning }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.warning }]}>Conflicto detectado</Text>
                <Text style={styles.entity}>{conflict.entity} #{conflict.entityId.slice(0, 8)}</Text>
            </View>

            <View style={styles.compareRow}>
                <View style={[styles.column, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.columnTitle, { color: theme.colors.textSecondary }]}>Local</Text>
                    <Text style={[styles.data, { color: theme.colors.text }]} numberOfLines={3}>
                        {local?.status || local?.name || JSON.stringify(local).slice(0, 100)}
                    </Text>
                </View>
                <View style={[styles.column, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.columnTitle, { color: theme.colors.textSecondary }]}>Servidor</Text>
                    <Text style={[styles.data, { color: theme.colors.text }]} numberOfLines={3}>
                        {server?.status || server?.name || JSON.stringify(server).slice(0, 100)}
                    </Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.info }]}
                    onPress={() => onResolve(conflict.id, 'local')}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>Usar Local</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.colors.success }]}
                    onPress={() => onResolve(conflict.id, 'server')}
                >
                    <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>Usar Servidor</Text>
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

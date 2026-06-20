import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useOffline } from '../context/OfflineContext';
import { syncQueueRepo } from '../database/syncQueue.repo';
import { SyncButton } from '../components/SyncButton';
import { OfflineBadge } from '../components/OfflineBadge';

const OfflineStatusScreen = () => {
    const { isOnline, isSyncing, pendingCount, lastSyncAt, conflictCount } = useOffline();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadQueue();
    }, [pendingCount]);

    const loadQueue = async () => {
        try {
            const pending = await syncQueueRepo.getPending();
            setQueue(pending);
        } catch (error) {
            console.error('Error loading queue:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return '⏳';
            case 'processing': return '🔄';
            case 'failed': return '❌';
            case 'completed': return '✅';
            default: return '❓';
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Conexion:</Text>
                    <OfflineBadge />
                </View>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Items pendientes:</Text>
                    <Text style={[styles.statusValue, pendingCount > 0 && styles.warning]}>{pendingCount}</Text>
                </View>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Conflictos:</Text>
                    <Text style={[styles.statusValue, conflictCount > 0 && styles.danger]}>{conflictCount}</Text>
                </View>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Ultima sincronizacion:</Text>
                    <Text style={styles.statusValue}>
                        {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString('es-PE') : 'Nunca'}
                    </Text>
                </View>
            </View>

            <View style={styles.syncSection}>
                <SyncButton style={styles.syncBtn} />
            </View>

            <View style={styles.queueHeader}>
                <Text style={styles.queueTitle}>Cola de Sincronizacion</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1a237e" style={{ marginTop: 20 }} />
            ) : queue.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No hay operaciones pendientes</Text>
                </View>
            ) : (
                <FlatList
                    data={queue}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={10}
                    renderItem={({ item }) => (
                        <View style={styles.queueItem}>
                            <Text style={styles.queueIcon}>{getStatusIcon(item.status)}</Text>
                            <View style={styles.queueInfo}>
                                <Text style={styles.queueEntity}>{item.entity}</Text>
                                <Text style={styles.queueOp}>{item.operation} - {item.entity_id?.slice(0, 8)}</Text>
                            </View>
                            <Text style={styles.queueAttempts}>{item.attempts}/{item.max_attempts}</Text>
                        </View>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    statusCard: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, elevation: 2 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    statusLabel: { fontSize: 14, color: '#666' },
    statusValue: { fontSize: 14, fontWeight: '600', color: '#333' },
    warning: { color: '#ff9800' },
    danger: { color: '#f44336' },
    syncSection: { paddingHorizontal: 16, marginBottom: 16 },
    syncBtn: { width: '100%' },
    queueHeader: { paddingHorizontal: 16, marginBottom: 8 },
    queueTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
    list: { padding: 16, paddingTop: 0 },
    queueItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
    queueIcon: { fontSize: 20, marginRight: 12 },
    queueInfo: { flex: 1 },
    queueEntity: { fontSize: 14, fontWeight: '600', color: '#333' },
    queueOp: { fontSize: 12, color: '#666', marginTop: 2 },
    queueAttempts: { fontSize: 12, color: '#999' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: '#999' }
});

export default OfflineStatusScreen;

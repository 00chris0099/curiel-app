import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { conflictsRepo } from '../database/conflicts.repo';
import { inspectionsRepo } from '../database/inspections.repo';
import { ConflictCard } from '../components/ConflictCard';
import { useTheme } from '../context/ThemeContext';
import { createStyles } from '../utils/sharedStyles';

const ConflictResolutionScreen = () => {
    const { theme } = useTheme();
    const styles = createStyles(theme);
    const [conflicts, setConflicts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConflicts();
    }, []);

    const loadConflicts = async () => {
        try {
            const data = await conflictsRepo.getPending();
            setConflicts(data);
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar los conflictos');
        } finally {
            setLoading(false);
        }
    };

    const resolveConflict = async (conflictId, resolution) => {
        try {
            const conflict = await conflictsRepo.getById(conflictId);
            if (!conflict) return;

            if (resolution === 'local') {
                if (conflict.entity === 'inspection' && conflict.localData) {
                    await inspectionsRepo.upsert({
                        ...conflict.localData,
                        is_dirty: 1,
                        local_updated_at: new Date().toISOString()
                    });
                }
            } else if (resolution === 'server') {
                if (conflict.entity === 'inspection' && conflict.serverData) {
                    await inspectionsRepo.upsert({
                        ...conflict.serverData,
                        is_dirty: 0,
                        last_synced_at: new Date().toISOString()
                    });
                }
            }

            await conflictsRepo.resolve(conflictId, resolution);
            setConflicts((prev) => prev.filter((c) => c.id !== conflictId));

            Alert.alert('Resuelto', `Conflicto resuelto: usando datos ${resolution === 'local' ? 'locales' : 'del servidor'}`);
        } catch (error) {
            Alert.alert('Error', 'No se pudo resolver el conflicto');
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.warning }]}>
                <Text style={[styles.title, { color: theme.colors.textOnPrimary }]}>Conflictos Pendientes</Text>
                <Text style={[styles.count, { color: theme.colors.textOnPrimary }]}>{conflicts.length} conflicto(s)</Text>
            </View>

            {conflicts.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No hay conflictos pendientes</Text>
                </View>
            ) : (
                <FlatList
                    data={conflicts}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    initialNumToRender={5}
                    renderItem={({ item }) => (
                        <ConflictCard conflict={item} onResolve={resolveConflict} />
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#ff9800', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '700', color: '#fff' },
    count: { fontSize: 14, color: '#fff', opacity: 0.9 },
    list: { padding: 16 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: '#999' }
});

export default ConflictResolutionScreen;

import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';
import { getStatusThemeColor, getSeverityColor } from '../utils/colors';
import { inspectionsRepo } from '../database/inspections.repo';
import { areasRepo } from '../database/areas.repo';
import { observationsRepo } from '../database/observations.repo';
import { photosRepo } from '../database/photos.repo';
import { inspectionService } from '../services/api';
import { SyncButton } from '../components/SyncButton';

const InspectionDetailScreen = ({ route, navigation }) => {
    const { inspectionId } = route.params;
    const { isOnline } = useOffline();
    const { theme, isDark } = useTheme();
    const [inspection, setInspection] = useState(null);
    const [areas, setAreas] = useState([]);
    const [observations, setObservations] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInspection();
    }, [inspectionId]);

    const loadInspection = async () => {
        try {
            let local = await inspectionsRepo.getById(inspectionId);

            if (isOnline) {
                try {
                    const result = await inspectionService.getById(inspectionId);
                    if (result.success) {
                        local = result.data.inspection;
                        await inspectionsRepo.upsert({
                            ...local,
                            is_dirty: 0,
                            last_synced_at: new Date().toISOString()
                        });
                    }
                } catch {
                    // Use local cache
                }
            }

            setInspection(local);

            const localAreas = await areasRepo.getByInspection(inspectionId);
            setAreas(localAreas);

            const localObs = await observationsRepo.getByInspection(inspectionId);
            setObservations(localObs);

            const localPhotos = await photosRepo.getByInspection(inspectionId);
            setPhotos(localPhotos);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar la inspeccion');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!inspection) {
        return (
            <View style={styles.center}>
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Inspeccion no encontrada</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.projectName}>{inspection.projectName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusThemeColor(inspection.status, isDark) }]}>
                    <Text style={styles.statusText}>{inspection.status?.replace('_', ' ')}</Text>
                </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
                <InfoRow label="Cliente" value={inspection.clientName} theme={theme} />
                <InfoRow label="Direccion" value={inspection.address} theme={theme} />
                <InfoRow label="Tipo" value={inspection.inspectionType} theme={theme} />
                <InfoRow label="Fecha" value={inspection.scheduledDate ? new Date(inspection.scheduledDate).toLocaleDateString('es-PE') : '-'} theme={theme} />
                <InfoRow label="Inspector" value={inspection.inspector ? `${inspection.inspector.firstName} ${inspection.inspector.lastName}` : '-'} theme={theme} />
                {inspection.is_dirty && (
                    <View style={[styles.dirtyBadge, { backgroundColor: isDark ? '#3e2723' : '#fff3e0' }]}>
                        <Text style={[styles.dirtyText, { color: isDark ? '#ffab91' : '#e65100' }]}>Cambios sin sincronizar</Text>
                    </View>
                )}
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Areas ({areas.length})</Text>
                {areas.length === 0 ? (
                    <Text style={[styles.emptySection, { color: theme.colors.textMuted }]}>Sin areas registradas</Text>
                ) : (
                    areas.map((area) => (
                        <View key={area.id} style={[styles.listItem, { borderBottomColor: theme.colors.divider }]}>
                            <Text style={[styles.listItemTitle, { color: theme.colors.text }]}>{area.name}</Text>
                            <Text style={[styles.listItemSub, { color: theme.colors.textSecondary }]}>{area.category} - {area.calculatedAreaM2 ? `${area.calculatedAreaM2} m2` : 'Sin dimensiones'}</Text>
                        </View>
                    ))
                )}
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Observaciones ({observations.length})</Text>
                {observations.length === 0 ? (
                    <Text style={[styles.emptySection, { color: theme.colors.textMuted }]}>Sin observaciones</Text>
                ) : (
                    observations.map((obs) => (
                        <View key={obs.id} style={[styles.listItem, { borderBottomColor: theme.colors.divider }]}>
                            <Text style={[styles.listItemTitle, { color: theme.colors.text }]}>{obs.title}</Text>
                            <Text style={[styles.listItemSub, { color: theme.colors.textSecondary }]}>{obs.severity} - {obs.type}</Text>
                        </View>
                    ))
                )}
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Fotos ({photos.length})</Text>
                {photos.length === 0 ? (
                    <Text style={[styles.emptySection, { color: theme.colors.textMuted }]}>Sin fotos</Text>
                ) : (
                    <Text style={[styles.emptySection, { color: theme.colors.textMuted }]}>{photos.filter(p => p.uploadStatus === 'uploaded').length} subidas, {photos.filter(p => p.uploadStatus === 'pending').length} pendientes</Text>
                )}
            </View>

            <View style={styles.actions}>
                <SyncButton style={styles.syncBtn} />
                {(inspection.status === 'pendiente' || inspection.status === 'en_proceso' || inspection.status === 'reprogramada') && (
                    <TouchableOpacity
                        style={[styles.executeBtn, { backgroundColor: isDark ? '#66bb6a' : '#4caf50' }]}
                        onPress={() => navigation.navigate('Execution', { inspectionId })}
                    >
                        <Text style={styles.executeBtnText}>Ejecutar Inspeccion</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const InfoRow = ({ label, value, theme }) => (
    <View style={[styles.infoRow, { borderBottomColor: theme.colors.divider }]}>
        <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#1a237e', padding: 20, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center'
    },
    projectName: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    infoCard: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, elevation: 2 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    infoLabel: { fontSize: 14, color: '#666' },
    infoValue: { fontSize: 14, color: '#333', fontWeight: '500', flex: 1, textAlign: 'right' },
    dirtyBadge: { backgroundColor: '#fff3e0', borderRadius: 8, padding: 8, marginTop: 8 },
    dirtyText: { color: '#e65100', fontSize: 12, textAlign: 'center' },
    section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, elevation: 2 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
    emptySection: { fontSize: 14, color: '#999', fontStyle: 'italic' },
    listItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    listItemTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
    listItemSub: { fontSize: 12, color: '#666', marginTop: 2 },
    actions: { padding: 16, gap: 12 },
    syncBtn: { width: '100%' },
    executeBtn: { backgroundColor: '#4caf50', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    executeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    emptyText: { fontSize: 16, color: '#999' }
});

export default InspectionDetailScreen;

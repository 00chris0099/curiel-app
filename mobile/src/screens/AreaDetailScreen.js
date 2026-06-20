import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
    ActivityIndicator, Alert
} from 'react-native';
import { areasRepo } from '../database/areas.repo';
import { observationsRepo } from '../database/observations.repo';
import { offlineQueue } from '../services/offlineQueue';
import { useOffline } from '../context/OfflineContext';
import { useAuth } from '../context/AuthContext';

const AreaDetailScreen = ({ route, navigation }) => {
    const { areaId, inspectionId, areaName } = route.params;
    const { isOnline } = useOffline();
    const { user } = useAuth();
    const [area, setArea] = useState(null);
    const [observations, setObservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddObs, setShowAddObs] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newSeverity, setNewSeverity] = useState('leve');
    const [newType, setNewType] = useState('otro');

    useEffect(() => {
        loadData();
    }, [areaId]);

    const loadData = async () => {
        try {
            const areaData = await areasRepo.getById(areaId);
            setArea(areaData);
            const obs = await observationsRepo.getByArea(areaId);
            setObservations(obs);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar el area');
        } finally {
            setLoading(false);
        }
    };

    const addObservation = async () => {
        if (!newTitle.trim()) {
            Alert.alert('Error', 'El titulo es requerido');
            return;
        }

        const obsData = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            inspectionId,
            areaId,
            title: newTitle.trim(),
            description: newDesc.trim(),
            severity: newSeverity,
            type: newType,
            status: 'pendiente',
            createdBy: user?.id
        };

        await observationsRepo.upsert({ ...obsData, is_dirty: 1 });
        await offlineQueue.saveObservation(inspectionId, obsData, isOnline);
        setObservations([...observations, obsData]);
        setNewTitle('');
        setNewDesc('');
        setShowAddObs(false);
    };

    const getSeverityColor = (severity) => {
        const colors = { leve: '#4caf50', media: '#ff9800', alta: '#f44336', critica: '#b71c1c' };
        return colors[severity] || '#999';
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1a237e" /></View>;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.areaName}>{area?.name || areaName}</Text>
                <Text style={styles.areaCategory}>{area?.category || 'Sin categoria'}</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Observaciones ({observations.length})</Text>
                    <TouchableOpacity onPress={() => setShowAddObs(!showAddObs)}>
                        <Text style={styles.addBtn}>+ Agregar</Text>
                    </TouchableOpacity>
                </View>

                {showAddObs && (
                    <View style={styles.addForm}>
                        <TextInput
                            style={styles.input}
                            placeholder="Titulo"
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Descripcion"
                            value={newDesc}
                            onChangeText={setNewDesc}
                            multiline
                        />
                        <View style={styles.pickerRow}>
                            <Text style={styles.pickerLabel}>Severidad:</Text>
                            {['leve', 'media', 'alta', 'critica'].map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.pickerOpt, newSeverity === s && styles.pickerOptActive]}
                                    onPress={() => setNewSeverity(s)}
                                >
                                    <Text style={[styles.pickerText, newSeverity === s && styles.pickerTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.pickerRow}>
                            <Text style={styles.pickerLabel}>Tipo:</Text>
                            {['humedad', 'electrico', 'acabados', 'otro'].map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.pickerOpt, newType === t && styles.pickerOptActive]}
                                    onPress={() => setNewType(t)}
                                >
                                    <Text style={[styles.pickerText, newType === t && styles.pickerTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.addConfirmBtn} onPress={addObservation}>
                            <Text style={styles.addConfirmText}>Agregar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {observations.length === 0 ? (
                    <Text style={styles.emptyText}>Sin observaciones en esta area</Text>
                ) : (
                    observations.map((obs) => (
                        <View key={obs.id} style={styles.obsCard}>
                            <View style={styles.obsHeader}>
                                <Text style={styles.obsTitle}>{obs.title}</Text>
                                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(obs.severity) }]}>
                                    <Text style={styles.severityText}>{obs.severity}</Text>
                                </View>
                            </View>
                            <Text style={styles.obsType}>Tipo: {obs.type}</Text>
                            {obs.description ? <Text style={styles.obsDesc}>{obs.description}</Text> : null}
                        </View>
                    ))
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#1a237e', padding: 20 },
    areaName: { fontSize: 20, fontWeight: '700', color: '#fff' },
    areaCategory: { fontSize: 14, color: '#fff', opacity: 0.8, marginTop: 4 },
    section: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, elevation: 2 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
    addBtn: { fontSize: 14, color: '#1a237e', fontWeight: '600' },
    addForm: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 12 },
    input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
    textArea: { height: 80, textAlignVertical: 'top' },
    addConfirmBtn: { backgroundColor: '#1a237e', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    addConfirmText: { color: '#fff', fontWeight: '600' },
    pickerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    pickerLabel: { fontSize: 13, color: '#333', fontWeight: '600' },
    pickerOpt: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e0e0e0' },
    pickerOptActive: { backgroundColor: '#1a237e' },
    pickerText: { fontSize: 12, color: '#333' },
    pickerTextActive: { color: '#fff' },
    obsCard: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 8 },
    obsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    obsTitle: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
    severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    severityText: { color: '#fff', fontSize: 10, fontWeight: '600' },
    obsType: { fontSize: 12, color: '#666', marginTop: 4 },
    obsDesc: { fontSize: 12, color: '#666', marginTop: 4 },
    emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic', textAlign: 'center', padding: 20 }
});

export default AreaDetailScreen;

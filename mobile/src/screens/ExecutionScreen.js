import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
    ActivityIndicator, Alert, FlatList, AppState
} from 'react-native';
import { useOffline } from '../context/OfflineContext';
import { useAuth } from '../context/AuthContext';
import { inspectionsRepo } from '../database/inspections.repo';
import { areasRepo } from '../database/areas.repo';
import { observationsRepo } from '../database/observations.repo';
import { offlineQueue } from '../services/offlineQueue';
import { SyncButton } from '../components/SyncButton';
import { OfflineBadge } from '../components/OfflineBadge';
import config from '../config';

const ExecutionScreen = ({ route, navigation }) => {
    const { inspectionId } = route.params;
    const { isOnline, isSyncing } = useOffline();
    const { user } = useAuth();
    const [inspection, setInspection] = useState(null);
    const [areas, setAreas] = useState([]);
    const [observations, setObservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newAreaName, setNewAreaName] = useState('');
    const [newAreaCategory, setNewAreaCategory] = useState('');
    const [showAddArea, setShowAddArea] = useState(false);
    const [newObsTitle, setNewObsTitle] = useState('');
    const [newObsDesc, setNewObsDesc] = useState('');
    const [newObsSeverity, setNewObsSeverity] = useState('leve');
    const [newObsType, setNewObsType] = useState('otro');
    const [selectedAreaId, setSelectedAreaId] = useState(null);
    const [showAddObs, setShowAddObs] = useState(false);
    const autoSaveTimer = useRef(null);

    useEffect(() => {
        loadData();
        return () => {
            if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
        };
    }, [inspectionId]);

    useEffect(() => {
        if (inspection) {
            autoSaveTimer.current = setInterval(autoSave, config.AUTO_SAVE_INTERVAL_MS);
        }
        return () => {
            if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
        };
    }, [inspection, areas, observations]);

    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                if (inspection) {
                    try {
                        await offlineQueue.saveInspection(
                            { ...inspection, status: inspection.status || 'en_proceso' },
                            isOnline
                        );
                    } catch {
                        // Silent fail on background save
                    }
                }
            }
        });

        return () => appStateSubscription?.remove();
    }, [inspection, isOnline]);

    const loadData = async () => {
        try {
            let local = await inspectionsRepo.getById(inspectionId);
            setInspection(local);
            const localAreas = await areasRepo.getByInspection(inspectionId);
            setAreas(localAreas);
            const localObs = await observationsRepo.getByInspection(inspectionId);
            setObservations(localObs);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar la inspeccion');
        } finally {
            setLoading(false);
        }
    };

    const autoSave = useCallback(async () => {
        if (!inspection) return;
        try {
            await offlineQueue.saveInspection(
                { ...inspection, status: 'en_proceso' },
                isOnline
            );
        } catch {
            // Silent fail for auto-save
        }
    }, [inspection, isOnline]);

    const saveManually = async () => {
        setSaving(true);
        try {
            await offlineQueue.saveInspection(
                { ...inspection, status: 'en_proceso' },
                isOnline
            );
            Alert.alert('Guardado', 'Guardado localmente exitosamente');
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    const addArea = async () => {
        if (!newAreaName.trim()) {
            Alert.alert('Error', 'El nombre del area es requerido');
            return;
        }

        const areaData = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            inspectionId,
            name: newAreaName.trim(),
            category: newAreaCategory.trim() || 'General',
            status: 'pendiente',
            sortOrder: areas.length
        };

        await areasRepo.upsert({ ...areaData, is_dirty: 1 });
        await offlineQueue.saveArea(inspectionId, areaData, isOnline);
        setAreas([...areas, areaData]);
        setNewAreaName('');
        setNewAreaCategory('');
        setShowAddArea(false);
    };

    const addObservation = async () => {
        if (!newObsTitle.trim() || !selectedAreaId) {
            Alert.alert('Error', 'Titulo y area son requeridos');
            return;
        }

        const obsData = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            inspectionId,
            areaId: selectedAreaId,
            title: newObsTitle.trim(),
            description: newObsDesc.trim(),
            severity: newObsSeverity,
            type: newObsType,
            status: 'pendiente',
            createdBy: user?.id
        };

        await observationsRepo.upsert({ ...obsData, is_dirty: 1 });
        await offlineQueue.saveObservation(inspectionId, obsData, isOnline);
        setObservations([...observations, obsData]);
        setNewObsTitle('');
        setNewObsDesc('');
        setShowAddObs(false);
    };

    const completeInspection = async () => {
        if (areas.length === 0) {
            Alert.alert('Error', 'Debe registrar al menos un area');
            return;
        }

        if (!isOnline) {
            Alert.alert(
                'Sin conexion',
                'La inspeccion se marcara para completar automaticamente cuando vuelva la conexion.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Marcar para completar',
                        onPress: async () => {
                            await offlineQueue.saveInspection(
                                { ...inspection, status: 'en_proceso', readyToComplete: true },
                                false
                            );
                            setInspection({ ...inspection, readyToComplete: true });
                            Alert.alert('Marcado', 'Se completara automaticamente al sincronizar');
                        }
                    }
                ]
            );
            return;
        }

        Alert.alert(
            'Completar Inspeccion',
            'La inspeccion pasara a "lista_revision". Continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Completar',
                    onPress: async () => {
                        try {
                            await offlineQueue.saveInspection(
                                { ...inspection, status: 'lista_revision', readyToComplete: false },
                                true
                            );
                            await inspectionsRepo.upsert({
                                ...inspection,
                                status: 'lista_revision',
                                readyToComplete: false,
                                is_dirty: 0
                            });
                            Alert.alert('Exito', 'Inspeccion completada');
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo completar');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1a237e" /></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <OfflineBadge />
                <SyncButton />
            </View>

            {isSyncing && (
                <View style={styles.lockBanner}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.lockText}>Sincronizando... No se pueden hacer cambios</Text>
                </View>
            )}

            <ScrollView style={styles.scroll}>
                <View style={styles.header}>
                    <Text style={styles.title}>{inspection?.projectName}</Text>
                    <Text style={styles.subtitle}>{areas.length} areas | {observations.length} observaciones</Text>
                </View>

                {/* Auto-save indicator */}
                <View style={styles.saveBar}>
                    <TouchableOpacity style={styles.saveBtn} onPress={saveManually} disabled={saving || isSyncing}>
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Guardar</Text>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.autoSaveText}>Auto-save cada 30s</Text>
                </View>

                {/* Areas */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Areas</Text>
                        <TouchableOpacity onPress={() => !isSyncing && setShowAddArea(!showAddArea)}>
                            <Text style={[styles.addBtn, isSyncing && styles.disabledText]}>+ Agregar</Text>
                        </TouchableOpacity>
                    </View>

                    {showAddArea && (
                        <View style={styles.addForm}>
                            <TextInput
                                style={styles.input}
                                placeholder="Nombre del area"
                                value={newAreaName}
                                onChangeText={setNewAreaName}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Categoria (opcional)"
                                value={newAreaCategory}
                                onChangeText={setNewAreaCategory}
                            />
                            <TouchableOpacity style={styles.addConfirmBtn} onPress={addArea}>
                                <Text style={styles.addConfirmText}>Agregar Area</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {areas.map((area) => (
                        <TouchableOpacity
                            key={area.id}
                            style={[styles.areaCard, selectedAreaId === area.id && styles.areaCardSelected]}
                            onPress={() => setSelectedAreaId(area.id)}
                        >
                            <Text style={styles.areaName}>{area.name}</Text>
                            <Text style={styles.areaCategory}>{area.category}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Observations */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Observaciones</Text>
                        <TouchableOpacity onPress={() => !isSyncing && setShowAddObs(!showAddObs)}>
                            <Text style={[styles.addBtn, isSyncing && styles.disabledText]}>+ Agregar</Text>
                        </TouchableOpacity>
                    </View>

                    {showAddObs && (
                        <View style={styles.addForm}>
                            <TextInput
                                style={styles.input}
                                placeholder="Titulo de la observacion"
                                value={newObsTitle}
                                onChangeText={setNewObsTitle}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Descripcion"
                                value={newObsDesc}
                                onChangeText={setNewObsDesc}
                                multiline
                            />
                            <View style={styles.pickerRow}>
                                <Text style={styles.pickerLabel}>Severidad:</Text>
                                {['leve', 'media', 'alta', 'critica'].map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.pickerOpt, newObsSeverity === s && styles.pickerOptActive]}
                                        onPress={() => setNewObsSeverity(s)}
                                    >
                                        <Text style={[styles.pickerText, newObsSeverity === s && styles.pickerTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.pickerRow}>
                                <Text style={styles.pickerLabel}>Tipo:</Text>
                                {['humedad', 'electrico', 'acabados', 'otro'].map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.pickerOpt, newObsType === t && styles.pickerOptActive]}
                                        onPress={() => setNewObsType(t)}
                                    >
                                        <Text style={[styles.pickerText, newObsType === t && styles.pickerTextActive]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {!selectedAreaId && (
                                <Text style={styles.warningText}>Selecciona un area primero</Text>
                            )}
                            <TouchableOpacity
                                style={[styles.addConfirmBtn, !selectedAreaId && styles.disabledBtn]}
                                onPress={addObservation}
                                disabled={!selectedAreaId}
                            >
                                <Text style={styles.addConfirmText}>Agregar Observacion</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {observations.map((obs) => (
                        <View key={obs.id} style={styles.obsCard}>
                            <View style={styles.obsHeader}>
                                <Text style={styles.obsTitle}>{obs.title}</Text>
                                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(obs.severity) }]}>
                                    <Text style={styles.severityText}>{obs.severity}</Text>
                                </View>
                            </View>
                            <Text style={styles.obsDesc} numberOfLines={2}>{obs.description}</Text>
                        </View>
                    ))}
                </View>

                {/* Photos section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Fotos</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('PhotoCapture', { inspectionId })}
                        >
                            <Text style={styles.addBtn}>+ Tomar Foto</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Complete button */}
                <View style={styles.completeSection}>
                    {inspection?.readyToComplete && !isOnline ? (
                        <View style={styles.pendingCompleteBanner}>
                            <Text style={styles.pendingCompleteText}>
                                Marcad para completar. Se sincronizara automaticamente.
                            </Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.completeBtn, (!isOnline || isSyncing) && styles.disabledBtn]}
                            onPress={completeInspection}
                            disabled={!isOnline || isSyncing}
                        >
                            <Text style={styles.completeBtnText}>
                                {isSyncing ? 'Sincronizando...' : isOnline ? 'Completar Inspeccion' : 'Requiere conexion'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const getSeverityColor = (severity) => {
    const colors = { leve: '#4caf50', media: '#ff9800', alta: '#f44336', critica: '#b71c1c' };
    return colors[severity] || '#999';
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff', elevation: 2 },
    scroll: { flex: 1 },
    header: { padding: 16 },
    title: { fontSize: 20, fontWeight: '700', color: '#333' },
    subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
    saveBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#e8eaf6', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 8 },
    saveBtn: { backgroundColor: '#1a237e', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
    saveBtnText: { color: '#fff', fontWeight: '600' },
    autoSaveText: { fontSize: 12, color: '#666' },
    section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, elevation: 2 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
    addBtn: { fontSize: 14, color: '#1a237e', fontWeight: '600' },
    addForm: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 12 },
    input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
    textArea: { height: 80, textAlignVertical: 'top' },
    addConfirmBtn: { backgroundColor: '#1a237e', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    addConfirmText: { color: '#fff', fontWeight: '600' },
    disabledBtn: { opacity: 0.5 },
    areaCard: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
    areaCardSelected: { borderColor: '#1a237e', backgroundColor: '#e8eaf6' },
    areaName: { fontSize: 14, fontWeight: '600', color: '#333' },
    areaCategory: { fontSize: 12, color: '#666', marginTop: 2 },
    obsCard: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 8 },
    obsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    obsTitle: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
    severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    severityText: { color: '#fff', fontSize: 10, fontWeight: '600' },
    obsDesc: { fontSize: 12, color: '#666', marginTop: 4 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    pickerLabel: { fontSize: 13, color: '#333', fontWeight: '600' },
    pickerOpt: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e0e0e0' },
    pickerOptActive: { backgroundColor: '#1a237e' },
    pickerText: { fontSize: 12, color: '#333' },
    pickerTextActive: { color: '#fff' },
    warningText: { color: '#e65100', fontSize: 12, marginBottom: 8 },
    completeSection: { padding: 16 },
    completeBtn: { backgroundColor: '#4caf50', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    lockBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#ff9800', paddingVertical: 10, paddingHorizontal: 16, gap: 8
    },
    lockText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    disabledText: { opacity: 0.4 },
    pendingCompleteBanner: {
        backgroundColor: '#ff9800', paddingVertical: 14, borderRadius: 8, alignItems: 'center'
    },
    pendingCompleteText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});

export default ExecutionScreen;

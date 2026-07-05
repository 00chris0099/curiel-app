import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
    ActivityIndicator, Alert, FlatList, AppState, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useOffline } from '../context/OfflineContext';
import { useAuth } from '../context/AuthContext';
import { inspectionsRepo } from '../database/inspections.repo';
import { areasRepo } from '../database/areas.repo';
import { observationsRepo } from '../database/observations.repo';
import { photosRepo } from '../database/photos.repo';
import { offlineQueue } from '../services/offlineQueue';
import { photoService } from '../services/api';
import { SyncButton } from '../components/SyncButton';
import { OfflineBadge } from '../components/OfflineBadge';
import config from '../config';
import { useTheme } from '../context/ThemeContext';
import { getSeverityColor } from '../utils/colors';

const ExecutionScreen = ({ route, navigation }) => {
    const { inspectionId } = route.params;
    const { isOnline, isSyncing } = useOffline();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [inspection, setInspection] = useState(null);
    const [areas, setAreas] = useState([]);
    const [observations, setObservations] = useState([]);
    const [photos, setPhotos] = useState([]);
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
    const [summaryConclusion, setSummaryConclusion] = useState('');
    const [summaryRecommendations, setSummaryRecommendations] = useState('');
    const [photoType, setPhotoType] = useState('area');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const autoSaveTimer = useRef(null);
    const latestDataRef = useRef({ inspection: null, areas: [], observations: [], photos: [] });

    useEffect(() => {
        latestDataRef.current = { inspection, areas, observations, photos };
    }, [inspection, areas, observations, photos]);

    useEffect(() => {
        loadData();
        return () => {
            if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
        };
    }, [inspectionId]);

    useEffect(() => {
        if (inspection) {
            autoSaveTimer.current = setInterval(() => {
                const { inspection: latestInspection } = latestDataRef.current;
                if (!latestInspection) return;
                offlineQueue.saveInspection(
                    { ...latestInspection, status: 'en_proceso' },
                    isOnline
                ).catch(() => {});
            }, config.AUTO_SAVE_INTERVAL_MS);
        }
        return () => {
            if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
        };
    }, [inspection?.id, isOnline]);

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
            const localPhotos = await photosRepo.getByInspection(inspectionId);
            setPhotos(localPhotos);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar la inspeccion');
        } finally {
            setLoading(false);
        }
    };

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

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar fotos');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
            uploadPhoto(result.assets[0].uri);
        }
    };

    const pickPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsMultipleSelection: true,
        });

        if (!result.canceled && result.assets.length > 0) {
            for (const asset of result.assets) {
                await uploadPhoto(asset.uri);
            }
        }
    };

    const uploadPhoto = async (uri) => {
        setUploadingPhoto(true);
        try {
            const photoData = {
                id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                inspectionId,
                type: photoType,
                url: uri,
                localPath: uri,
                caption: '',
                uploadStatus: 'pending',
            };

            await photosRepo.upsert({ ...photoData, is_dirty: 1 });
            await offlineQueue.savePhoto(inspectionId, photoData, isOnline);
            setPhotos([...photos, photoData]);
            Alert.alert('Foto guardada', isOnline ? 'Foto subida correctamente' : 'Foto guardada localmente');
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar la foto');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const deletePhoto = async (photoId) => {
        Alert.alert('Eliminar foto', '¿Estás seguro de que deseas eliminar esta foto?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await photosRepo.remove(photoId);
                        setPhotos(photos.filter(p => p.id !== photoId));
                        if (isOnline) {
                            await photoService.delete(photoId);
                        }
                        Alert.alert('Eliminada', 'Foto eliminada correctamente');
                    } catch (error) {
                        Alert.alert('Error', 'No se pudo eliminar la foto');
                    }
                }
            }
        ]);
    };

    const saveSummary = async () => {
        if (!inspection) return;
        setSaving(true);
        try {
            await offlineQueue.saveInspection(
                { ...inspection, generalConclusion: summaryConclusion, finalRecommendations: summaryRecommendations },
                isOnline
            );
            Alert.alert('Guardado', 'Resumen guardado');
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar el resumen');
        } finally {
            setSaving(false);
        }
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
        return <View style={[styles.center, { backgroundColor: theme.colors.bg }]}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <View style={[styles.topBar, { backgroundColor: theme.colors.card }]}>
                <OfflineBadge />
                <SyncButton />
            </View>

            {isSyncing && (
                <View style={[styles.lockBanner, { backgroundColor: theme.colors.warning }]}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.lockText}>Sincronizando... No se pueden hacer cambios</Text>
                </View>
            )}

            <ScrollView style={styles.scroll}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{inspection?.projectName}</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{inspection?.clientName}</Text>
                </View>

                {/* Stats Bar */}
                <View style={[styles.statsBar, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: theme.colors.primary }]}>{areas.length}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Areas</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: theme.colors.primary }]}>{observations.length}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Obs.</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: theme.colors.primary }]}>{photos.length}</Text>
                        <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Fotos</Text>
                    </View>
                </View>

                {/* Auto-save indicator */}
                <View style={[styles.saveBar, { backgroundColor: theme.colors.primaryLight }]}>
                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={saveManually} disabled={saving || isSyncing}>
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Guardar</Text>
                        )}
                    </TouchableOpacity>
                    <Text style={[styles.autoSaveText, { color: theme.colors.textSecondary }]}>Auto-save cada 30s</Text>
                </View>

                {/* Areas */}
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Areas</Text>
                        <TouchableOpacity onPress={() => !isSyncing && setShowAddArea(!showAddArea)}>
                            <Text style={[styles.addBtn, { color: theme.colors.primary }, isSyncing && styles.disabledText]}>+ Agregar</Text>
                        </TouchableOpacity>
                    </View>

                    {showAddArea && (
                        <View style={[styles.addForm, { backgroundColor: theme.colors.bg }]}>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder }]}
                                placeholder="Nombre del area"
                                value={newAreaName}
                                onChangeText={setNewAreaName}
                            />
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder }]}
                                placeholder="Categoria (opcional)"
                                value={newAreaCategory}
                                onChangeText={setNewAreaCategory}
                            />
                            <TouchableOpacity style={[styles.addConfirmBtn, { backgroundColor: theme.colors.primary }]} onPress={addArea}>
                                <Text style={styles.addConfirmText}>Agregar Area</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {areas.map((area) => (
                        <TouchableOpacity
                            key={area.id}
                            style={[styles.areaCard, { backgroundColor: theme.colors.bg }, selectedAreaId === area.id && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }]}
                            onPress={() => {
                                setSelectedAreaId(area.id);
                                navigation.navigate('AreaDetail', { areaId: area.id, inspectionId, areaName: area.name });
                            }}
                        >
                            <Text style={[styles.areaName, { color: theme.colors.text }]}>{area.name}</Text>
                            <Text style={[styles.areaCategory, { color: theme.colors.textSecondary }]}>{area.category}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Observations */}
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Observaciones</Text>
                        <TouchableOpacity onPress={() => !isSyncing && setShowAddObs(!showAddObs)}>
                            <Text style={[styles.addBtn, { color: theme.colors.primary }, isSyncing && styles.disabledText]}>+ Agregar</Text>
                        </TouchableOpacity>
                    </View>

                    {showAddObs && (
                        <View style={[styles.addForm, { backgroundColor: theme.colors.bg }]}>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder }]}
                                placeholder="Titulo de la observacion"
                                value={newObsTitle}
                                onChangeText={setNewObsTitle}
                            />
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder }, styles.textArea]}
                                placeholder="Descripcion"
                                value={newObsDesc}
                                onChangeText={setNewObsDesc}
                                multiline
                            />
                            <View style={styles.pickerRow}>
                                <Text style={[styles.pickerLabel, { color: theme.colors.text }]}>Severidad:</Text>
                                {['leve', 'media', 'alta', 'critica'].map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.pickerOpt, { backgroundColor: theme.colors.border }, newObsSeverity === s && styles.pickerOptActive]}
                                        onPress={() => setNewObsSeverity(s)}
                                    >
                                        <Text style={[styles.pickerText, { color: theme.colors.text }, newObsSeverity === s && styles.pickerTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.pickerRow}>
                                <Text style={[styles.pickerLabel, { color: theme.colors.text }]}>Tipo:</Text>
                                {['humedad', 'electrico', 'acabados', 'otro'].map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.pickerOpt, { backgroundColor: theme.colors.border }, newObsType === t && styles.pickerOptActive]}
                                        onPress={() => setNewObsType(t)}
                                    >
                                        <Text style={[styles.pickerText, { color: theme.colors.text }, newObsType === t && styles.pickerTextActive]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {!selectedAreaId && (
                                <Text style={styles.warningText}>Selecciona un area primero</Text>
                            )}
                            <TouchableOpacity
                                style={[styles.addConfirmBtn, { backgroundColor: theme.colors.primary }, !selectedAreaId && styles.disabledBtn]}
                                onPress={addObservation}
                                disabled={!selectedAreaId}
                            >
                                <Text style={styles.addConfirmText}>Agregar Observacion</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {observations.map((obs) => (
                        <View key={obs.id} style={[styles.obsCard, { backgroundColor: theme.colors.bg }]}>
                            <View style={styles.obsHeader}>
                                <Text style={[styles.obsTitle, { color: theme.colors.text }]}>{obs.title}</Text>
                                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(obs.severity, theme.isDark) }]}>
                                    <Text style={styles.severityText}>{obs.severity}</Text>
                                </View>
                            </View>
                            <Text style={[styles.obsDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>{obs.description}</Text>
                        </View>
                    ))}
                </View>

                {/* Photos section */}
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Fotos ({photos.length})</Text>
                    </View>

                    {/* Photo type selector */}
                    <View style={styles.pickerRow}>
                        <Text style={[styles.pickerLabel, { color: theme.colors.text }]}>Tipo:</Text>
                        {['area', 'edificio', 'plano', 'general'].map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.pickerOpt, { backgroundColor: theme.colors.border }, photoType === t && styles.pickerOptActive]}
                                onPress={() => setPhotoType(t)}
                            >
                                <Text style={[styles.pickerText, { color: theme.colors.text }, photoType === t && styles.pickerTextActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Photo action buttons */}
                    <View style={styles.photoActions}>
                        <TouchableOpacity
                            style={[styles.photoActionBtn, { backgroundColor: theme.colors.primary }]}
                            onPress={takePhoto}
                            disabled={uploadingPhoto || isSyncing}
                        >
                            {uploadingPhoto ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.photoActionText}>Tomar Foto</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.photoActionBtn, { backgroundColor: theme.colors.secondary || '#666' }]}
                            onPress={pickPhoto}
                            disabled={uploadingPhoto || isSyncing}
                        >
                            <Text style={styles.photoActionText}>Galeria</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Photo list */}
                    {photos.length > 0 ? (
                        <View style={styles.photoGrid}>
                            {photos.map((photo) => (
                                <View key={photo.id} style={styles.photoItem}>
                                    <Image source={{ uri: photo.url || photo.localPath }} style={styles.photoThumb} />
                                    <TouchableOpacity
                                        style={styles.photoDeleteBtn}
                                        onPress={() => deletePhoto(photo.id)}
                                    >
                                        <Text style={styles.photoDeleteText}>X</Text>
                                    </TouchableOpacity>
                                    <Text style={[styles.photoTypeLabel, { color: theme.colors.textSecondary }]}>{photo.type}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Sin fotos registradas</Text>
                    )}
                </View>

                {/* Summary section */}
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Resumen Tecnico</Text>
                    </View>

                    <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Conclusion general</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                        value={summaryConclusion}
                        onChangeText={setSummaryConclusion}
                        placeholder="Resumen del estado global del departamento..."
                        multiline
                    />

                    <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>Recomendaciones finales</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                        value={summaryRecommendations}
                        onChangeText={setSummaryRecommendations}
                        placeholder="Acciones correctivas y sugerencias..."
                        multiline
                    />

                    <TouchableOpacity style={[styles.saveSummaryBtn, { backgroundColor: theme.colors.primary }]} onPress={saveSummary} disabled={saving}>
                        <Text style={styles.saveSummaryText}>{saving ? 'Guardando...' : 'Guardar Resumen'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Complete button */}
                <View style={styles.completeSection}>
                    {inspection?.readyToComplete && !isOnline ? (
                        <View style={[styles.pendingCompleteBanner, { backgroundColor: theme.colors.warning }]}>
                            <Text style={styles.pendingCompleteText}>
                                Marcad para completar. Se sincronizara automaticamente.
                            </Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.completeBtn, { backgroundColor: theme.colors.success }, (!isOnline || isSyncing) && styles.disabledBtn]}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff', elevation: 2 },
    scroll: { flex: 1 },
    header: { padding: 16 },
    title: { fontSize: 20, fontWeight: '700', color: '#333' },
    subtitle: { fontSize: 14, color: '#666', marginTop: 2 },
    statsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, elevation: 1 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '700' },
    statLabel: { fontSize: 11, marginTop: 2 },
    statDivider: { width: 1, height: 30 },
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
    photoActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    photoActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    photoActionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    photoItem: { width: '31%', position: 'relative' },
    photoThumb: { width: '100%', height: 80, borderRadius: 8 },
    photoDeleteBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(220,38,38,0.9)', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    photoDeleteText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    photoTypeLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
    fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
    saveSummaryBtn: { backgroundColor: '#1a237e', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    saveSummaryText: { color: '#fff', fontWeight: '600' },
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
    pendingCompleteText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    emptyText: { fontSize: 13, color: '#999', textAlign: 'center', fontStyle: 'italic' }
});

export default ExecutionScreen;

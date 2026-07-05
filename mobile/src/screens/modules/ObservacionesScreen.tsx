import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useOffline } from '../../context/OfflineContext';
import { areasRepo } from '../../database/areas.repo';
import { observationsRepo } from '../../database/observations.repo';
import { photosRepo } from '../../database/photos.repo';
import { offlineQueue } from '../../services/offlineQueue';

const SEVERITIES = ['leve', 'media', 'alta', 'critica'];
const TYPES = ['humedad', 'electrico', 'acabados', 'otro'];

const ObservacionesScreen = ({ route }) => {
    const { inspectionId } = route.params;
    const { theme } = useTheme();
    const { isOnline } = useOffline();
    const [areas, setAreas] = useState([]);
    const [observations, setObservations] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedArea, setExpandedArea] = useState(null);
    const [showObsForm, setShowObsForm] = useState(false);
    const [obsTitle, setObsTitle] = useState('');
    const [obsDesc, setObsDesc] = useState('');
    const [obsSeverity, setObsSeverity] = useState('leve');
    const [obsType, setObsType] = useState('acabados');

    useEffect(() => { loadData(); }, [inspectionId]);

    const loadData = async () => {
        try {
            setAreas(await areasRepo.getByInspection(inspectionId));
            setObservations(await observationsRepo.getByInspection(inspectionId));
            setPhotos(await photosRepo.getByInspection(inspectionId));
        } catch {} finally { setLoading(false); }
    };

    const getAreaPhotos = (areaId) => photos.filter(p => p.areaId === areaId);
    const getAreaObservations = (areaId) => observations.filter(o => o.areaId === areaId);

    const takePhoto = async (areaId) => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara'); return; }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
        if (!result.canceled && result.assets[0]) await savePhoto(result.assets[0].uri, areaId);
    };

    const pickPhoto = async (areaId) => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
        if (!result.canceled && result.assets[0]) await savePhoto(result.assets[0].uri, areaId);
    };

    const savePhoto = async (uri, areaId) => {
        const data = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            inspectionId, areaId, type: 'area', url: uri, localPath: uri,
            uploadStatus: 'pending', isPrincipal: false
        };
        await photosRepo.upsert({ ...data, is_dirty: 1 });
        await offlineQueue.savePhoto(inspectionId, data, isOnline);
        setPhotos([...photos, data]);
    };

    const setPrincipal = async (photoId) => {
        await photosRepo.setPrincipal(photoId, inspectionId);
        setPhotos(photos.map(p => ({ ...p, isPrincipal: p.id === photoId })));
        Alert.alert('Foto principal seleccionada');
    };

    const deletePhoto = async (photoId) => {
        Alert.alert('Eliminar', 'Eliminar foto?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                await photosRepo.remove(photoId);
                setPhotos(photos.filter(p => p.id !== photoId));
            }}
        ]);
    };

    const addObservation = async (areaId) => {
        if (!obsTitle.trim()) { Alert.alert('Error', 'Titulo requerido'); return; }
        const data = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            inspectionId, areaId, title: obsTitle.trim(), description: obsDesc.trim(),
            severity: obsSeverity, type: obsType, status: 'pendiente', createdBy: 'system'
        };
        await observationsRepo.upsert({ ...data, is_dirty: 1 });
        await offlineQueue.saveObservation(inspectionId, data, isOnline);
        setObservations([...observations, data]);
        setObsTitle(''); setObsDesc(''); setShowObsForm(false);
    };

    const deleteObservation = async (obsId) => {
        Alert.alert('Eliminar', 'Eliminar observacion?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                await observationsRepo.remove(obsId);
                setObservations(observations.filter(o => o.id !== obsId));
            }}
        ]);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Observaciones por Area</Text>
            {areas.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Registra areas primero en el modulo Areas</Text>
            ) : areas.map((area) => {
                const isExpanded = expandedArea === area.id;
                const areaPhotos = getAreaPhotos(area.id);
                const areaObs = getAreaObservations(area.id);
                return (
                    <View key={area.id} style={[styles.areaSection, { backgroundColor: theme.colors.card }]}>
                        <TouchableOpacity style={styles.areaHeader} onPress={() => setExpandedArea(isExpanded ? null : area.id)}>
                            <Text style={[styles.areaName, { color: theme.colors.text }]}>{area.name}</Text>
                            <Text style={[styles.areaCount, { color: theme.colors.textSecondary }]}>{areaPhotos.length} fotos · {areaObs.length} obs</Text>
                        </TouchableOpacity>
                        {isExpanded && (
                            <View style={styles.areaContent}>
                                <View style={styles.photoActions}>
                                    <TouchableOpacity style={[styles.photoBtn, { backgroundColor: theme.colors.primary }]} onPress={() => takePhoto(area.id)}>
                                        <Text style={styles.photoBtnText}>Camara</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.photoBtn, { backgroundColor: '#666' }]} onPress={() => pickPhoto(area.id)}>
                                        <Text style={styles.photoBtnText}>Galeria</Text>
                                    </TouchableOpacity>
                                </View>
                                {areaPhotos.length > 0 && (
                                    <View style={styles.photoGrid}>
                                        {areaPhotos.map((p) => (
                                            <View key={p.id} style={styles.photoItem}>
                                                <Image source={{ uri: p.url || p.localPath }} style={styles.photoThumb} />
                                                {p.isPrincipal && <View style={styles.principalBadge}><Text style={styles.principalText}>Principal</Text></View>}
                                                <View style={styles.photoActions2}>
                                                    {!p.isPrincipal && (
                                                        <TouchableOpacity style={styles.principalBtn} onPress={() => setPrincipal(p.id)}>
                                                            <Text style={styles.principalBtnText}>Principal</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                    <TouchableOpacity onPress={() => deletePhoto(p.id)}>
                                                        <Text style={styles.deleteText}>X</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                {showObsForm && expandedArea === area.id ? (
                                    <View style={styles.obsForm}>
                                        <TextInput style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="Titulo" value={obsTitle} onChangeText={setObsTitle} />
                                        <TextInput style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="Descripcion" value={obsDesc} onChangeText={setObsDesc} multiline />
                                        <View style={styles.chipRow}>
                                            {SEVERITIES.map(s => (
                                                <TouchableOpacity key={s} style={[styles.chip, obsSeverity === s && { backgroundColor: theme.colors.primary }]} onPress={() => setObsSeverity(s)}>
                                                    <Text style={[styles.chipText, obsSeverity === s && { color: '#fff' }]}>{s}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <View style={styles.chipRow}>
                                            {TYPES.map(t => (
                                                <TouchableOpacity key={t} style={[styles.chip, obsType === t && { backgroundColor: theme.colors.primary }]} onPress={() => setObsType(t)}>
                                                    <Text style={[styles.chipText, obsType === t && { color: '#fff' }]}>{t}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <View style={styles.obsFormActions}>
                                            <TouchableOpacity style={[styles.obsFormBtn, { backgroundColor: '#999' }]} onPress={() => setShowObsForm(false)}>
                                                <Text style={styles.obsFormBtnText}>Cancelar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.obsFormBtn, { backgroundColor: theme.colors.primary }]} onPress={() => addObservation(area.id)}>
                                                <Text style={styles.obsFormBtnText}>Guardar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={[styles.addObsBtn, { borderColor: theme.colors.primary }]} onPress={() => setShowObsForm(true)}>
                                        <Text style={[styles.addObsBtnText, { color: theme.colors.primary }]}>+ Observacion</Text>
                                    </TouchableOpacity>
                                )}
                                {areaObs.map((obs) => (
                                    <View key={obs.id} style={[styles.obsCard, { backgroundColor: theme.colors.bg }]}>
                                        <View style={styles.obsHeader}>
                                            <Text style={[styles.obsTitle, { color: theme.colors.text }]}>{obs.title}</Text>
                                            <TouchableOpacity onPress={() => deleteObservation(obs.id)}>
                                                <Text style={styles.deleteText}>X</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={[styles.obsDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>{obs.description}</Text>
                                        <Text style={[styles.obsMeta, { color: theme.colors.textMuted }]}>{obs.severity} · {obs.type}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    emptyText: { fontSize: 14, textAlign: 'center', marginTop: 40 },
    areaSection: { borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
    areaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    areaName: { fontSize: 15, fontWeight: '600' },
    areaCount: { fontSize: 12 },
    areaContent: { padding: 14, paddingTop: 0 },
    photoActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    photoBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    photoItem: { width: '31%', position: 'relative' },
    photoThumb: { width: '100%', height: 70, borderRadius: 6 },
    principalBadge: { position: 'absolute', top: 2, left: 2, backgroundColor: '#4caf50', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
    principalText: { color: '#fff', fontSize: 8, fontWeight: '700' },
    photoActions2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
    principalBtn: { backgroundColor: '#e8f5e9', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
    principalBtnText: { color: '#4caf50', fontSize: 9, fontWeight: '600' },
    deleteText: { color: '#f44336', fontSize: 12, fontWeight: '700' },
    obsForm: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 10 },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e0e0e0' },
    chipText: { fontSize: 11, color: '#333' },
    obsFormActions: { flexDirection: 'row', gap: 10 },
    obsFormBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    obsFormBtnText: { color: '#fff', fontWeight: '600' },
    addObsBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderStyle: 'dashed', marginBottom: 8 },
    addObsBtnText: { fontWeight: '600', fontSize: 13 },
    obsCard: { borderRadius: 8, padding: 10, marginBottom: 6 },
    obsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    obsTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
    obsDesc: { fontSize: 12, marginTop: 4 },
    obsMeta: { fontSize: 11, marginTop: 4 }
});

export default ObservacionesScreen;

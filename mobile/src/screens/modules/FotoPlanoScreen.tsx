import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useOffline } from '../../context/OfflineContext';
import { photosRepo } from '../../database/photos.repo';
import { offlineQueue } from '../../services/offlineQueue';

const FotoPlanoScreen = ({ route }) => {
    const { inspectionId } = route.params;
    const { theme } = useTheme();
    const { isOnline } = useOffline();
    const [photo, setPhoto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => { loadPhoto(); }, [inspectionId]);

    const loadPhoto = async () => {
        try {
            const existing = await photosRepo.getByType(inspectionId, 'plano');
            if (existing.length > 0) setPhoto(existing[0]);
        } catch {} finally { setLoading(false); }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara'); return; }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
        if (!result.canceled && result.assets[0]) await savePhoto(result.assets[0].uri);
    };

    const pickPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
        if (!result.canceled && result.assets[0]) await savePhoto(result.assets[0].uri);
    };

    const savePhoto = async (uri) => {
        setUploading(true);
        try {
            const data = {
                id: photo?.id || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                inspectionId, type: 'plano', url: uri, localPath: uri,
                uploadStatus: 'pending', isPrincipal: false
            };
            await photosRepo.upsert({ ...data, is_dirty: 1 });
            await offlineQueue.savePhoto(inspectionId, data, isOnline);
            setPhoto(data);
            Alert.alert('Guardada', isOnline ? 'Foto subida' : 'Guardada localmente');
        } catch { Alert.alert('Error', 'No se pudo guardar'); } finally { setUploading(false); }
    };

    const deletePhoto = async () => {
        Alert.alert('Eliminar', 'Eliminar foto del plano?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                if (photo) { await photosRepo.remove(photo.id); setPhoto(null); }
            }}
        ]);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Foto del Plano</Text>
            {photo ? (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: photo.url || photo.localPath }} style={styles.preview} />
                    <TouchableOpacity style={styles.deleteBtn} onPress={deletePhoto}>
                        <Text style={styles.deleteBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Sin foto registrada</Text>
                </View>
            )}
            <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]} onPress={takePhoto} disabled={uploading}>
                    {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Tomar Foto</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#666' }]} onPress={pickPhoto} disabled={uploading}>
                    <Text style={styles.actionBtnText}>Galeria</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    previewContainer: { alignItems: 'center', marginBottom: 16 },
    preview: { width: '100%', height: 250, borderRadius: 12 },
    deleteBtn: { marginTop: 8, backgroundColor: '#f44336', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
    deleteBtnText: { color: '#fff', fontWeight: '600' },
    emptyContainer: { height: 200, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 12, marginBottom: 16 },
    emptyText: { fontSize: 14 },
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 }
});

export default FotoPlanoScreen;

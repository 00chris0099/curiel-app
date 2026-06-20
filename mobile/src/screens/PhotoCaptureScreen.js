import React, { useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useOffline } from '../context/OfflineContext';
import { photosRepo } from '../database/photos.repo';
import { offlineQueue } from '../services/offlineQueue';
import { compressImage, formatFileSize } from '../utils/imageOptimizer';
import uuid from '../utils/uuid';

const PhotoCaptureScreen = ({ route, navigation }) => {
    const { inspectionId, areaId, observationId } = route.params || {};
    const { isOnline } = useOffline();
    const [permission, requestPermission] = useCameraPermissions();
    const [photoUri, setPhotoUri] = useState(null);
    const [uploading, setUploading] = useState(false);
    const cameraRef = useRef(null);

    const takePicture = async () => {
        if (!cameraRef.current) return;

        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
            setPhotoUri(photo.uri);
        } catch (error) {
            Alert.alert('Error', 'No se pudo tomar la foto');
        }
    };

    const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8
        });

        if (!result.canceled && result.assets[0]) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const savePhoto = async () => {
        if (!photoUri) return;

        setUploading(true);
        try {
            const photoId = `photo_${Date.now()}_${uuid()}`;

            // Comprimir imagen antes de guardar
            const compressed = await compressImage(photoUri, 'medium');
            const filename = `${photoId}.webp`;
            const destPath = `${FileSystem.documentDirectory}photos/${filename}`;

            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}photos`, { intermediates: true });
            await FileSystem.copyAsync({ from: compressed.uri, to: destPath });

            const photoData = {
                id: photoId,
                inspectionId,
                areaId: areaId || null,
                observationId: observationId || null,
                type: 'area',
                localPath: destPath,
                uploadedBy: null,
                uploadStatus: 'pending',
                originalSize: compressed.size,
                width: compressed.width,
                height: compressed.height
            };

            await photosRepo.upsert(photoData);
            await offlineQueue.savePhoto(photoData, isOnline);

            Alert.alert(
                'Foto Guardada',
                isOnline
                    ? `Foto comprimida (${formatFileSize(compressed.size)}) y sincronizada`
                    : `Foto comprimida (${formatFileSize(compressed.size)}). Se sincronizará cuando haya conexion.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar la foto');
        } finally {
            setUploading(false);
        }
    };

    if (!permission) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#1a237e" /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={styles.permText}>Se necesita permiso de camara</Text>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                    <Text style={styles.permBtnText}>Conceder Permiso</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.permBtn, styles.galleryBtn]} onPress={pickFromGallery}>
                    <Text style={styles.permBtnText}>Elegir de Galeria</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (photoUri) {
        return (
            <View style={styles.container}>
                <Image source={{ uri: photoUri }} style={styles.preview} />
                <View style={styles.previewActions}>
                    <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhotoUri(null)}>
                        <Text style={styles.retakeBtnText}>Tomar Otra</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveBtn, uploading && styles.disabledBtn]}
                        onPress={savePhoto}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Guardar Foto</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} ref={cameraRef} facing="back">
                <View style={styles.overlay}>
                    <Text style={styles.overlayText}>Tomar Foto</Text>
                </View>
            </CameraView>
            <View style={styles.captureActions}>
                <TouchableOpacity style={styles.galleryPickBtn} onPress={pickFromGallery}>
                    <Text style={styles.galleryPickText}>Galeria</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                    <View style={styles.captureBtnInner} />
                </TouchableOpacity>
                <View style={{ width: 60 }} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
    camera: { flex: 1 },
    overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 },
    overlayText: { color: '#fff', fontSize: 16, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
    captureActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 20, backgroundColor: '#000' },
    captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
    galleryPickBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
    galleryPickText: { color: '#fff', fontSize: 10, fontWeight: '600' },
    preview: { flex: 1 },
    previewActions: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#000' },
    retakeBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 2, borderColor: '#fff', alignItems: 'center' },
    retakeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#4caf50', alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    disabledBtn: { opacity: 0.5 },
    permText: { fontSize: 16, color: '#333', marginBottom: 16 },
    permBtn: { backgroundColor: '#1a237e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginBottom: 12 },
    galleryBtn: { backgroundColor: '#666' },
    permBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});

export default PhotoCaptureScreen;

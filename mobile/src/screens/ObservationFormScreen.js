import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert
} from 'react-native';
import { observationsRepo } from '../database/observations.repo';
import { offlineQueue } from '../services/offlineQueue';
import { useOffline } from '../context/OfflineContext';
import { useAuth } from '../context/AuthContext';

const ObservationFormScreen = ({ route, navigation }) => {
    const { inspectionId, areaId, observationId, existing } = route.params || {};
    const { isOnline } = useOffline();
    const { user } = useAuth();
    const [title, setTitle] = useState(existing?.title || '');
    const [description, setDescription] = useState(existing?.description || '');
    const [severity, setSeverity] = useState(existing?.severity || 'leve');
    const [type, setType] = useState(existing?.type || 'otro');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'El titulo es requerido');
            return;
        }

        setSaving(true);
        try {
            const obsData = {
                id: observationId || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                inspectionId,
                areaId,
                title: title.trim(),
                description: description.trim(),
                severity,
                type,
                status: existing?.status || 'pendiente',
                createdBy: user?.id,
                is_dirty: 1
            };

            await observationsRepo.upsert(obsData);
            await offlineQueue.saveObservation(inspectionId, obsData, isOnline);
            Alert.alert('Guardado', 'Observacion guardada exitosamente');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'No se pudo guardar la observacion');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{observationId ? 'Editar Observacion' : 'Nueva Observacion'}</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Titulo *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Titulo de la observacion"
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={styles.label}>Descripcion</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Descripcion detallada"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                />

                <Text style={styles.label}>Severidad</Text>
                <View style={styles.pickerRow}>
                    {['leve', 'media', 'alta', 'critica'].map((s) => (
                        <TouchableOpacity
                            key={s}
                            style={[styles.pickerOpt, severity === s && styles.pickerOptActive]}
                            onPress={() => setSeverity(s)}
                        >
                            <Text style={[styles.pickerText, severity === s && styles.pickerTextActive]}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Tipo</Text>
                <View style={styles.pickerRow}>
                    {['humedad', 'electrico', 'acabados', 'otro'].map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.pickerOpt, type === t && styles.pickerOptActive]}
                            onPress={() => setType(t)}
                        >
                            <Text style={[styles.pickerText, type === t && styles.pickerTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.disabledBtn]}
                    onPress={save}
                    disabled={saving}
                >
                    <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar Observacion'}</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { backgroundColor: '#1a237e', padding: 20 },
    title: { fontSize: 20, fontWeight: '700', color: '#fff' },
    form: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, elevation: 2 },
    label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 8 },
    input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
    textArea: { height: 100, textAlignVertical: 'top' },
    pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    pickerOpt: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e0e0e0' },
    pickerOptActive: { backgroundColor: '#1a237e' },
    pickerText: { fontSize: 13, color: '#333' },
    pickerTextActive: { color: '#fff' },
    saveBtn: { backgroundColor: '#4caf50', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    disabledBtn: { opacity: 0.5 }
});

export default ObservationFormScreen;

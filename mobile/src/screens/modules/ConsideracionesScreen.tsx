import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOffline } from '../../context/OfflineContext';
import { observationsRepo } from '../../database/observations.repo';
import { offlineQueue } from '../../services/offlineQueue';

const ConsideracionesScreen = ({ route }) => {
    const { inspectionId } = route.params;
    const { theme } = useTheme();
    const { isOnline } = useOffline();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [obsId, setObsId] = useState(null);
    const autoSave = useRef(null);

    useEffect(() => { loadConsideraciones(); return () => { if (autoSave.current) clearInterval(autoSave.current); }; }, [inspectionId]);

    useEffect(() => {
        if (obsId) {
            autoSave.current = setInterval(() => saveConsideraciones(true), 30000);
        }
        return () => { if (autoSave.current) clearInterval(autoSave.current); };
    }, [obsId]);

    const loadConsideraciones = async () => {
        try {
            const existing = await observationsRepo.getByInspection(inspectionId);
            const considObs = existing.find(o => o.type === 'consideracion');
            if (considObs) { setText(considObs.description || ''); setObsId(considObs.id); }
        } catch {} finally { setLoading(false); }
    };

    const saveConsideraciones = async (silent = false) => {
        if (!text.trim()) return;
        setSaving(true);
        try {
            const data = {
                id: obsId || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                inspectionId, areaId: 'consideraciones', title: 'Consideraciones Finales',
                description: text.trim(), severity: 'leve', type: 'consideracion',
                status: 'pendiente', createdBy: 'system'
            };
            await observationsRepo.upsert({ ...data, is_dirty: 1 });
            await offlineQueue.saveObservation(inspectionId, data, isOnline);
            setObsId(data.id);
            if (!silent) Alert.alert('Guardado', 'Consideraciones guardadas');
        } catch { if (!silent) Alert.alert('Error', 'No se pudo guardar'); } finally { setSaving(false); }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Consideraciones Finales</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Notas adicionales, restricciones de acceso, recomendaciones especiales.</Text>
            <TextInput
                style={[styles.textArea, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.card }]}
                value={text} onChangeText={setText} multiline placeholder="Escribe aqui..."
                textAlignVertical="top"
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={() => saveConsideraciones(false)} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    subtitle: { fontSize: 13, marginBottom: 16 },
    textArea: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 15, height: 300, marginBottom: 16 },
    saveBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 }
});

export default ConsideracionesScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useOffline } from '../../context/OfflineContext';
import { areasRepo } from '../../database/areas.repo';
import { offlineQueue } from '../../services/offlineQueue';

const CATEGORIES = ['Interior', 'Social', 'Baño', 'Cocina', 'Servicio', 'Exterior', 'Privado', 'Estructura'];

const AreasScreen = ({ route }) => {
    const { inspectionId } = route.params;
    const { theme } = useTheme();
    const { isOnline } = useOffline();
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Interior');
    const [lengthM, setLengthM] = useState('');
    const [widthM, setWidthM] = useState('');

    useEffect(() => { loadAreas(); }, [inspectionId]);

    const loadAreas = async () => {
        try {
            const data = await areasRepo.getByInspection(inspectionId);
            setAreas(data);
        } catch {} finally { setLoading(false); }
    };

    const calculatedArea = (() => {
        const l = parseFloat(lengthM);
        const w = parseFloat(widthM);
        if (!isNaN(l) && !isNaN(w)) return (l * w).toFixed(2);
        return '0';
    })();

    const totalArea = areas.reduce((sum, a) => sum + (a.calculatedAreaM2 || 0), 0);

    const addArea = async () => {
        if (!name.trim()) { Alert.alert('Error', 'Nombre requerido'); return; }
        const data = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            inspectionId, name: name.trim(), category,
            lengthM: parseFloat(lengthM) || null, widthM: parseFloat(widthM) || null,
            calculatedAreaM2: parseFloat(calculatedArea) || null,
            status: 'pendiente', sortOrder: areas.length
        };
        try {
            await areasRepo.upsert({ ...data, is_dirty: 1 });
            await offlineQueue.saveArea(inspectionId, data, isOnline);
            setAreas([...areas, data]);
            setName(''); setLengthM(''); setWidthM(''); setShowForm(false);
        } catch { Alert.alert('Error', 'No se pudo guardar'); }
    };

    const deleteArea = async (area) => {
        Alert.alert('Eliminar', `Eliminar area "${area.name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: async () => {
                await areasRepo.remove(area.id);
                setAreas(areas.filter(a => a.id !== area.id));
            }}
        ]);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Areas ({areas.length})</Text>

            {areas.length > 0 && (
                <View style={[styles.totalCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Area Total</Text>
                    <Text style={[styles.totalValue, { color: theme.colors.primary }]}>{totalArea.toFixed(2)} m²</Text>
                </View>
            )}

            {areas.map((area) => (
                <View key={area.id} style={[styles.areaCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.areaInfo}>
                        <Text style={[styles.areaName, { color: theme.colors.text }]}>{area.name}</Text>
                        <Text style={[styles.areaCategory, { color: theme.colors.textSecondary }]}>{area.category}</Text>
                    </View>
                    <View style={styles.areaRight}>
                        <Text style={[styles.areaSize, { color: theme.colors.primary }]}>{area.calculatedAreaM2 ? `${area.calculatedAreaM2} m²` : '-'}</Text>
                        <TouchableOpacity onPress={() => deleteArea(area)}>
                            <Text style={styles.deleteText}>X</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ))}

            {showForm ? (
                <View style={[styles.formCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.formTitle, { color: theme.colors.text }]}>Nueva Area</Text>
                    <TextInput style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="Nombre del area" value={name} onChangeText={setName} />
                    <TextInput style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="Largo (m)" value={lengthM} onChangeText={setLengthM} keyboardType="numeric" />
                    <TextInput style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]} placeholder="Ancho (m)" value={widthM} onChangeText={setWidthM} keyboardType="numeric" />
                    <Text style={[styles.calcLabel, { color: theme.colors.textSecondary }]}>Area: {calculatedArea} m²</Text>
                    <View style={styles.categoryRow}>
                        {CATEGORIES.map((c) => (
                            <TouchableOpacity key={c} style={[styles.categoryChip, category === c && { backgroundColor: theme.colors.primary }]} onPress={() => setCategory(c)}>
                                <Text style={[styles.categoryText, category === c && { color: '#fff' }]}>{c}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.formActions}>
                        <TouchableOpacity style={[styles.formBtn, { backgroundColor: '#999' }]} onPress={() => setShowForm(false)}>
                            <Text style={styles.formBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.formBtn, { backgroundColor: theme.colors.primary }]} onPress={addArea}>
                            <Text style={styles.formBtnText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setShowForm(true)}>
                    <Text style={styles.addBtnText}>+ Agregar Area</Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    totalCard: { borderRadius: 10, padding: 14, marginBottom: 12, alignItems: 'center' },
    totalLabel: { fontSize: 12 },
    totalValue: { fontSize: 22, fontWeight: '700' },
    areaCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 14, marginBottom: 8 },
    areaInfo: { flex: 1 },
    areaName: { fontSize: 15, fontWeight: '600' },
    areaCategory: { fontSize: 12, marginTop: 2 },
    areaRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    areaSize: { fontSize: 14, fontWeight: '600' },
    deleteText: { color: '#f44336', fontSize: 14, fontWeight: '700' },
    formCard: { borderRadius: 10, padding: 16, marginTop: 8 },
    formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
    calcLabel: { fontSize: 13, marginBottom: 10 },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    categoryChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#e0e0e0' },
    categoryText: { fontSize: 12, color: '#333' },
    formActions: { flexDirection: 'row', gap: 10 },
    formBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    formBtnText: { color: '#fff', fontWeight: '600' },
    addBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 12 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 }
});

export default AreasScreen;

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform
} from 'react-native';
import { useOffline } from '../context/OfflineContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { offlineQueue } from '../services/offlineQueue';
import config from '../config';

const INSPECTION_TYPES = [
    { value: 'general', label: 'General' },
    { value: 'estructural', label: 'Estructural' },
    { value: 'electrica', label: 'Electrica' },
    { value: 'hidraulica', label: 'Hidraulica' },
    { value: 'integral', label: 'Integral' },
    { value: 'seguridad', label: 'Seguridad' }
];

const LIMA_DISTRICTS = [
    'Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo',
    'Chorrillos', 'Cieneguilla', 'Comas', 'Agustino', 'Independencia',
    'Jesús María', 'Jesús Nazareno', 'Jockey Plaza', 'Juliaca',
    'La Molina', 'La Victoria', 'Lima', 'Lince', 'Los Olivos',
    'Lurigancho', 'Lurín', 'Magdalena del Mar', 'Magdalena Vieja',
    'Marcona', 'Miraflores', 'Pachacámac', 'Pachacutec', 'Padre Abad',
    'Palca', 'Palestina', 'Parconía', 'Punta Hermosa', 'Punta Negra',
    'Rímac', 'San Bartolo', 'San Borja', 'San Isidro', 'San Martín de Porres',
    'San Miguel', 'Santa Anita', 'Santa María del Mar', 'Santa Rosa',
    'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo'
];

const CreateInspectionScreen = ({ navigation }) => {
    const { isOnline } = useOffline();
    const { user } = useAuth();
    const { theme } = useTheme();

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [inspectors, setInspectors] = useState([]);

    const [form, setForm] = useState({
        projectName: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        district: '',
        address: '',
        inspectionType: 'general',
        scheduledDate: '',
        scheduledTime: '',
        inspectorId: '',
        notes: ''
    });

    const [districtPickerVisible, setDistrictPickerVisible] = useState(false);
    const [typePickerVisible, setTypePickerVisible] = useState(false);
    const [inspectorPickerVisible, setInspectorPickerVisible] = useState(false);

    useEffect(() => {
        fetchInspectors();
    }, []);

    const fetchInspectors = async () => {
        try {
            setLoading(true);
            const api = (await import('../services/api')).default;
            const response = await api.get('/users/inspectors');
            if (response.data.success) {
                setInspectors(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching inspectors:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const validate = () => {
        if (!form.projectName.trim() || form.projectName.trim().length < 3) {
            Alert.alert('Error', 'El nombre del proyecto debe tener al menos 3 caracteres');
            return false;
        }
        if (!form.clientName.trim() || form.clientName.trim().length < 3) {
            Alert.alert('Error', 'El nombre del cliente debe tener al menos 3 caracteres');
            return false;
        }
        if (!form.address.trim() || form.address.trim().length < 5) {
            Alert.alert('Error', 'La direccion debe tener al menos 5 caracteres');
            return false;
        }
        if (!form.scheduledDate.trim()) {
            Alert.alert('Error', 'Selecciona una fecha programada');
            return false;
        }
        if (!form.scheduledTime.trim()) {
            Alert.alert('Error', 'Selecciona una hora programada');
            return false;
        }
        if (!form.inspectorId) {
            Alert.alert('Error', 'Selecciona un inspector');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        try {
            setSubmitting(true);

            const scheduledDateTime = `${form.scheduledDate}T${form.scheduledTime}:00.000Z`;

            const payload = {
                projectName: form.projectName.trim(),
                clientName: form.clientName.trim(),
                clientEmail: form.clientEmail.trim() || undefined,
                clientPhone: form.clientPhone.trim() || undefined,
                address: form.address.trim(),
                city: 'Lima',
                state: form.district || undefined,
                inspectionType: form.inspectionType,
                scheduledDate: scheduledDateTime,
                inspectorId: form.inspectorId,
                notes: form.notes.trim() || undefined
            };

            const result = await offlineQueue.createInspection(payload, isOnline);

            if (result) {
                Alert.alert(
                    'Exito',
                    isOnline
                        ? 'Inspeccion creada exitosamente'
                        : 'Inspeccion guardada localmente. Se sincronizara cuando tengas conexion.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo crear la inspeccion');
            console.error('Create inspection error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const getInspectorLabel = () => {
        if (!form.inspectorId) return 'Seleccionar inspector';
        const insp = inspectors.find((i) => i.id === form.inspectorId);
        return insp ? insp.fullName || insp.email : 'Seleccionar inspector';
    };

    const getTypeLabel = () => {
        const type = INSPECTION_TYPES.find((t) => t.value === form.inspectionType);
        return type ? type.label : 'General';
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.bg }]} contentContainerStyle={styles.content}>
            {!isOnline && (
                <View style={styles.offlineBanner}>
                    <Text style={styles.offlineText}>
                        Sin conexion - La inspeccion se guardara localmente
                    </Text>
                </View>
            )}

            {/* Proyecto */}
            <Text style={[styles.label, { color: theme.colors.text }]}>Nombre del proyecto *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={form.projectName}
                onChangeText={(v) => updateField('projectName', v)}
                placeholder="Ej: Departamento 702 - Miraflores"
            />

            {/* Cliente */}
            <Text style={[styles.label, { color: theme.colors.text }]}>Nombre del cliente *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={form.clientName}
                onChangeText={(v) => updateField('clientName', v)}
                placeholder="Nombre completo"
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>Telefono del cliente</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={form.clientPhone}
                onChangeText={(v) => updateField('clientPhone', v)}
                placeholder="Ej: 987654321"
                keyboardType="phone-pad"
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>Email del cliente</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={form.clientEmail}
                onChangeText={(v) => updateField('clientEmail', v)}
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
            />

            {/* Distrito */}
            <Text style={[styles.label, { color: theme.colors.text }]}>Distrito</Text>
            <TouchableOpacity
                style={[styles.select, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => setDistrictPickerVisible(!districtPickerVisible)}
            >
                <Text style={form.district ? [styles.selectText, { color: theme.colors.text }] : [styles.selectPlaceholder, { color: theme.colors.textMuted }]}>
                    {form.district || 'Seleccionar distrito'}
                </Text>
            </TouchableOpacity>
            {districtPickerVisible && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                        {LIMA_DISTRICTS.map((d) => (
                            <TouchableOpacity
                                key={d}
                                style={[
                                    styles.pickerItem,
                                    form.district === d && styles.pickerItemSelected
                                ]}
                                onPress={() => {
                                    updateField('district', d);
                                    setDistrictPickerVisible(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.pickerItemText,
                                        { color: theme.colors.text },
                                        form.district === d && [styles.pickerItemTextSelected, { color: theme.colors.primary }]
                                    ]}
                                >
                                    {d}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Direccion */}
            <Text style={[styles.label, { color: theme.colors.text }]}>Direccion exacta *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={form.address}
                onChangeText={(v) => updateField('address', v)}
                placeholder="Av. Larco 123, Miraflores"
            />

            {/* Tipo de inspeccion */}
            <Text style={[styles.label, { color: theme.colors.text }]}>Tipo de inspeccion *</Text>
            <TouchableOpacity
                style={[styles.select, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => setTypePickerVisible(!typePickerVisible)}
            >
                <Text style={[styles.selectText, { color: theme.colors.text }]}>{getTypeLabel()}</Text>
            </TouchableOpacity>
            {typePickerVisible && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    {INSPECTION_TYPES.map((t) => (
                        <TouchableOpacity
                            key={t.value}
                            style={[
                                styles.pickerItem,
                                form.inspectionType === t.value && styles.pickerItemSelected
                            ]}
                            onPress={() => {
                                updateField('inspectionType', t.value);
                                setTypePickerVisible(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.pickerItemText,
                                    { color: theme.colors.text },
                                    form.inspectionType === t.value && [styles.pickerItemTextSelected, { color: theme.colors.primary }]
                                ]}
                            >
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Fecha y hora */}
            <Text style={[styles.label, { color: theme.colors.text }]}>Fecha programada *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={form.scheduledDate}
                onChangeText={(v) => updateField('scheduledDate', v)}
                placeholder="YYYY-MM-DD"
            />

            <Text style={[styles.label, { color: theme.colors.text }]}>Hora programada *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={form.scheduledTime}
                onChangeText={(v) => updateField('scheduledTime', v)}
                placeholder="HH:MM"
            />

            {/* Inspector */}
            <Text style={[styles.label, { color: theme.colors.text }]}>Inspector asignado *</Text>
            <TouchableOpacity
                style={[styles.select, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => setInspectorPickerVisible(!inspectorPickerVisible)}
                disabled={loading}
            >
                <Text style={form.inspectorId ? [styles.selectText, { color: theme.colors.text }] : [styles.selectPlaceholder, { color: theme.colors.textMuted }]}>
                    {loading ? 'Cargando inspectores...' : getInspectorLabel()}
                </Text>
            </TouchableOpacity>
            {inspectorPickerVisible && (
                <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                        {inspectors.map((insp) => (
                            <TouchableOpacity
                                key={insp.id}
                                style={[
                                    styles.pickerItem,
                                    form.inspectorId === insp.id && styles.pickerItemSelected
                                ]}
                                onPress={() => {
                                    updateField('inspectorId', insp.id);
                                    setInspectorPickerVisible(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.pickerItemText,
                                        { color: theme.colors.text },
                                        form.inspectorId === insp.id && [styles.pickerItemTextSelected, { color: theme.colors.primary }]
                                    ]}
                                >
                                    {insp.fullName || insp.email}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Notas */}
            <Text style={[styles.label, { color: theme.colors.text }]}>Notas adicionales</Text>
            <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                value={form.notes}
                onChangeText={(v) => updateField('notes', v)}
                placeholder="Observaciones adicionales..."
                multiline
                numberOfLines={3}
            />

            {/* Submit */}
            <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.colors.primary }, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitText}>
                        {isOnline ? 'Crear Inspeccion' : 'Guardar Localmente'}
                    </Text>
                )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    content: {
        padding: 16
    },
    offlineBanner: {
        backgroundColor: '#fff3e0',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800'
    },
    offlineText: {
        color: '#e65100',
        fontSize: 13,
        fontWeight: '500'
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
        marginTop: 12
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#333'
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top'
    },
    select: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12
    },
    selectText: {
        fontSize: 15,
        color: '#333'
    },
    selectPlaceholder: {
        fontSize: 15,
        color: '#999'
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderTopWidth: 0,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        maxHeight: 200
    },
    pickerScroll: {
        maxHeight: 200
    },
    pickerItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    pickerItemSelected: {
        backgroundColor: '#e8f5e9'
    },
    pickerItemText: {
        fontSize: 14,
        color: '#333'
    },
    pickerItemTextSelected: {
        color: '#2e7d32',
        fontWeight: '600'
    },
    submitBtn: {
        backgroundColor: '#1a237e',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 24
    },
    submitBtnDisabled: {
        opacity: 0.6
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700'
    }
});

export default CreateInspectionScreen;

import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = ({ navigation }) => {
    const { user, updateUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            setPhone(user.phone || '');
        }
    }, [user]);

    const saveProfile = async () => {
        if (!firstName.trim()) {
            Alert.alert('Error', 'El nombre es requerido');
            return;
        }

        setSaving(true);
        try {
            await updateUser({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() });
            setEditing(false);
            Alert.alert('Exito', 'Perfil actualizado');
        } catch (error) {
            Alert.alert('Error', 'No se pudo actualizar el perfil');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </Text>
                </View>
                <Text style={styles.email}>{user?.email}</Text>
                <View style={[styles.roleBadge, { backgroundColor: user?.role === 'admin' ? '#1a237e' : '#4caf50' }]}>
                    <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                    style={[styles.input, !editing && styles.inputDisabled]}
                    value={firstName}
                    onChangeText={setFirstName}
                    editable={editing}
                />

                <Text style={styles.label}>Apellido</Text>
                <TextInput
                    style={[styles.input, !editing && styles.inputDisabled]}
                    value={lastName}
                    onChangeText={setLastName}
                    editable={editing}
                />

                <Text style={styles.label}>Telefono</Text>
                <TextInput
                    style={[styles.input, !editing && styles.inputDisabled]}
                    value={phone}
                    onChangeText={setPhone}
                    editable={editing}
                    keyboardType="phone-pad"
                />

                {editing ? (
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setFirstName(user?.firstName || ''); setLastName(user?.lastName || ''); setPhone(user?.phone || ''); }}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                        <Text style={styles.editBtnText}>Editar Perfil</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { backgroundColor: '#1a237e', padding: 24, alignItems: 'center' },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
    email: { fontSize: 14, color: '#fff', opacity: 0.8, marginBottom: 8 },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    form: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, elevation: 2 },
    label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#e0e0e0' },
    inputDisabled: { backgroundColor: '#fff', borderColor: 'transparent' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center' },
    cancelBtnText: { color: '#666', fontWeight: '600' },
    saveBtn: { flex: 1, backgroundColor: '#1a237e', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700' },
    editBtn: { backgroundColor: '#1a237e', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    editBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});

export default ProfileScreen;

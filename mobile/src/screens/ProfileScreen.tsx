import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { createStyles } from '../utils/sharedStyles';

const ProfileScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);
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
            <View style={[localStyles.header, { backgroundColor: theme.colors.primary }]}>
                <View style={localStyles.avatar}>
                    <Text style={localStyles.avatarText}>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </Text>
                </View>
                <Text style={localStyles.email}>{user?.email}</Text>
                <View style={[localStyles.roleBadge, { backgroundColor: user?.role === 'admin' ? theme.colors.primary : theme.colors.success }]}>
                    <Text style={localStyles.roleText}>{user?.role?.toUpperCase()}</Text>
                </View>
            </View>

            <View style={[localStyles.form, { backgroundColor: theme.colors.card }]}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                    style={[styles.input, !editing && localStyles.inputDisabled, !editing && { backgroundColor: theme.colors.card }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    editable={editing}
                />

                <Text style={styles.label}>Apellido</Text>
                <TextInput
                    style={[styles.input, !editing && localStyles.inputDisabled, !editing && { backgroundColor: theme.colors.card }]}
                    value={lastName}
                    onChangeText={setLastName}
                    editable={editing}
                />

                <Text style={styles.label}>Telefono</Text>
                <TextInput
                    style={[styles.input, !editing && localStyles.inputDisabled, !editing && { backgroundColor: theme.colors.card }]}
                    value={phone}
                    onChangeText={setPhone}
                    editable={editing}
                    keyboardType="phone-pad"
                />

                {editing ? (
                    <View style={localStyles.actions}>
                        <TouchableOpacity style={[localStyles.cancelBtn, { borderColor: theme.colors.border }]} onPress={() => { setEditing(false); setFirstName(user?.firstName || ''); setLastName(user?.lastName || ''); setPhone(user?.phone || ''); }}>
                            <Text style={[localStyles.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[localStyles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={saveProfile} disabled={saving}>
                            {saving ? <ActivityIndicator color={theme.colors.textOnPrimary} /> : <Text style={localStyles.saveBtnText}>Guardar</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={[localStyles.editBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setEditing(true)}>
                        <Text style={localStyles.editBtnText}>Editar Perfil</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
};

const localStyles = StyleSheet.create({
    header: { padding: 24, alignItems: 'center' },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
    email: { fontSize: 14, color: '#fff', opacity: 0.8, marginBottom: 8 },
    roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    form: { margin: 16, borderRadius: 12, padding: 16, elevation: 2 },
    inputDisabled: { borderColor: 'transparent' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
    cancelBtnText: { fontWeight: '600' },
    saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700' },
    editBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
    editBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});

export default ProfileScreen;

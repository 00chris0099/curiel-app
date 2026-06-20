import React, { useState } from 'react';
import {
    View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';

const SettingsScreen = ({ navigation }) => {
    const { user, logout } = useAuth();
    const { isOnline, pendingCount } = useOffline();
    const [autoSync, setAutoSync] = useState(true);
    const [autoSave, setAutoSave] = useState(true);

    const handleLogout = () => {
        Alert.alert(
            'Cerrar Sesion',
            'Estas seguro que deseas cerrar sesion?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cerrar Sesion',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await logout();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo cerrar sesion');
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cuenta</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user?.email}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nombre</Text>
                    <Text style={styles.infoValue}>{user?.firstName} {user?.lastName}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Rol</Text>
                    <Text style={styles.infoValue}>{user?.role}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Conexion</Text>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Estado</Text>
                    <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4caf50' : '#f44336' }]} />
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Pendientes de sync</Text>
                    <Text style={styles.infoValue}>{pendingCount}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferencias</Text>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Sincronizacion automatica</Text>
                    <Switch
                        value={autoSync}
                        onValueChange={setAutoSync}
                        trackColor={{ false: '#ccc', true: '#1a237e' }}
                    />
                </View>
                <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Auto-guardado</Text>
                    <Switch
                        value={autoSave}
                        onValueChange={setAutoSave}
                        trackColor={{ false: '#ccc', true: '#1a237e' }}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.navRow}
                    onPress={() => navigation.navigate('OfflineStatus')}
                >
                    <Text style={styles.navLabel}>Estado Offline</Text>
                    <Text style={styles.navArrow}>{'>'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Cerrar Sesion</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>CURIEL v1.0.0</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    section: { backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, elevation: 2 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    infoLabel: { fontSize: 14, color: '#666' },
    infoValue: { fontSize: 14, color: '#333', fontWeight: '500' },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    switchLabel: { fontSize: 14, color: '#333' },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    navLabel: { fontSize: 14, color: '#1a237e', fontWeight: '600' },
    navArrow: { fontSize: 14, color: '#999' },
    logoutBtn: { backgroundColor: '#f44336', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    footer: { padding: 24, alignItems: 'center' },
    footerText: { fontSize: 12, color: '#999' }
});

export default SettingsScreen;

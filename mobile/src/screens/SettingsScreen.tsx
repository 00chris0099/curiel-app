import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';

const SETTINGS_KEYS = {
    AUTO_SYNC: '@curiel:settings:auto_sync',
    AUTO_SAVE: '@curiel:settings:auto_save',
};

const SettingsScreen = ({ navigation }) => {
    const { user, logout } = useAuth();
    const { isOnline, pendingCount } = useOffline();
    const { theme } = useTheme();
    const [autoSync, setAutoSync] = useState(true);
    const [autoSave, setAutoSave] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const syncVal = await AsyncStorage.getItem(SETTINGS_KEYS.AUTO_SYNC);
            const saveVal = await AsyncStorage.getItem(SETTINGS_KEYS.AUTO_SAVE);
            if (syncVal !== null) setAutoSync(syncVal === 'true');
            if (saveVal !== null) setAutoSave(saveVal === 'true');
        } catch {}
    };

    const toggleAutoSync = async (value) => {
        setAutoSync(value);
        try { await AsyncStorage.setItem(SETTINGS_KEYS.AUTO_SYNC, String(value)); } catch {}
    };

    const toggleAutoSave = async (value) => {
        setAutoSave(value);
        try { await AsyncStorage.setItem(SETTINGS_KEYS.AUTO_SAVE, String(value)); } catch {}
    };

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
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Cuenta</Text>
                <View style={[styles.infoRow, { borderBottomColor: theme.colors.borderLight }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Email</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user?.email}</Text>
                </View>
                <View style={[styles.infoRow, { borderBottomColor: theme.colors.borderLight }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Nombre</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user?.firstName} {user?.lastName}</Text>
                </View>
                <View style={[styles.infoRow, { borderBottomColor: theme.colors.borderLight }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Rol</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{user?.role}</Text>
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Conexion</Text>
                <View style={[styles.infoRow, { borderBottomColor: theme.colors.borderLight }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Estado</Text>
                    <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.colors.success : theme.colors.error }]} />
                </View>
                <View style={[styles.infoRow, { borderBottomColor: theme.colors.borderLight }]}>
                    <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Pendientes de sync</Text>
                    <Text style={[styles.infoValue, { color: theme.colors.text }]}>{pendingCount}</Text>
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preferencias</Text>
                <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Sincronizacion automatica</Text>
                    <Switch
                        value={autoSync}
                        onValueChange={toggleAutoSync}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    />
                </View>
                <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Auto-guardado</Text>
                    <Switch
                        value={autoSave}
                        onValueChange={toggleAutoSave}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    />
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <TouchableOpacity
                    style={styles.navRow}
                    onPress={() => navigation.navigate('OfflineStatus')}
                >
                    <Text style={[styles.navLabel, { color: theme.colors.primary }]}>Estado Offline</Text>
                    <Text style={[styles.navArrow, { color: theme.colors.textMuted }]}>{'>'}</Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.colors.error }]} onPress={handleLogout}>
                    <Text style={styles.logoutBtnText}>Cerrar Sesion</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>CURIEL v1.0.0</Text>
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

import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert
} from 'react-native';
import { useOffline } from '../context/OfflineContext';
import { useAuth } from '../context/AuthContext';
import { inspectionsRepo } from '../database/inspections.repo';
import { areasRepo } from '../database/areas.repo';
import { observationsRepo } from '../database/observations.repo';
import { photosRepo } from '../database/photos.repo';
import { offlineQueue } from '../services/offlineQueue';
import { useTheme } from '../context/ThemeContext';

const MODULES = [
    { id: 'edificio', title: 'Edificio', icon: '🏢', color: '#1a237e' },
    { id: 'plano', title: 'Foto Plano', icon: '📐', color: '#0d47a1' },
    { id: 'areas', title: 'Areas', icon: '📏', color: '#1565c0' },
    { id: 'obs_metrica', title: 'Obs. Metrica', icon: '📝', color: '#1976d2' },
    { id: 'observaciones', title: 'Observaciones', icon: '👁️', color: '#1e88e5' },
    { id: 'consideraciones', title: 'Consideraciones', icon: '💬', color: '#2196f3' },
];

const ExecutionScreen = ({ route, navigation }) => {
    const { inspectionId } = route.params;
    const { isOnline, isSyncing } = useOffline();
    const { user } = useAuth();
    const { theme } = useTheme();
    const [inspection, setInspection] = useState(null);
    const [areas, setAreas] = useState([]);
    const [observations, setObservations] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        loadData();
    }, [inspectionId]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });
        return unsubscribe;
    }, [navigation]);

    const loadData = async () => {
        try {
            let local = await inspectionsRepo.getById(inspectionId);
            setInspection(local);
            const localAreas = await areasRepo.getByInspection(inspectionId);
            setAreas(localAreas);
            const localObs = await observationsRepo.getByInspection(inspectionId);
            setObservations(localObs);
            const localPhotos = await photosRepo.getByInspection(inspectionId);
            setPhotos(localPhotos);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar la inspeccion');
        } finally {
            setLoading(false);
        }
    };

    const getModuleCount = (moduleId) => {
        switch (moduleId) {
            case 'edificio':
                return photos.filter(p => p.type === 'edificio').length;
            case 'plano':
                return photos.filter(p => p.type === 'plano').length;
            case 'areas':
                return areas.length;
            case 'obs_metrica':
                return observations.filter(o => o.type === 'metrico').length;
            case 'observaciones':
                return observations.length;
            case 'consideraciones':
                return 0;
            default:
                return 0;
        }
    };

    const getModuleRoute = (moduleId) => {
        switch (moduleId) {
            case 'edificio':
                return 'ModuleEdificio';
            case 'plano':
                return 'ModuleFotoPlano';
            case 'areas':
                return 'ModuleAreas';
            case 'obs_metrica':
                return 'ModuleObsMetrica';
            case 'observaciones':
                return 'ModuleObservaciones';
            case 'consideraciones':
                return 'ModuleConsideraciones';
            default:
                return null;
        }
    };

    const handleModulePress = (moduleId) => {
        const route = getModuleRoute(moduleId);
        if (route) {
            navigation.navigate(route, { inspectionId });
        }
    };

    const completeInspection = async () => {
        if (areas.length === 0) {
            Alert.alert('Error', 'Debe registrar al menos un area');
            return;
        }

        if (!isOnline) {
            Alert.alert(
                'Sin conexion',
                'La inspeccion se completara cuando vuelva la conexion.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Marcar para completar',
                        onPress: async () => {
                            await offlineQueue.saveInspection(
                                { ...inspection, status: 'en_proceso', readyToComplete: true },
                                false
                            );
                            setInspection({ ...inspection, readyToComplete: true });
                            Alert.alert('Marcado', 'Se completara automaticamente al sincronizar');
                        }
                    }
                ]
            );
            return;
        }

        Alert.alert(
            'Completar Inspeccion',
            'La inspeccion pasara a "lista_revision". Continuar?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Completar',
                    onPress: async () => {
                        setCompleting(true);
                        try {
                            await offlineQueue.saveInspection(
                                { ...inspection, status: 'lista_revision', readyToComplete: false },
                                true
                            );
                            await inspectionsRepo.upsert({
                                ...inspection,
                                status: 'lista_revision',
                                readyToComplete: false,
                                is_dirty: 0
                            });
                            Alert.alert('Exito', 'Inspeccion completada');
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo completar');
                        } finally {
                            setCompleting(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return <View style={[styles.center, { backgroundColor: theme.colors.bg }]}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{inspection?.projectName}</Text>
                    <View style={styles.onlineRow}>
                        <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#4caf50' : '#f44336' }]} />
                        <Text style={[styles.onlineText, { color: theme.colors.textSecondary }]}>{isOnline ? 'Online' : 'Offline'}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.completeBtn, completing && styles.disabledBtn]}
                    onPress={completeInspection}
                    disabled={completing || isSyncing}
                >
                    {completing ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.completeBtnText}>Completar</Text>
                    )}
                </TouchableOpacity>
            </View>

            {isSyncing && (
                <View style={[styles.syncBanner, { backgroundColor: theme.colors.warning }]}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.syncBannerText}>Sincronizando...</Text>
                </View>
            )}

            {/* Module Grid */}
            <ScrollView style={styles.scroll} contentContainerStyle={styles.gridContainer}>
                <View style={styles.grid}>
                    {MODULES.map((mod) => {
                        const count = getModuleCount(mod.id);
                        return (
                            <TouchableOpacity
                                key={mod.id}
                                style={[styles.moduleCard, { backgroundColor: theme.colors.card }]}
                                onPress={() => handleModulePress(mod.id)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.moduleIcon}>{mod.icon}</Text>
                                <Text style={[styles.moduleTitle, { color: theme.colors.text }]} numberOfLines={1}>{mod.title}</Text>
                                {count > 0 && (
                                    <View style={[styles.moduleBadge, { backgroundColor: mod.color }]}>
                                        <Text style={styles.moduleBadgeText}>{count}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        elevation: 2
    },
    headerLeft: { flex: 1 },
    title: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    onlineDot: { width: 8, height: 8, borderRadius: 4 },
    onlineText: { fontSize: 11 },
    completeBtn: {
        backgroundColor: '#4caf50',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8
    },
    completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    disabledBtn: { opacity: 0.5 },
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 8
    },
    syncBannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    scroll: { flex: 1 },
    gridContainer: { padding: 16 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    moduleCard: {
        width: '47%',
        aspectRatio: 1,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3
    },
    moduleIcon: { fontSize: 36, marginBottom: 8 },
    moduleTitle: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
    moduleBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#1a237e',
        borderRadius: 10,
        minWidth: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6
    },
    moduleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' }
});

export default ExecutionScreen;

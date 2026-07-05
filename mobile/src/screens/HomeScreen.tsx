import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';
import { getStatusThemeColor, getStatusLabel } from '../utils/colors';
import { inspectionService } from '../services/api';
import { inspectionsRepo } from '../database/inspections.repo';
import { SyncButton } from '../components/SyncButton';
import { LoadingScreen } from '../components/VideoSplashScreen';

const HomeScreen = ({ navigation }) => {
    const { user, logout } = useAuth();
    const { isOnline, pendingCount } = useOffline();
    const { theme, isDark } = useTheme();
    const [inspections, setInspections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        pendiente: 0,
        en_proceso: 0,
        finalizada: 0
    });

    useEffect(() => {
        loadInspections();
    }, []);

    const loadInspections = async () => {
        try {
            // Always try local cache first, filtered by inspector if applicable
            const inspectorFilter = user?.role === 'inspector' ? user.id : null;
            const localData = inspectorFilter
                ? await inspectionsRepo.getAllByInspector(inspectorFilter)
                : await inspectionsRepo.getAll();
            if (localData.length > 0) {
                setInspections(localData);
                updateStats(localData);
            }

            // If online, refresh from server and update cache
            if (isOnline) {
                try {
                    const response = await inspectionService.getAll();
                    if (response.success) {
                        const data = response.data.inspections;
                        setInspections(data);
                        updateStats(data);
                        // Update local cache
                        await inspectionsRepo.upsertMany(data);
                    }
                } catch {
                    // Use cached data if API fails
                }
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar las inspecciones');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const updateStats = (data) => {
        setStats({
            total: data.length,
            pendiente: data.filter(i => i.status === 'pendiente').length,
            en_proceso: data.filter(i => i.status === 'en_proceso').length,
            finalizada: data.filter(i => i.status === 'finalizada').length
        });
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadInspections();
    };

    const getStatusColor = (status) => getStatusThemeColor(status, isDark);

    const renderInspectionItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.card, shadowColor: theme.colors.shadow }]}
            onPress={() => navigation.navigate('InspectionDetail', { inspectionId: item.id })}
        >
            {/* Bloque 1: Info principal */}
            <View style={styles.cardMain}>
                <Text style={[styles.projectName, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.projectName}
                </Text>
                <Text style={[styles.address, { color: theme.colors.textMuted }]} numberOfLines={1}>
                    {item.address}
                </Text>
                <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
                    {new Date(item.scheduledDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
            </View>

            {/* Bloque 2: Inspector + Estado */}
            <View style={[styles.cardMeta, { borderTopColor: theme.colors.divider }]}>
                <Text style={[styles.inspector, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {item.inspector?.firstName} {item.inspector?.lastName}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.headerBg }]}>
                <View style={styles.headerTop}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.welcomeText, { color: theme.colors.headerText }]}>Hola, {user?.firstName}!</Text>
                        <View style={styles.onlineRow}>
                            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#4caf50' : '#f44336' }]} />
                            <Text style={[styles.onlineText, { color: theme.colors.headerText, opacity: 0.8 }]}>
                                {isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                            <Text style={styles.logoutBtnText}>Salir</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
                <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{stats.total}</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.statNumber, { color: getStatusThemeColor('pendiente', isDark) }]}>{stats.pendiente}</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Pendientes</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.statNumber, { color: getStatusThemeColor('en_proceso', isDark) }]}>{stats.en_proceso}</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>En Proceso</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.statNumber, { color: getStatusThemeColor('finalizada', isDark) }]}>{stats.finalizada}</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Finalizadas</Text>
                </View>
            </View>

            {/* Sync bar */}
            {pendingCount > 0 && (
                <View style={[styles.syncBar, { backgroundColor: theme.colors.warningBg }]}>
                    <Text style={[styles.syncText, { color: theme.colors.warning }]}>{pendingCount} item(s) pendientes de sincronizar</Text>
                    <SyncButton />
                </View>
            )}

            {/* Lista de inspecciones */}
            <View style={styles.listHeader}>
                <Text style={[styles.listTitle, { color: theme.colors.text }]}>Mis Inspecciones</Text>
                {!isOnline && <Text style={[styles.offlineNote, { color: theme.colors.warning }]}>Modo offline - mostrando cache local</Text>}
            </View>

            <FlatList
                data={inspections}
                renderItem={renderInspectionItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={8}
                getItemLayout={(data, index) => (
                    { length: 120, offset: 120 * index, index }
                )}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No hay inspecciones disponibles</Text>
                    </View>
                }
            />

            {/* Botón flotante para crear (solo Admin/Arquitecto) */}
            {(user?.role === 'admin' || user?.role === 'arquitecto') && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: theme.colors.fab, shadowColor: theme.colors.shadow }]}
                    onPress={() => navigation.navigate('CreateInspection')}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    header: {
        backgroundColor: '#1a237e',
        padding: 20,
        paddingTop: 48
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerLeft: {
        flex: 1
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4
    },
    onlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    onlineDot: {
        width: 10,
        height: 10,
        borderRadius: 5
    },
    onlineText: {
        fontSize: 12,
        color: '#fff',
        opacity: 0.8
    },
    logoutBtn: {
        backgroundColor: 'rgba(244,67,54,0.8)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8
    },
    logoutBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600'
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 10
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a237e',
        marginBottom: 2
    },
    statLabel: {
        fontSize: 11,
        color: '#666'
    },
    listHeader: {
        padding: 16,
        paddingBottom: 8
    },
    listTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333'
    },
    offlineNote: {
        fontSize: 12,
        color: '#ff9800',
        marginTop: 2
    },
    syncBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff3e0',
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 10,
        borderRadius: 8
    },
    syncText: {
        fontSize: 12,
        color: '#e65100',
        flex: 1
    },
    listContainer: {
        padding: 16,
        paddingTop: 8
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2
    },
    cardMain: {
        marginBottom: 10
    },
    projectName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
        marginBottom: 3
    },
    address: {
        fontSize: 13,
        color: '#999',
        marginBottom: 3
    },
    date: {
        fontSize: 12,
        color: '#666'
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    inspector: {
        fontSize: 13,
        color: '#666',
        flex: 1
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10
    },
    statusText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600'
    },
    emptyContainer: {
        padding: 48,
        alignItems: 'center'
    },
    emptyText: {
        fontSize: 16,
        color: '#999'
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#1a237e',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6
    },
    fabText: {
        fontSize: 28,
        color: '#fff',
        fontWeight: '300'
    }
});

export default HomeScreen;

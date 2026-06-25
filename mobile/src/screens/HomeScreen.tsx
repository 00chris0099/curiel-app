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
import { OfflineBadge } from '../components/OfflineBadge';
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
            <View style={styles.cardHeader}>
                <Text style={[styles.projectName, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.projectName}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                </View>
            </View>

            <Text style={[styles.clientName, { color: theme.colors.textSecondary }]}>{item.clientName}</Text>
            <Text style={[styles.address, { color: theme.colors.textMuted }]} numberOfLines={1}>{item.address}</Text>

            <View style={[styles.cardFooter, { borderTopColor: theme.colors.divider }]}>
                <Text style={[styles.inspector, { color: theme.colors.textSecondary }]}>
                    Inspector: {item.inspector?.firstName} {item.inspector?.lastName}
                </Text>
                <Text style={[styles.date, { color: theme.colors.textMuted }]}>
                    {new Date(item.scheduledDate).toLocaleDateString('es-ES')}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
            {/* Header con estadísticas */}
            <View style={[styles.header, { backgroundColor: theme.colors.headerBg }]}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={[styles.welcomeText, { color: theme.colors.headerText }]}>Hola, {user?.firstName}!</Text>
                        <Text style={[styles.roleText, { color: theme.colors.headerText, opacity: 0.8 }]}>{user?.role?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <OfflineBadge />
                        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }]} onPress={() => navigation.navigate('Profile')}>
                            <Text style={[styles.headerBtnText, { color: theme.colors.headerText }]}>Perfil</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }]} onPress={() => navigation.navigate('Settings')}>
                            <Text style={[styles.headerBtnText, { color: theme.colors.headerText }]}>Config</Text>
                        </TouchableOpacity>
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
        padding: 24,
        paddingTop: 48
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    headerBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    headerBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600'
    },
    logoutBtn: {
        backgroundColor: 'rgba(244,67,54,0.8)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    logoutBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600'
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4
    },
    roleText: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a237e',
        marginBottom: 4
    },
    statLabel: {
        fontSize: 12,
        color: '#666'
    },
    listHeader: {
        padding: 16,
        paddingBottom: 8
    },
    listTitle: {
        fontSize: 18,
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
        padding: 12,
        borderRadius: 8
    },
    syncText: {
        fontSize: 13,
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
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    projectName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginRight: 8
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600'
    },
    clientName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4
    },
    address: {
        fontSize: 13,
        color: '#999',
        marginBottom: 12
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    inspector: {
        fontSize: 13,
        color: '#666'
    },
    date: {
        fontSize: 13,
        color: '#999'
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
        right: 24,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1a237e',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8
    },
    fabText: {
        fontSize: 32,
        color: '#fff',
        fontWeight: '300'
    }
});

export default HomeScreen;

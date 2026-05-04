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
import { inspectionService } from '../services/api';

const HomeScreen = ({ navigation }) => {
    const { user } = useAuth();
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
            const response = await inspectionService.getAll();

            if (response.success) {
                const data = response.data.inspections;
                setInspections(data);

                // Calcular estadísticas
                const newStats = {
                    total: data.length,
                    pendiente: data.filter(i => i.status === 'pendiente').length,
                    en_proceso: data.filter(i => i.status === 'en_proceso').length,
                    finalizada: data.filter(i => i.status === 'finalizada').length
                };
                setStats(newStats);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar las inspecciones');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadInspections();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pendiente': return '#ff9800';
            case 'en_proceso': return '#2196f3';
            case 'finalizada': return '#4caf50';
            case 'cancelada': return '#f44336';
            default: return '#999';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pendiente': return 'Pendiente';
            case 'en_proceso': return 'En Proceso';
            case 'finalizada': return 'Finalizada';
            case 'cancelada': return 'Cancelada';
            default: return status;
        }
    };

    const renderInspectionItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('InspectionDetail', { inspectionId: item.id })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.projectName} numberOfLines={1}>
                    {item.projectName}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                </View>
            </View>

            <Text style={styles.clientName}>{item.clientName}</Text>
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>

            <View style={styles.cardFooter}>
                <Text style={styles.inspector}>
                    Inspector: {item.inspector?.firstName} {item.inspector?.lastName}
                </Text>
                <Text style={styles.date}>
                    {new Date(item.scheduledDate).toLocaleDateString('es-ES')}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1a237e" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header con estadísticas */}
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Hola, {user?.firstName}!</Text>
                <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#ff9800' }]}>{stats.pendiente}</Text>
                    <Text style={styles.statLabel}>Pendientes</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#2196f3' }]}>{stats.en_proceso}</Text>
                    <Text style={styles.statLabel}>En Proceso</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#4caf50' }]}>{stats.finalizada}</Text>
                    <Text style={styles.statLabel}>Finalizadas</Text>
                </View>
            </View>

            {/* Lista de inspecciones */}
            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Mis Inspecciones</Text>
            </View>

            <FlatList
                data={inspections}
                renderItem={renderInspectionItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No hay inspecciones disponibles</Text>
                    </View>
                }
            />

            {/* Botón flotante para crear (solo Admin/Arquitecto) */}
            {(user?.role === 'admin' || user?.role === 'arquitecto') && (
                <TouchableOpacity
                    style={styles.fab}
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

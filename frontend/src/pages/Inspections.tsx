import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, ClipboardCheck, Database } from 'lucide-react';
import { Loader } from '../components/Loader';
import { getApiErrorMessage } from '../api/axios';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import toast from 'react-hot-toast';
import type { Inspection, InspectionStatus } from '../types';
import { getInspectionLocationLabel, getInspectionServiceLabel, getInspectorName } from '../utils/inspectionMetadata';
import { inspectionStatusBadgeClasses, inspectionStatusLabels } from '../utils/inspectionStatus';
import { saveCachedInspections, getCachedInspections } from '../utils/offlineDb';

export const Inspections = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { effectiveOnline } = useOnlineStatus();
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InspectionStatus | ''>('');
    const [isOfflineData, setIsOfflineData] = useState(false);

    const loadInspections = useCallback(async () => {
        setIsOfflineData(false);

        if (effectiveOnline) {
            try {
                const filters = statusFilter ? { status: statusFilter } : {};
                const response = await inspectionService.getInspections(filters);
                setInspections(response.data);
                // Cache inspections for offline use
                await saveCachedInspections(response.data);
            } catch (error: unknown) {
                // If API fails, try to load from cache
                const cached = await getCachedInspections();
                if (cached && cached.length > 0) {
                    setInspections(cached.map(c => c.data));
                    setIsOfflineData(true);
                    toast.success('Mostrando datos guardados offline');
                } else {
                    toast.error(getApiErrorMessage(error, 'Error al cargar inspecciones'));
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            // Offline: load from cache
            try {
                const cached = await getCachedInspections();
                if (cached && cached.length > 0) {
                    setInspections(cached.map(c => c.data));
                    setIsOfflineData(true);
                }
            } catch (error) {
                toast.error('Error al cargar datos locales');
            } finally {
                setIsLoading(false);
            }
        }
    }, [effectiveOnline, statusFilter]);

    useEffect(() => {
        loadInspections();
    }, [loadInspections]);

    // Filtro local por búsqueda
    const filteredInspections = inspections.filter((inspection) => {
        const query = searchTerm.toLowerCase();
        const serviceLabel = getInspectionServiceLabel(inspection).toLowerCase();
        const locationLabel = getInspectionLocationLabel(inspection).toLowerCase();

        return inspection.projectName.toLowerCase().includes(query)
            || inspection.clientName.toLowerCase().includes(query)
            || serviceLabel.includes(query)
            || locationLabel.includes(query);
    });

    if (isLoading) {
        return <Loader fullScreen />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">Inspecciones</h1>
                        {isOfflineData && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                                <Database className="w-3 h-3" />
                                Datos offline
                            </span>
                        )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Gestión de inspecciones de departamentos en Lima
                    </p>
                </div>

                {(user?.role === 'admin' || user?.role === 'arquitecto') && (
                    <button
                        onClick={() => navigate('/inspections/create')}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Inspección
                    </button>
                )}
            </div>

            {/* Show offline warning if no data available */}
            {!isLoading && inspections.length === 0 && !effectiveOnline && (
                <div className="card text-center py-12">
                    <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay inspecciones guardadas offline</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Abre la lista con internet al menos una vez para guardar los datos localmente.
                    </p>
                </div>
            )}

            {inspections.length > 0 && (
                <>
                    {/* Filtros */}
                    <div className="card">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Búsqueda */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Buscar</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Servicio, cliente o distrito..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="input pl-10"
                                    />
                                </div>
                            </div>

                            {/* Filtro por estado */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Estado</label>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as InspectionStatus | '')}
                                        className="input pl-10"
                                    >
                                        <option value="">Todos los estados</option>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_proceso">En Proceso</option>
                                        <option value="lista_revision">Lista para revisión</option>
                                        <option value="finalizada">Finalizada</option>
                                        <option value="cancelada">Cancelada</option>
                                        <option value="reprogramada">Reprogramada</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de inspecciones */}
                    <div className="card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            Inmueble
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            Cliente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            Servicio
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            Fecha Programada
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            Inspector
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredInspections.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                No se encontraron inspecciones
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInspections.map((inspection) => (
                                            <tr key={inspection.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 font-medium">
                                                    <div>
                                                        <p>{inspection.projectName}</p>
                                                        <p className="mt-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                                                            {getInspectionLocationLabel(inspection)}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {inspection.clientName}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getInspectionServiceLabel(inspection)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`badge ${inspectionStatusBadgeClasses[inspection.status]}`}>
                                                        {inspectionStatusLabels[inspection.status]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {new Date(inspection.scheduledDate).toLocaleDateString('es-ES')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getInspectorName(inspection)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => navigate(`/inspections/${inspection.id}/execute`)}
                                                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                                            title="Ejecutar inspección"
                                                        >
                                                            <ClipboardCheck className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/inspections/${inspection.id}`)}
                                                            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                                                            title="Ver detalle"
                                                        >
                                                            <Eye className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

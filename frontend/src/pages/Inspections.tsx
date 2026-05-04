import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye } from 'lucide-react';
import { Loader } from '../components/Loader';
import { getApiErrorMessage } from '../api/axios';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import type { Inspection, InspectionStatus } from '../types';

export const Inspections = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InspectionStatus | ''>('');

    const loadInspections = useCallback(async () => {
        try {
            const filters = statusFilter ? { status: statusFilter } : {};
            const response = await inspectionService.getInspections(filters);
            setInspections(response.data);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar inspecciones'));
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        loadInspections();
    }, [loadInspections]);

    // Filtro local por búsqueda
    const filteredInspections = inspections.filter((inspection) =>
        inspection.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inspection.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statusColors: Record<string, string> = {
        pendiente: 'badge-warning',
        en_proceso: 'badge-info',
        finalizada: 'badge-success',
        cancelada: 'badge-danger',
    };

    const statusLabels: Record<string, string> = {
        pendiente: 'Pendiente',
        en_proceso: 'En Proceso',
        finalizada: 'Finalizada',
        cancelada: 'Cancelada',
    };

    if (isLoading) {
        return <Loader fullScreen />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Inspecciones</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Gestión de inspecciones técnicas
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
                                placeholder="Proyecto o cliente..."
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
                                <option value="finalizada">Finalizada</option>
                                <option value="cancelada">Cancelada</option>
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
                                    Proyecto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Cliente
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                    Tipo
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
                                            {inspection.projectName}
                                        </td>
                                        <td className="px-6 py-4">
                                            {inspection.clientName}
                                        </td>
                                        <td className="px-6 py-4 capitalize">
                                            {inspection.inspectionType}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${statusColors[inspection.status]}`}>
                                                {statusLabels[inspection.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(inspection.scheduledDate).toLocaleDateString('es-ES')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {inspection.inspector ? (
                                                `${inspection.inspector.firstName} ${inspection.inspector.lastName}`
                                            ) : (
                                                <span className="text-gray-400">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/inspections/${inspection.id}`)}
                                                className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

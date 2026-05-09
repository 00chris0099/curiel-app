import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import { Loader } from '../components/Loader';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import type { Inspection, InspectionStatus } from '../types';
import { canCreateInspection } from '../utils/inspectionPermissions';
import { inspectionStatusIconMap } from '../utils/iconSystem';
import { getInspectionLocationLabel, getInspectionServiceLabel, getInspectorName } from '../utils/inspectionMetadata';
import { saveCachedInspections, getCachedInspections } from '../utils/offlineDb';
import { inspectionStatusBadgeClasses, inspectionStatusLabels } from '../utils/inspectionStatus';

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
                await saveCachedInspections(response.data);
            } catch (error: unknown) {
                const cached = await getCachedInspections();
                if (cached && cached.length > 0) {
                    setInspections(cached.map((c) => c.data));
                    setIsOfflineData(true);
                    toast.success('Mostrando datos guardados offline');
                } else {
                    toast.error(getApiErrorMessage(error, 'Error al cargar inspecciones'));
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            try {
                const cached = await getCachedInspections();
                if (cached && cached.length > 0) {
                    setInspections(cached.map((c) => c.data));
                    setIsOfflineData(true);
                }
            } catch {
                toast.error('Error al cargar datos locales');
            } finally {
                setIsLoading(false);
            }
        }
    }, [effectiveOnline, statusFilter]);

    useEffect(() => {
        loadInspections();
    }, [loadInspections]);

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
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="section-eyebrow">Operación</p>
                        {isOfflineData && (
                            <span className="badge badge-warning">
                                <CustomIcon name="database" size="xs" tone="white" />
                                Datos offline
                            </span>
                        )}
                    </div>
                    <h1 className="mt-2 font-display text-3xl text-slate-900">Inspecciones</h1>
                    <p className="mt-2 text-slate-600">Gestiona visitas técnicas de departamentos en Lima con filtros claros y estados unificados.</p>
                </div>

                {canCreateInspection(user) && (
                    <button
                        onClick={() => navigate('/inspections/create')}
                        className="btn btn-primary flex items-center gap-3"
                    >
                        <CustomIcon name="plus" size="xs" tone="white" />
                        Nueva inspección
                    </button>
                )}
            </div>

            {!isLoading && inspections.length === 0 && !effectiveOnline && (
                <div className="card py-12 text-center">
                    <div className="mb-4 flex justify-center">
                        <CustomIcon name="database" size="lg" tone="mist" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No hay inspecciones guardadas offline</h3>
                    <p className="mt-2 text-slate-600">
                        Abre la lista con internet al menos una vez para guardar los datos localmente.
                    </p>
                </div>
            )}

            {inspections.length > 0 && (
                <>
                    <div className="card">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Buscar</label>
                                <div className="field-with-icon">
                                    <CustomIcon name="search" size="sm" tone="mist" />
                                    <input
                                        type="text"
                                        placeholder="Servicio, cliente o distrito..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Estado</label>
                                <div className="field-with-icon">
                                    <CustomIcon name="filter" size="sm" tone="cream" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as InspectionStatus | '')}
                                        className="input"
                                    >
                                        <option value="">Todos los estados</option>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_proceso">En proceso</option>
                                        <option value="lista_revision">Lista para revisión</option>
                                        <option value="finalizada">Finalizada</option>
                                        <option value="cancelada">Cancelada</option>
                                        <option value="reprogramada">Reprogramada</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead className="bg-[#fbfbfa]">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inmueble</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cliente</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Servicio</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fecha</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inspector</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredInspections.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-14 text-center text-slate-500">
                                                <div className="mb-4 flex justify-center">
                                                    <CustomIcon name="folder-open" size="md" tone="mist" />
                                                </div>
                                                No se encontraron inspecciones.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInspections.map((inspection) => (
                                            <tr
                                                key={inspection.id}
                                                className="cursor-pointer transition-colors hover:bg-[#fbfbfa]"
                                                onClick={() => navigate(`/inspections/${inspection.id}/execute`)}
                                            >
                                                <td className="px-6 py-5 font-medium text-slate-900">
                                                    <div>
                                                        <p>{inspection.projectName}</p>
                                                        <p className="mt-1 text-xs font-medium text-slate-500">{getInspectionLocationLabel(inspection)}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-slate-700">{inspection.clientName}</td>
                                                <td className="px-6 py-5 text-slate-700">{getInspectionServiceLabel(inspection)}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`badge ${inspectionStatusBadgeClasses[inspection.status]}`}>
                                                        <CustomIcon name={inspectionStatusIconMap[inspection.status]} size="xs" tone="white" />
                                                        {inspectionStatusLabels[inspection.status]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-slate-700">{new Date(inspection.scheduledDate).toLocaleDateString('es-ES')}</td>
                                                <td className="px-6 py-5 text-slate-700">{getInspectorName(inspection)}</td>
                                                <td className="px-6 py-5 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/inspections/${inspection.id}`);
                                                        }}
                                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                                                        title="Ver detalle"
                                                    >
                                                        <CustomIcon name="clipboard-check" size="xs" tone="cream" />
                                                        Ver
                                                    </button>
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

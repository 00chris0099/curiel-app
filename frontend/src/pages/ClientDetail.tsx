import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { CustomIcon } from '../components/CustomIcon';
import { getApiErrorMessage } from '../api/axios';
import clientService from '../services/client.service';
import type { Client, Inspection, InspectionStatus } from '../types';
import { inspectionStatusLabels, inspectionStatusBadgeClasses } from '../utils/inspectionStatus';

const documentTypeLabels: Record<string, string> = {
    dni: 'DNI',
    ruc: 'RUC',
    ce: 'CE',
};

export const ClientDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | null>(null);
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<InspectionStatus | ''>('');

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            const [clientResponse, inspectionsResponse] = await Promise.all([
                clientService.getById(id),
                clientService.getInspections(id, {
                    status: statusFilter || undefined,
                    limit: 50,
                }),
            ]);
            setClient(clientResponse.data?.client || null);
            setInspections(inspectionsResponse.data || []);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar datos del cliente'));
        } finally {
            setIsLoading(false);
        }
    }, [id, statusFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <CustomIcon name="users" size="lg" tone="mist" />
                <p className="mt-4 text-sm font-medium text-slate-500">Cliente no encontrado</p>
                <button
                    onClick={() => navigate('/clients')}
                    className="mt-4 rounded-xl bg-[#17324a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3d56]"
                >
                    Volver a Clientes
                </button>
            </div>
        );
    }

    const displayName = client.razonSocial || `${client.firstName || ''} ${client.lastName || ''}`.trim();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <button
                        onClick={() => navigate('/clients')}
                        className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
                    >
                        <CustomIcon name="arrow-left" size="sm" tone="mist" />
                        Volver a Clientes
                    </button>
                    <h1 className="font-display text-3xl font-bold text-slate-900">{displayName}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {documentTypeLabels[client.documentType]} {client.documentNumber}
                    </p>
                </div>
            </div>

            {/* Client Info Card */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                <h2 className="font-display text-xl font-bold text-slate-900">Informacion del Cliente</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Email</p>
                        <p className="mt-1 text-sm text-slate-900">{client.email}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Telefono</p>
                        <p className="mt-1 text-sm text-slate-900">{client.phone || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Direccion</p>
                        <p className="mt-1 text-sm text-slate-900">{client.address || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Tipo de documento</p>
                        <p className="mt-1 text-sm text-slate-900">{documentTypeLabels[client.documentType]}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Protegido</p>
                        <p className="mt-1 text-sm text-slate-900">{client.isProtected ? 'Si' : 'No'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Creado</p>
                        <p className="mt-1 text-sm text-slate-900">
                            {new Date(client.createdAt).toLocaleDateString('es-PE')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Inspections */}
            <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="font-display text-xl font-bold text-slate-900">
                        Inspecciones ({inspections.length})
                    </h2>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as InspectionStatus | '')}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                    >
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="lista_revision">Lista Revision</option>
                        <option value="finalizada">Finalizada</option>
                        <option value="cancelada">Cancelada</option>
                        <option value="reprogramada">Reprogramada</option>
                    </select>
                </div>

                {inspections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <CustomIcon name="clipboard-check" size="lg" tone="mist" />
                        <p className="mt-4 text-sm font-medium text-slate-500">
                            Este cliente no tiene inspecciones
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-4 py-3 font-semibold text-slate-600">Proyecto</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Tipo</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Estado</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Fecha</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600">Direccion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {inspections.map((inspection) => (
                                    <tr
                                        key={inspection.id}
                                        className="cursor-pointer transition-colors hover:bg-slate-50/50"
                                        onClick={() => navigate(`/inspections/${inspection.id}`)}
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            {inspection.projectName}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{inspection.inspectionType}</td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${inspectionStatusBadgeClasses[inspection.status]}`}>
                                                {inspectionStatusLabels[inspection.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {new Date(inspection.scheduledDate).toLocaleDateString('es-PE')}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                                            {inspection.address}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

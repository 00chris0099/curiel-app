import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { Loader } from '../components/Loader';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import type { Inspection, InspectionStatus } from '../types';

const statusLabels: Record<InspectionStatus, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En Proceso',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
};

export const InspectionDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    const loadInspection = useCallback(async () => {
        if (!id) {
            navigate('/inspections', { replace: true });
            return;
        }

        setIsLoading(true);
        try {
            const data = await inspectionService.getInspectionById(id);
            setInspection(data);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar la inspeccion'));
            navigate('/inspections', { replace: true });
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadInspection();
    }, [loadInspection]);

    const handleStatusChange = async (status: InspectionStatus) => {
        if (!inspection || !id) {
            return;
        }

        setIsUpdating(true);
        try {
            const updated = await inspectionService.updateStatus(id, status);
            setInspection(updated);
            toast.success('Estado actualizado');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar el estado'));
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        if (!inspection || !id) {
            return;
        }

        const confirmed = window.confirm('¿Seguro que deseas eliminar esta inspeccion?');
        if (!confirmed) {
            return;
        }

        setIsUpdating(true);
        try {
            await inspectionService.deleteInspection(id);
            toast.success('Inspeccion eliminada');
            navigate('/inspections');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo eliminar la inspeccion'));
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return <Loader fullScreen />;
    }

    if (!inspection) {
        return null;
    }

    const canDelete = user?.role === 'admin';

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/inspections')}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{inspection.projectName}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">{inspection.clientName}</p>
                    </div>
                </div>

                {canDelete && (
                    <button
                        onClick={handleDelete}
                        disabled={isUpdating}
                        className="btn btn-danger flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                    </button>
                )}
            </div>

            <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tipo</p>
                    <p className="font-medium capitalize">{inspection.inspectionType}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
                    <p className="font-medium">{statusLabels[inspection.status]}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fecha programada</p>
                    <p className="font-medium">{new Date(inspection.scheduledDate).toLocaleString('es-ES')}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Inspector</p>
                    <p className="font-medium">
                        {inspection.inspector
                            ? `${inspection.inspector.firstName} ${inspection.inspector.lastName}`
                            : 'Sin asignar'}
                    </p>
                </div>
                <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Direccion</p>
                    <p className="font-medium">{inspection.address}</p>
                </div>
                <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notas</p>
                    <p className="font-medium">{inspection.notes || 'Sin observaciones'}</p>
                </div>
            </div>

            <div className="card">
                <h2 className="text-lg font-bold mb-4">Actualizar estado</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(Object.keys(statusLabels) as InspectionStatus[]).map((status) => (
                        <button
                            key={status}
                            type="button"
                            disabled={isUpdating || inspection.status === status}
                            onClick={() => handleStatusChange(status)}
                            className={`btn ${inspection.status === status ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            {statusLabels[status]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

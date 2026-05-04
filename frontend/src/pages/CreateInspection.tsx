import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import inspectionService from '../services/inspection.service';
import userService from '../services/user.service';
import type { User, CreateInspectionDto } from '../types';

export const CreateInspection = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [inspectors, setInspectors] = useState<User[]>([]);

    const [formData, setFormData] = useState<CreateInspectionDto & { state?: string; zipCode?: string }>({
        projectName: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        inspectionType: 'estructural',
        scheduledDate: '',
        inspectorId: '',
        notes: '',
    });

    const loadInspectors = useCallback(async () => {
        try {
            const data = await userService.getInspectors();
            setInspectors(data);
        } catch {
            toast.error('Error al cargar inspectores');
        }
    }, []);

    useEffect(() => {
        loadInspectors();
    }, [loadInspectors]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!formData.inspectorId) {
            toast.error('Debes asignar un inspector');
            return;
        }

        setIsLoading(true);
        try {
            await inspectionService.createInspection(formData);
            toast.success('Inspección creada exitosamente');
            navigate('/inspections');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al crear inspeccion'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/inspections')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">Nueva Inspección</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Completa el formulario para crear una inspección
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información del Proyecto */}
                <div className="card">
                    <h2 className="text-lg font-bold mb-4">Información del Proyecto</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label htmlFor="projectName" className="block text-sm font-medium mb-2">
                                Nombre del Proyecto <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="projectName"
                                name="projectName"
                                type="text"
                                required
                                value={formData.projectName}
                                onChange={handleChange}
                                className="input"
                                placeholder="Ej: Torre Central"
                            />
                        </div>

                        <div>
                            <label htmlFor="inspectionType" className="block text-sm font-medium mb-2">
                                Tipo de Inspección <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="inspectionType"
                                name="inspectionType"
                                required
                                value={formData.inspectionType}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="estructural">Estructural</option>
                                <option value="electrica">Eléctrica</option>
                                <option value="hidraulica">Hidráulica</option>
                                <option value="seguridad">Seguridad</option>
                                <option value="general">General</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="scheduledDate" className="block text-sm font-medium mb-2">
                                Fecha Programada <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="scheduledDate"
                                name="scheduledDate"
                                type="datetime-local"
                                required
                                value={formData.scheduledDate}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                {/* Información del Cliente */}
                <div className="card">
                    <h2 className="text-lg font-bold mb-4">Información del Cliente</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label htmlFor="clientName" className="block text-sm font-medium mb-2">
                                Nombre del Cliente <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="clientName"
                                name="clientName"
                                type="text"
                                required
                                value={formData.clientName}
                                onChange={handleChange}
                                className="input"
                                placeholder="Ej: Constructora ABC S.A."
                            />
                        </div>

                        <div>
                            <label htmlFor="clientEmail" className="block text-sm font-medium mb-2">
                                Email del Cliente
                            </label>
                            <input
                                id="clientEmail"
                                name="clientEmail"
                                type="email"
                                value={formData.clientEmail}
                                onChange={handleChange}
                                className="input"
                                placeholder="cliente@ejemplo.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="clientPhone" className="block text-sm font-medium mb-2">
                                Teléfono del Cliente
                            </label>
                            <input
                                id="clientPhone"
                                name="clientPhone"
                                type="tel"
                                value={formData.clientPhone}
                                onChange={handleChange}
                                className="input"
                                placeholder="+52 555 1234 5678"
                            />
                        </div>
                    </div>
                </div>

                {/* Dirección */}
                <div className="card">
                    <h2 className="text-lg font-bold mb-4">Dirección</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-medium mb-2">
                                Dirección <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="address"
                                name="address"
                                type="text"
                                required
                                value={formData.address}
                                onChange={handleChange}
                                className="input"
                                placeholder="Calle, número, colonia"
                            />
                        </div>

                        <div>
                            <label htmlFor="city" className="block text-sm font-medium mb-2">
                                Ciudad
                            </label>
                            <input
                                id="city"
                                name="city"
                                type="text"
                                value={formData.city}
                                onChange={handleChange}
                                className="input"
                                placeholder="Ciudad de México"
                            />
                        </div>

                        <div>
                            <label htmlFor="state" className="block text-sm font-medium mb-2">
                                Estado
                            </label>
                            <input
                                id="state"
                                name="state"
                                type="text"
                                value={formData.state}
                                onChange={handleChange}
                                className="input"
                                placeholder="CDMX"
                            />
                        </div>

                        <div>
                            <label htmlFor="zipCode" className="block text-sm font-medium mb-2">
                                Código Postal
                            </label>
                            <input
                                id="zipCode"
                                name="zipCode"
                                type="text"
                                value={formData.zipCode}
                                onChange={handleChange}
                                className="input"
                                placeholder="06600"
                            />
                        </div>
                    </div>
                </div>

                {/* Asignación */}
                <div className="card">
                    <h2 className="text-lg font-bold mb-4">Asignación</h2>
                    <div>
                        <label htmlFor="inspectorId" className="block text-sm font-medium mb-2">
                            Inspector Asignado <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="inspectorId"
                            name="inspectorId"
                            required
                            value={formData.inspectorId}
                            onChange={handleChange}
                            className="input"
                        >
                            <option value="">Selecciona un inspector</option>
                            {inspectors.map((inspector) => (
                                <option key={inspector.id} value={inspector.id}>
                                    {inspector.firstName} {inspector.lastName} ({inspector.email})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Notas */}
                <div className="card">
                    <h2 className="text-lg font-bold mb-4">Notas Adicionales</h2>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium mb-2">
                            Observaciones
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            rows={4}
                            value={formData.notes}
                            onChange={handleChange}
                            className="input"
                            placeholder="Notas o instrucciones especiales para la inspección..."
                        />
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/inspections')}
                        className="btn btn-secondary flex-1"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creando...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Crear Inspección
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

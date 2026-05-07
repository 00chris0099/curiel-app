import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import inspectionService from '../services/inspection.service';
import userService from '../services/user.service';
import type {
    ContactChannel,
    CreateInspectionDto,
    DepartmentInspectionMetadata,
    DepartmentServiceType,
    InspectionPriority,
    LimaDistrict,
    PropertyCondition,
    PropertyType,
    ReviewPoint,
    User,
    YesNoOption,
} from '../types';
import {
    buildDepartmentInspectionNotes,
    buildInspectionAddress,
    buildInspectionProjectName,
    DEPARTMENT_SERVICE_OPTIONS,
    SERVICE_TYPE_TO_BACKEND_TYPE,
} from '../utils/inspectionMetadata';
import { getReviewPointIcon } from '../utils/iconSystem';

const contactChannelOptions: ContactChannel[] = ['WhatsApp', 'Llamada', 'Facebook', 'Referido', 'Otro'];
const districtOptions: LimaDistrict[] = [
    'Miraflores',
    'San Isidro',
    'Santiago de Surco',
    'San Borja',
    'La Molina',
    'Jesús María',
    'Magdalena',
    'Pueblo Libre',
    'Lince',
    'Barranco',
    'Chorrillos',
    'San Miguel',
    'Cercado de Lima',
    'Otro',
];
const propertyTypeOptions: PropertyType[] = ['Departamento', 'Dúplex', 'Penthouse'];
const yesNoOptions: YesNoOption[] = ['Sí', 'No'];
const propertyConditionOptions: PropertyCondition[] = [
    'Nuevo / entrega de constructora',
    'Usado',
    'En remodelación',
    'Remodelado recientemente',
];
const reviewPointOptions: ReviewPoint[] = [
    'Humedad / filtraciones',
    'Instalaciones eléctricas',
    'Instalaciones sanitarias',
    'Pisos y acabados',
    'Puertas y ventanas',
    'Grietas o fisuras',
    'Cocina',
    'Baños',
    'Balcón / terraza',
    'Otro',
];
const priorityOptions: InspectionPriority[] = ['Normal', 'Alta', 'Urgente'];

type DepartmentInspectionFormState = {
    serviceType: DepartmentServiceType;
    scheduledDate: string;
    scheduledTime: string;
    clientFullName: string;
    clientPhone: string;
    clientEmail: string;
    contactChannel: ContactChannel;
    district: LimaDistrict | '';
    exactAddress: string;
    buildingName: string;
    arrivalReference: string;
    propertyType: PropertyType;
    apartmentNumber: string;
    floor: string;
    areaSquareMeters: string;
    bedrooms: string;
    bathrooms: string;
    hasParking: YesNoOption;
    hasStorage: YesNoOption;
    hasCommonAreas: YesNoOption;
    propertyCondition: PropertyCondition;
    reviewPoints: ReviewPoint[];
    reviewPointOther: string;
    inspectorId: string;
    priority: InspectionPriority;
    observations: string;
    technicalReport: YesNoOption;
};

const initialFormState: DepartmentInspectionFormState = {
    serviceType: 'Entrega de departamento',
    scheduledDate: '',
    scheduledTime: '',
    clientFullName: '',
    clientPhone: '',
    clientEmail: '',
    contactChannel: 'WhatsApp',
    district: '',
    exactAddress: '',
    buildingName: '',
    arrivalReference: '',
    propertyType: 'Departamento',
    apartmentNumber: '',
    floor: '',
    areaSquareMeters: '',
    bedrooms: '',
    bathrooms: '',
    hasParking: 'No',
    hasStorage: 'No',
    hasCommonAreas: 'No',
    propertyCondition: 'Nuevo / entrega de constructora',
    reviewPoints: [],
    reviewPointOther: '',
    inspectorId: '',
    priority: 'Normal',
    observations: '',
    technicalReport: 'Sí',
};

export const CreateInspection = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [inspectors, setInspectors] = useState<User[]>([]);
    const [formData, setFormData] = useState<DepartmentInspectionFormState>(initialFormState);

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

    const handleChange = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleReviewPointChange = (reviewPoint: ReviewPoint) => {
        setFormData((current) => {
            const isSelected = current.reviewPoints.includes(reviewPoint);
            return {
                ...current,
                reviewPoints: isSelected
                    ? current.reviewPoints.filter((item) => item !== reviewPoint)
                    : [...current.reviewPoints, reviewPoint],
            };
        });
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!formData.inspectorId) {
            toast.error('Debes asignar un inspector');
            return;
        }

        if (!formData.scheduledDate || !formData.scheduledTime) {
            toast.error('Debes completar fecha y hora programada');
            return;
        }

        if (!formData.district) {
            toast.error('Debes seleccionar un distrito');
            return;
        }

        setIsLoading(true);

        try {
            const metadata: DepartmentInspectionMetadata = {
                schema: 'department-inspection-v1',
                serviceType: formData.serviceType,
                scheduledTime: formData.scheduledTime,
                contactChannel: formData.contactChannel,
                district: formData.district,
                exactAddress: formData.exactAddress.trim(),
                buildingName: formData.buildingName.trim() || undefined,
                arrivalReference: formData.arrivalReference.trim() || undefined,
                propertyType: formData.propertyType,
                apartmentNumber: formData.apartmentNumber.trim(),
                floor: formData.floor.trim() || undefined,
                areaSquareMeters: formData.areaSquareMeters.trim() || undefined,
                bedrooms: formData.bedrooms.trim() || undefined,
                bathrooms: formData.bathrooms.trim() || undefined,
                hasParking: formData.hasParking,
                hasStorage: formData.hasStorage,
                hasCommonAreas: formData.hasCommonAreas,
                propertyCondition: formData.propertyCondition,
                reviewPoints: formData.reviewPoints,
                reviewPointOther: formData.reviewPoints.includes('Otro')
                    ? formData.reviewPointOther.trim() || undefined
                    : undefined,
                priority: formData.priority,
                technicalReport: formData.technicalReport,
                observations: formData.observations.trim() || undefined,
            };

            const payload: CreateInspectionDto & { state?: string } = {
                projectName: buildInspectionProjectName(metadata),
                clientName: formData.clientFullName.trim(),
                clientEmail: formData.clientEmail.trim() || undefined,
                clientPhone: formData.clientPhone.trim(),
                address: buildInspectionAddress(metadata),
                city: 'Lima',
                state: formData.district,
                inspectionType: SERVICE_TYPE_TO_BACKEND_TYPE[formData.serviceType],
                scheduledDate: `${formData.scheduledDate}T${formData.scheduledTime}`,
                inspectorId: formData.inspectorId,
                notes: buildDepartmentInspectionNotes(metadata),
            };

            await inspectionService.createInspection(payload);
            toast.success('Inspección creada exitosamente');
            navigate('/inspections');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al crear inspección'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <button
                        onClick={() => navigate('/inspections')}
                        className="rounded-xl border border-gray-200 p-2 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                        <CustomIcon name="arrow-left" size="sm" tone="mist" />
                    </button>
                    <div className="max-w-2xl">
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
                            Lima · departamentos
                        </p>
                        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Nueva inspección</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Registra una visita enfocada en departamentos en Lima con todos los datos operativos del cliente e inmueble.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)]">
                    <div className="space-y-6">
                        <section className="card space-y-5">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CustomIcon name="clipboard-check" size="sm" tone="cream" />
                                    <h2 className="text-lg font-bold">1. Información del servicio</h2>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Define el tipo de visita y el horario programado para el departamento.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="md:col-span-1">
                                    <label htmlFor="serviceType" className="mb-2 block text-sm font-medium">
                                        Tipo de inspección <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="serviceType"
                                        name="serviceType"
                                        value={formData.serviceType}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        {DEPARTMENT_SERVICE_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="scheduledDate" className="mb-2 block text-sm font-medium">
                                        Fecha programada <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="scheduledDate"
                                        name="scheduledDate"
                                        type="date"
                                        required
                                        value={formData.scheduledDate}
                                        onChange={handleChange}
                                        className="input"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="scheduledTime" className="mb-2 block text-sm font-medium">
                                        Hora programada <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="scheduledTime"
                                        name="scheduledTime"
                                        type="time"
                                        required
                                        value={formData.scheduledTime}
                                        onChange={handleChange}
                                        className="input"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="card space-y-5">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CustomIcon name="users" size="sm" tone="mist" />
                                    <h2 className="text-lg font-bold">2. Datos del cliente</h2>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Completa la información de contacto con foco en atención rápida por canales digitales.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label htmlFor="clientFullName" className="mb-2 block text-sm font-medium">
                                        Nombre completo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="clientFullName"
                                        name="clientFullName"
                                        type="text"
                                        required
                                        value={formData.clientFullName}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Ej: Andrea Salazar Paredes"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="clientPhone" className="mb-2 block text-sm font-medium">
                                        Teléfono / WhatsApp <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="clientPhone"
                                        name="clientPhone"
                                        type="tel"
                                        required
                                        value={formData.clientPhone}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Ej: 987 654 321"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="clientEmail" className="mb-2 block text-sm font-medium">
                                        Correo electrónico
                                    </label>
                                    <input
                                        id="clientEmail"
                                        name="clientEmail"
                                        type="email"
                                        value={formData.clientEmail}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="cliente@correo.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="contactChannel" className="mb-2 block text-sm font-medium">
                                        Canal de contacto
                                    </label>
                                    <select
                                        id="contactChannel"
                                        name="contactChannel"
                                        value={formData.contactChannel}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        {contactChannelOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="card space-y-5">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CustomIcon name="map-pin" size="sm" tone="blue" />
                                    <h2 className="text-lg font-bold">3. Ubicación en Lima</h2>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Registra la ubicación exacta del departamento y referencias de llegada para el inspector.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label htmlFor="district" className="mb-2 block text-sm font-medium">
                                        Distrito <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="district"
                                        name="district"
                                        required
                                        value={formData.district}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        <option value="">Selecciona un distrito</option>
                                        {districtOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="exactAddress" className="mb-2 block text-sm font-medium">
                                        Dirección exacta <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="exactAddress"
                                        name="exactAddress"
                                        type="text"
                                        required
                                        value={formData.exactAddress}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Av./Calle, número, urbanización o referencia"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="buildingName" className="mb-2 block text-sm font-medium">
                                        Nombre del edificio o condominio
                                    </label>
                                    <input
                                        id="buildingName"
                                        name="buildingName"
                                        type="text"
                                        value={formData.buildingName}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Ej: Edificio Parque Grau"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="arrivalReference" className="mb-2 block text-sm font-medium">
                                        Referencia de llegada
                                    </label>
                                    <input
                                        id="arrivalReference"
                                        name="arrivalReference"
                                        type="text"
                                        value={formData.arrivalReference}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Portería frente al parque, torre B"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="card space-y-5">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CustomIcon name="house" size="sm" tone="cream" />
                                    <h2 className="text-lg font-bold">4. Datos del departamento</h2>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Resume la tipología del inmueble y sus características para planificar mejor la visita.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <div>
                                    <label htmlFor="propertyType" className="mb-2 block text-sm font-medium">
                                        Tipo de inmueble <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="propertyType"
                                        name="propertyType"
                                        value={formData.propertyType}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        {propertyTypeOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="apartmentNumber" className="mb-2 block text-sm font-medium">
                                        Número de departamento <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="apartmentNumber"
                                        name="apartmentNumber"
                                        type="text"
                                        required
                                        value={formData.apartmentNumber}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Ej: 702"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="floor" className="mb-2 block text-sm font-medium">
                                        Piso
                                    </label>
                                    <input
                                        id="floor"
                                        name="floor"
                                        type="text"
                                        value={formData.floor}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Ej: 7"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="areaSquareMeters" className="mb-2 block text-sm font-medium">
                                        Área aproximada en m²
                                    </label>
                                    <input
                                        id="areaSquareMeters"
                                        name="areaSquareMeters"
                                        type="number"
                                        min="0"
                                        value={formData.areaSquareMeters}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Ej: 86"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="bedrooms" className="mb-2 block text-sm font-medium">
                                        Cantidad de habitaciones
                                    </label>
                                    <input
                                        id="bedrooms"
                                        name="bedrooms"
                                        type="number"
                                        min="0"
                                        value={formData.bedrooms}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Ej: 3"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="bathrooms" className="mb-2 block text-sm font-medium">
                                        Cantidad de baños
                                    </label>
                                    <input
                                        id="bathrooms"
                                        name="bathrooms"
                                        type="number"
                                        min="0"
                                        value={formData.bathrooms}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Ej: 2"
                                    />
                                </div>

                                <BinarySelect
                                    id="hasParking"
                                    label="¿Tiene estacionamiento?"
                                    value={formData.hasParking}
                                    onChange={handleChange}
                                />

                                <BinarySelect
                                    id="hasStorage"
                                    label="¿Tiene depósito?"
                                    value={formData.hasStorage}
                                    onChange={handleChange}
                                />

                                <BinarySelect
                                    id="hasCommonAreas"
                                    label="¿Tiene áreas comunes?"
                                    value={formData.hasCommonAreas}
                                    onChange={handleChange}
                                />
                            </div>
                        </section>

                        <section className="card space-y-5">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CustomIcon name="warning" size="sm" tone="amber" />
                                    <h2 className="text-lg font-bold">5. Estado del inmueble</h2>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Indica la condición actual del departamento y los focos críticos de revisión.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="propertyCondition" className="mb-2 block text-sm font-medium">
                                        Estado del inmueble <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="propertyCondition"
                                        name="propertyCondition"
                                        value={formData.propertyCondition}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        {propertyConditionOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <span className="mb-3 block text-sm font-medium">Principales puntos a revisar</span>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {reviewPointOptions.map((option) => {
                                            const isChecked = formData.reviewPoints.includes(option);
                                            return (
                                                <label
                                                    key={option}
                                                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${isChecked
                                                        ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
                                                        : 'border-gray-200 dark:border-gray-700'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleReviewPointChange(option)}
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                    />
                                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                        <CustomIcon name={getReviewPointIcon(option)} size="xs" tone={isChecked ? 'white' : 'mist'} />
                                                        {option}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {formData.reviewPoints.includes('Otro') && (
                                    <div>
                                        <label htmlFor="reviewPointOther" className="mb-2 block text-sm font-medium">
                                            Especifica otro punto a revisar
                                        </label>
                                        <input
                                            id="reviewPointOther"
                                            name="reviewPointOther"
                                            type="text"
                                            value={formData.reviewPointOther}
                                            onChange={handleChange}
                                            className="input"
                                            placeholder="Ej: Intercomunicador, mamparas acústicas, gas"
                                        />
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="space-y-6 xl:sticky xl:top-24">
                        <section className="card space-y-5">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CustomIcon name="user-gear" size="sm" tone="mist" />
                                    <h2 className="text-lg font-bold">6. Asignación</h2>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Selecciona quién realizará la inspección y el nivel de urgencia del servicio.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="inspectorId" className="mb-2 block text-sm font-medium">
                                        Inspector asignado <span className="text-red-500">*</span>
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

                                <div>
                                    <label htmlFor="priority" className="mb-2 block text-sm font-medium">
                                        Prioridad
                                    </label>
                                    <select
                                        id="priority"
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}
                                        className="input"
                                    >
                                        {priorityOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="card space-y-5">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CustomIcon name="note-pencil" size="sm" tone="blue" />
                                    <h2 className="text-lg font-bold">7. Notas adicionales</h2>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Agrega detalles del cliente, restricciones de acceso y solicitudes especiales para el informe.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="observations" className="mb-2 block text-sm font-medium">
                                        Observaciones
                                    </label>
                                    <textarea
                                        id="observations"
                                        name="observations"
                                        rows={6}
                                        value={formData.observations}
                                        onChange={handleChange}
                                        className="input min-h-[160px]"
                                        placeholder="Detalles indicados por el cliente, problemas visibles, horarios preferidos, restricciones de acceso, etc."
                                    />
                                </div>

                                <BinarySelect
                                    id="technicalReport"
                                    label="¿Necesita informe técnico?"
                                    value={formData.technicalReport}
                                    onChange={handleChange}
                                />
                            </div>
                        </section>

                        <section className="card space-y-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <CustomIcon name="buildings" size="sm" tone="cream" />
                                    <h2 className="text-lg font-bold">Resumen del envío</h2>
                                </div>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    El backend recibirá un payload compatible con la API actual y los datos ampliados viajarán dentro de las notas estructuradas.
                                </p>
                            </div>

                            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/80">
                                    <span className="inline-flex items-center gap-2"><CustomIcon name="clipboard-check" size="xs" tone="white" />Servicio</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{formData.serviceType}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/80">
                                    <span className="inline-flex items-center gap-2"><CustomIcon name="map-pin" size="xs" tone="white" />Ubicación</span>
                                    <span className="font-medium text-right text-gray-900 dark:text-white">
                                        {formData.district || 'Distrito pendiente'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/80">
                                    <span className="inline-flex items-center gap-2"><CustomIcon name="house" size="xs" tone="white" />Inmueble</span>
                                    <span className="font-medium text-right text-gray-900 dark:text-white">
                                        {formData.propertyType} {formData.apartmentNumber || '--'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => navigate('/inspections')}
                                    className="btn btn-secondary w-full sm:flex-1"
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary flex w-full items-center justify-center gap-2 sm:flex-1"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <CustomIcon name="sync" size="xs" tone="white" spin />
                                            Creando...
                                        </>
                                    ) : (
                                        <>
                                            <CustomIcon name="save" size="xs" tone="white" />
                                            Crear inspección
                                        </>
                                    )}
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </form>
        </div>
    );
};

type BinarySelectProps = {
    id: string;
    label: string;
    value: YesNoOption;
    onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
};

const BinarySelect = ({ id, label, value, onChange }: BinarySelectProps) => {
    return (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-medium">
                {label}
            </label>
            <select id={id} name={id} value={value} onChange={onChange} className="input">
                {yesNoOptions.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
};

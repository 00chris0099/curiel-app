import { useState, useEffect, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import inspectionService from '../services/inspection.service';
import userService from '../services/user.service';
import clientService from '../services/client.service';
import type {
    Client,
    ClientDocumentType,
    CreateInspectionDto,
    DepartmentInspectionMetadata,
    ReviewPoint,
    User,
} from '../types';
import {
    buildDepartmentInspectionNotes,
    buildInspectionAddress,
    buildInspectionProjectName,
    DEPARTMENT_SERVICE_OPTIONS,
    SERVICE_TYPE_TO_BACKEND_TYPE,
} from '../utils/inspectionMetadata';
import { AddressMapPicker } from '../components/common/AddressMapPicker';
import { filterDocumentInput, filterPhoneInput, validateDocument, validatePhone } from '../utils/validation';
import { getReviewPointIcon } from '../utils/iconSystem';
import {
    contactChannelOptions,
    districtOptions,
    propertyTypeOptions,
    propertyConditionOptions,
    reviewPointOptions,
    priorityOptions,
    type DepartmentInspectionFormState,
    initialFormState,
} from './createInspection/createInspectionConstants';
import { BinarySelect } from './createInspection/BinarySelect';

export const CreateInspection = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [inspectors, setInspectors] = useState<User[]>([]);
    const [formData, setFormData] = useState<DepartmentInspectionFormState>(initialFormState);

    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
    const [isSearchingClients, setIsSearchingClients] = useState(false);
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const clientSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [quickCreateForm, setQuickCreateForm] = useState({
        documentType: 'dni' as ClientDocumentType,
        documentNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
    });
    const [isCreatingClient, setIsCreatingClient] = useState(false);

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

    const searchClients = useCallback(async (query: string) => {
        if (query.trim().length < 2) {
            setClientSearchResults([]);
            setShowClientDropdown(false);
            return;
        }
        setIsSearchingClients(true);
        try {
            const response = await clientService.search(query);
            setClientSearchResults(response.data?.clients || []);
            setShowClientDropdown(true);
        } catch {
            setClientSearchResults([]);
        } finally {
            setIsSearchingClients(false);
        }
    }, []);

    const handleClientSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setClientSearchQuery(value);
        setSelectedClientId(null);
        if (clientSearchTimerRef.current) clearTimeout(clientSearchTimerRef.current);
        clientSearchTimerRef.current = setTimeout(() => searchClients(value), 300);
    };

    const handleSelectClient = (client: Client) => {
        const displayName = client.razonSocial || `${client.firstName || ''} ${client.lastName || ''}`.trim();
        setSelectedClientId(client.id);
        setClientSearchQuery(displayName);
        setShowClientDropdown(false);
        setFormData((current) => ({
            ...current,
            clientFullName: displayName,
            clientPhone: client.phone || '',
            clientEmail: client.email || '',
            exactAddress: client.address || current.exactAddress,
        }));
    };

    const handleClearClient = () => {
        setSelectedClientId(null);
        setClientSearchQuery('');
        setClientSearchResults([]);
        setShowClientDropdown(false);
        setFormData((current) => ({
            ...current,
            clientFullName: '',
            clientPhone: '',
            clientEmail: '',
        }));
    };

    const handleQuickCreateChange = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target;
        setQuickCreateForm((current) => {
            let newValue = value;
            if (name === 'documentNumber') {
                newValue = filterDocumentInput(current.documentType, value);
            } else if (name === 'phone') {
                newValue = filterPhoneInput(value);
            } else if (name === 'documentType') {
                return {
                    ...current,
                    documentType: value as ClientDocumentType,
                    documentNumber: filterDocumentInput(value, current.documentNumber)
                };
            }
            return { ...current, [name]: newValue };
        });
    };

    const handleQuickCreateSubmit = async () => {
        const { documentType, documentNumber, firstName, lastName, email, phone, address } = quickCreateForm;
        if (!documentNumber.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
            toast.error('Documento, nombre, apellido y correo son obligatorios');
            return;
        }

        const docValidation = validateDocument(documentType, documentNumber);
        if (!docValidation.isValid) {
            toast.error(docValidation.error || 'Número de documento inválido');
            return;
        }

        const phoneValidation = validatePhone(phone);
        if (!phoneValidation.isValid) {
            toast.error(phoneValidation.error || 'Número celular inválido');
            return;
        }

        setIsCreatingClient(true);
        try {
            const response = await clientService.create({
                documentType,
                documentNumber: documentNumber.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                address: address.trim() || undefined,
            });
            const newClient = response.data?.client;
            if (newClient) handleSelectClient(newClient);
            setShowQuickCreate(false);
            setQuickCreateForm({ documentType: 'dni', documentNumber: '', firstName: '', lastName: '', email: '', phone: '', address: '' });
            toast.success('Cliente creado exitosamente');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al crear cliente'));
        } finally {
            setIsCreatingClient(false);
        }
    };

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
                ...(selectedClientId ? { clientId: selectedClientId } : {}),
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

    const validateStep = (step: number): boolean => {
        if (step === 0) {
            if (!formData.clientFullName.trim()) {
                toast.error('El nombre del cliente es obligatorio');
                return false;
            }
            if (!formData.clientPhone.trim()) {
                toast.error('El teléfono del cliente es obligatorio');
                return false;
            }
            return true;
        }
        if (step === 1) {
            if (!formData.district) {
                toast.error('Selecciona un distrito');
                return false;
            }
            if (!formData.exactAddress.trim()) {
                toast.error('La dirección exacta es obligatoria');
                return false;
            }
            if (!formData.apartmentNumber.trim()) {
                toast.error('El número de departamento es obligatorio');
                return false;
            }
            return true;
        }
        return true;
    };

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, 2));
        }
    };

    const handlePrevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    };

    const stepLabels = ['Cliente', 'Inmueble', 'Configuración'];

    return (
        <div className="mx-auto max-w-6xl space-y-5 pb-10 sm:space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                    <button
                        onClick={() => navigate('/inspections')}
                        className="min-h-11 shrink-0 rounded-xl border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                        <CustomIcon name="arrow-left" size="sm" tone="mist" />
                    </button>
                    <div className="min-w-0 max-w-2xl">
                        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Nueva inspección</h1>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="card py-3 px-3 sm:py-4 sm:px-6">
                <div className="flex items-center justify-between gap-1 sm:gap-2">
                    {stepLabels.map((label, index) => (
                        <div key={label} className="flex flex-1 items-center last:flex-initial">
                            <div className="flex flex-col items-center min-w-0 flex-1 sm:flex-initial">
                                <div
                                    className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
                                        index < currentStep
                                            ? 'bg-emerald-600 text-white'
                                            : index === currentStep
                                            ? 'bg-[#17324a] text-white ring-2 ring-[#17324a]/20 dark:bg-blue-600'
                                            : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    {index < currentStep ? (
                                        <CustomIcon name="seal-check" size="xs" tone="white" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <span className={`mt-1 text-[10px] sm:text-xs font-medium truncate max-w-[70px] sm:max-w-none text-center ${
                                    index <= currentStep ? 'text-gray-900 font-bold dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                    {label}
                                </span>
                            </div>
                            {index < stepLabels.length - 1 && (
                                <div className={`mx-1 sm:mx-3 h-0.5 flex-1 transition-colors ${
                                    index < currentStep ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                                }`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)]">
                    <div className="space-y-5 sm:space-y-6">
                        {/* Step 0: Client Info */}
                        {currentStep === 0 && (
                            <>
                                <section className="card space-y-4 sm:space-y-5">
                                    <div>
                                        <div className="flex items-start gap-3 sm:items-center">
                                            <CustomIcon name="clipboard-check" size="sm" tone="cream" />
                                            <h2 className="text-lg font-bold">Servicio</h2>
                                        </div>
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

                                <section className="card space-y-4 sm:space-y-5">
                                    <div>
                                        <div className="flex items-start gap-3 sm:items-center">
                                            <CustomIcon name="users" size="sm" tone="mist" />
                                            <h2 className="text-lg font-bold">Datos del cliente</h2>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="md:col-span-2 relative">
                                            <label htmlFor="clientSearch" className="mb-2 block text-sm font-medium">
                                                Buscar cliente <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        id="clientSearch"
                                                        type="text"
                                                        value={clientSearchQuery}
                                                        onChange={handleClientSearchChange}
                                                        onFocus={() => clientSearchResults.length > 0 && setShowClientDropdown(true)}
                                                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                                                        className="input pr-10"
                                                        placeholder="Buscar por nombre, documento o correo..."
                                                    />
                                                    {isSearchingClients && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" />
                                                        </div>
                                                    )}
                                                    {clientSearchQuery && !isSearchingClients && (
                                                        <button
                                                            type="button"
                                                            onClick={handleClearClient}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowQuickCreate(!showQuickCreate)}
                                                    className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                                >
                                                    + Nuevo
                                                </button>
                                            </div>
                                            {showClientDropdown && clientSearchResults.length > 0 && (
                                                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                                    {clientSearchResults.map((client) => {
                                                        const displayName = client.razonSocial || `${client.firstName || ''} ${client.lastName || ''}`.trim();
                                                        return (
                                                            <button
                                                                key={client.id}
                                                                type="button"
                                                                onMouseDown={() => handleSelectClient(client)}
                                                                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                                                            >
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                                                    {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {client.documentType.toUpperCase()}: {client.documentNumber}
                                                                        {client.email ? ` · ${client.email}` : ''}
                                                                    </p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {selectedClientId && (
                                                <p className="mt-1 text-xs text-green-600 dark:text-green-400">✓ Cliente seleccionado</p>
                                            )}
                                        </div>

                                        {showQuickCreate && (
                                            <div className="md:col-span-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
                                                <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Crear cliente rápido</p>
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium">Tipo de documento</label>
                                                        <select
                                                            name="documentType"
                                                            value={quickCreateForm.documentType}
                                                            onChange={handleQuickCreateChange}
                                                            className="input text-sm"
                                                        >
                                                            <option value="dni">DNI</option>
                                                            <option value="ruc">RUC</option>
                                                            <option value="ce">CE</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium">Nº documento</label>
                                                        <input
                                                            name="documentNumber"
                                                            value={quickCreateForm.documentNumber}
                                                            onChange={handleQuickCreateChange}
                                                            className="input text-sm"
                                                            placeholder="Ej: 12345678"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium">Nombre</label>
                                                        <input
                                                            name="firstName"
                                                            value={quickCreateForm.firstName}
                                                            onChange={handleQuickCreateChange}
                                                            className="input text-sm"
                                                            placeholder="Nombre"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium">Apellido</label>
                                                        <input
                                                            name="lastName"
                                                            value={quickCreateForm.lastName}
                                                            onChange={handleQuickCreateChange}
                                                            className="input text-sm"
                                                            placeholder="Apellido"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium">Correo</label>
                                                        <input
                                                            name="email"
                                                            type="email"
                                                            value={quickCreateForm.email}
                                                            onChange={handleQuickCreateChange}
                                                            className="input text-sm"
                                                            placeholder="correo@ejemplo.com"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-xs font-medium">Telefono</label>
                                                        <input
                                                            name="phone"
                                                            value={quickCreateForm.phone}
                                                            onChange={handleQuickCreateChange}
                                                            className="input text-sm"
                                                            placeholder="Opcional"
                                                        />
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <label className="mb-1 block text-xs font-medium">Direccion</label>
                                                        <input
                                                            name="address"
                                                            value={quickCreateForm.address}
                                                            onChange={handleQuickCreateChange}
                                                            className="input text-sm"
                                                            placeholder="Direccion del cliente"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleQuickCreateSubmit}
                                                        disabled={isCreatingClient}
                                                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
                                                    >
                                                        {isCreatingClient ? 'Creando...' : 'Crear y seleccionar'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowQuickCreate(false)}
                                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        )}

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
                                                readOnly={!!selectedClientId}
                                                className={`input ${selectedClientId ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
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
                                                readOnly={!!selectedClientId}
                                                className={`input ${selectedClientId ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
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
                                                readOnly={!!selectedClientId}
                                                className={`input ${selectedClientId ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
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
                            </>
                        )}

                        {/* Step 1: Property Details */}
                        {currentStep === 1 && (
                            <>
                                <section className="card space-y-4 sm:space-y-5">
                                    <div>
                                        <div className="flex items-start gap-3 sm:items-center">
                                            <CustomIcon name="map-pin" size="sm" tone="blue" />
                                            <h2 className="text-lg font-bold">Ubicación en Lima</h2>
                                        </div>
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
                                            <AddressMapPicker
                                                address={formData.exactAddress}
                                                onAddressChange={(newAddr) => setFormData((prev) => ({ ...prev, exactAddress: newAddr }))}
                                                onDistrictDetected={(detectedDist) => {
                                                    if (detectedDist) {
                                                        setFormData((prev) => ({ ...prev, district: detectedDist as any }));
                                                    }
                                                }}
                                                label="Dirección exacta"
                                                placeholder="Buscar dirección en el mapa o ingresar manualmente..."
                                                required
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

                                <section className="card space-y-4 sm:space-y-5">
                                    <div>
                                        <div className="flex items-start gap-3 sm:items-center">
                                            <CustomIcon name="house" size="sm" tone="cream" />
                                            <h2 className="text-lg font-bold">Datos del departamento</h2>
                                        </div>
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

                                    </div>
                                </section>

                                <section className="card space-y-4 sm:space-y-5">
                                    <div>
                                        <div className="flex items-start gap-3 sm:items-center">
                                            <CustomIcon name="warning" size="sm" tone="amber" />
                                            <h2 className="text-lg font-bold">Estado del inmueble</h2>
                                        </div>
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
                            </>
                        )}

                        {/* Step 2: Configuration */}
                        {currentStep === 2 && (
                            <>
                                <section className="card space-y-4 sm:space-y-5">
                                    <div>
                                        <div className="flex items-start gap-3 sm:items-center">
                                            <CustomIcon name="user-gear" size="sm" tone="mist" />
                                            <h2 className="text-lg font-bold">Asignación</h2>
                                        </div>
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
                                                        {inspector.fullName} ({inspector.email})
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

                                <section className="card space-y-4 sm:space-y-5">
                                    <div>
                                        <div className="flex items-start gap-3 sm:items-center">
                                            <CustomIcon name="note-pencil" size="sm" tone="blue" />
                                            <h2 className="text-lg font-bold">Notas adicionales</h2>
                                        </div>
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
                            </>
                        )}
                    </div>

                    <div className="space-y-5 sm:space-y-6 xl:sticky xl:top-24">
                        <section className="card space-y-4 sm:space-y-5">
                            <div>
                                <div className="flex items-start gap-3 sm:items-center">
                                    <CustomIcon name="buildings" size="sm" tone="cream" />
                                    <h2 className="text-lg font-bold">Resumen</h2>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex flex-col gap-1 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/80 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                                    <span className="inline-flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
                                        <CustomIcon name="clipboard-check" size="xs" tone="mist" />
                                        Servicio
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white break-words sm:text-right">
                                        {formData.serviceType}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/80 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                                    <span className="inline-flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
                                        <CustomIcon name="map-pin" size="xs" tone="mist" />
                                        Ubicación
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white break-words sm:text-right">
                                        {formData.district || 'Distrito pendiente'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/80 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                                    <span className="inline-flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
                                        <CustomIcon name="house" size="xs" tone="mist" />
                                        Inmueble
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white break-words sm:text-right">
                                        {formData.propertyType} {formData.apartmentNumber || '--'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {currentStep > 0 && (
                                    <button
                                        type="button"
                                        onClick={handlePrevStep}
                                        className="btn btn-secondary w-full"
                                    >
                                        Anterior
                                    </button>
                                )}

                                {currentStep < 2 ? (
                                    <button
                                        type="button"
                                        onClick={handleNextStep}
                                        className="btn btn-primary w-full"
                                    >
                                        Siguiente
                                    </button>
                                ) : (
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
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </form>
        </div>
    );
};

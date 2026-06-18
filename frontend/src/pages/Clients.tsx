import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { CustomIcon } from '../components/CustomIcon';
import { getApiErrorMessage } from '../api/axios';
import { useAuthStore } from '../store/authStore';
import clientService from '../services/client.service';
import type { Client, CreateClientDto, ClientDocumentType } from '../types';

type ClientFormState = {
    documentType: ClientDocumentType;
    documentNumber: string;
    firstName: string;
    lastName: string;
    razonSocial: string;
    email: string;
    phone: string;
    address: string;
    isProtected: boolean;
};

const emptyForm: ClientFormState = {
    documentType: 'dni',
    documentNumber: '',
    firstName: '',
    lastName: '',
    razonSocial: '',
    email: '',
    phone: '',
    address: '',
    isProtected: false,
};

const documentTypeLabels: Record<ClientDocumentType, string> = {
    dni: 'DNI',
    ruc: 'RUC',
    ce: 'CE',
};

const documentTypeBadgeColors: Record<ClientDocumentType, string> = {
    dni: 'bg-blue-100 text-blue-800',
    ruc: 'bg-purple-100 text-purple-800',
    ce: 'bg-green-100 text-green-800',
};

export const Clients = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isMasterAdmin = user?.isMasterAdmin === true;
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [search, setSearch] = useState('');
    const [docTypeFilter, setDocTypeFilter] = useState<ClientDocumentType | ''>('');
    const [form, setForm] = useState<ClientFormState>(emptyForm);
    const [totalClients, setTotalClients] = useState(0);

    const isEditing = Boolean(editingClient);
    const isFormVisible = showCreateForm || isEditing;

    const loadClients = useCallback(async () => {
        try {
            const response = await clientService.getAll({
                search: search || undefined,
                documentType: (docTypeFilter as ClientDocumentType) || undefined,
                limit: 100,
            });
            setClients(response.data ?? []);
            setTotalClients(response.pagination?.total ?? 0);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar clientes'));
        } finally {
            setIsLoading(false);
        }
    }, [search, docTypeFilter]);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    const resetForm = () => {
        setEditingClient(null);
        setShowCreateForm(false);
        setForm(emptyForm);
    };

    const handleCreate = () => {
        if (isFormVisible) {
            resetForm();
            return;
        }
        setEditingClient(null);
        setForm(emptyForm);
        setShowCreateForm(true);
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setShowCreateForm(false);
        setForm({
            documentType: client.documentType,
            documentNumber: client.documentNumber,
            firstName: client.firstName || '',
            lastName: client.lastName || '',
            razonSocial: client.razonSocial || '',
            email: client.email,
            phone: client.phone || '',
            address: client.address || '',
            isProtected: client.isProtected,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload: CreateClientDto = {
                documentType: form.documentType,
                documentNumber: form.documentNumber,
                firstName: form.firstName || undefined,
                lastName: form.lastName || undefined,
                razonSocial: form.razonSocial || undefined,
                email: form.email,
                phone: form.phone || undefined,
                address: form.address || undefined,
                isProtected: isMasterAdmin ? form.isProtected : undefined,
            };

            if (isEditing && editingClient) {
                await clientService.update(editingClient.id, payload);
                toast.success('Cliente actualizado exitosamente');
            } else {
                await clientService.create(payload);
                toast.success('Cliente creado exitosamente');
            }

            resetForm();
            loadClients();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al guardar cliente'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (client: Client) => {
        const name = client.razonSocial || `${client.firstName} ${client.lastName}`;
        if (!window.confirm(`Eliminar cliente "${name}"? Esta accion no se puede deshacer.`)) {
            return;
        }

        try {
            await clientService.delete(client.id);
            toast.success('Cliente eliminado exitosamente');
            loadClients();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al eliminar cliente'));
        }
    };

    const getClientDisplayName = (client: Client) => {
        if (client.razonSocial) return client.razonSocial;
        return `${client.firstName || ''} ${client.lastName || ''}`.trim();
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="font-display text-3xl font-bold text-slate-900">Clientes</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {totalClients} clientes registrados
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#17324a] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e3d56] focus:outline-none focus:ring-2 focus:ring-[#17324a] focus:ring-offset-2"
                >
                    <CustomIcon name={isFormVisible ? 'close' : 'plus'} size="sm" tone="cream" />
                    {isFormVisible ? 'Cancelar' : 'Nuevo Cliente'}
                </button>
            </div>

            {/* Create/Edit Form */}
            {isFormVisible && (
                <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
                    <h2 className="font-display text-xl font-bold text-slate-900">
                        {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h2>
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {/* Document Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Tipo de documento
                                </label>
                                <select
                                    value={form.documentType}
                                    onChange={(e) =>
                                        setForm({ ...form, documentType: e.target.value as ClientDocumentType })
                                    }
                                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                                >
                                    <option value="dni">DNI</option>
                                    <option value="ruc">RUC</option>
                                    <option value="ce">CE</option>
                                </select>
                            </div>

                            {/* Document Number */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Numero de documento *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.documentNumber}
                                    onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                                    placeholder="Ej: 12345678"
                                />
                            </div>

                            {/* First Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={form.firstName}
                                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                                    placeholder="Nombre"
                                />
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Apellido
                                </label>
                                <input
                                    type="text"
                                    value={form.lastName}
                                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                                    placeholder="Apellido"
                                />
                            </div>

                            {/* Razon Social */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Razon Social
                                </label>
                                <input
                                    type="text"
                                    value={form.razonSocial}
                                    onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                                    placeholder="Razon social (opcional si tiene nombre)"
                                />
                            </div>

                            {/* Email */}
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Telefono
                                </label>
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                                    placeholder="Telefono"
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Direccion
                                </label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                                    placeholder="Direccion"
                                />
                            </div>

                            {/* isProtected - solo masterAdmin */}
                            {isMasterAdmin && (
                                <div className="sm:col-span-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.isProtected || false}
                                            onChange={(e) => setForm({ ...form, isProtected: e.target.checked })}
                                            className="h-4 w-4 rounded border-slate-300 text-[#17324a] focus:ring-[#17324a]"
                                        />
                                        <span className="text-sm font-medium text-slate-700">
                                            Proteger de auto-eliminacion
                                        </span>
                                    </label>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Los clientes protegidos no se eliminan automaticamente a los 15 dias.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#17324a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e3d56] disabled:opacity-50"
                            >
                                {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Cliente'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <CustomIcon name="search" size="sm" tone="mist" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, documento o email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                    />
                </div>
                <select
                    value={docTypeFilter}
                    onChange={(e) => setDocTypeFilter(e.target.value as ClientDocumentType | '')}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-[#17324a] focus:outline-none focus:ring-2 focus:ring-[#17324a]/20"
                >
                    <option value="">Todos los tipos</option>
                    <option value="dni">DNI</option>
                    <option value="ruc">RUC</option>
                    <option value="ce">CE</option>
                </select>
            </div>

            {/* Clients Table */}
            <div className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-slate-200/80">
                {clients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <CustomIcon name="users" size="lg" tone="mist" />
                        <p className="mt-4 text-sm font-medium text-slate-500">
                            No se encontraron clientes
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-6 py-4 font-semibold text-slate-600">Cliente</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Documento</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Email</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Telefono</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {clients.map((client) => (
                                    <tr key={client.id} className="transition-colors hover:bg-slate-50/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17324a]/10">
                                                    <CustomIcon name="users" size="sm" tone="cream" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {getClientDisplayName(client)}
                                                    </p>
                                                    {client.razonSocial && client.firstName && (
                                                        <p className="text-xs text-slate-500">
                                                            {client.firstName} {client.lastName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${documentTypeBadgeColors[client.documentType]}`}>
                                                {documentTypeLabels[client.documentType]}
                                            </span>
                                            <span className="ml-2 text-slate-700">{client.documentNumber}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{client.email}</td>
                                        <td className="px-6 py-4 text-slate-600">{client.phone || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/clients/${client.id}`)}
                                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                                    title="Ver detalles"
                                                >
                                                    <CustomIcon name="eye" size="sm" tone="mist" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(client)}
                                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                                    title="Editar"
                                                >
                                                    <CustomIcon name="edit" size="sm" tone="mist" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(client)}
                                                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                    title="Eliminar"
                                                >
                                                    <CustomIcon name="trash" size="sm" tone="mist" />
                                                </button>
                                            </div>
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

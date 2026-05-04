import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Pencil, Search, Shield, Trash2, UserCheck, UserPlus, UserX, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { getApiErrorMessage } from '../api/axios';
import { useAuthStore } from '../store/authStore';
import userService from '../services/user.service';
import type { CreateUserDto, UpdateUserDto, User, UserRole, UserStats } from '../types';

type UserFormState = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: UserRole;
    password: string;
};

const emptyForm: UserFormState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'inspector',
    password: '',
};

const roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    arquitecto: 'Arquitecto',
    inspector: 'Inspector',
};

const roleBadgeColors: Record<UserRole, string> = {
    admin: 'badge-danger',
    arquitecto: 'badge-info',
    inspector: 'badge-success',
};

export const Users = () => {
    const { user, refreshProfile } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [form, setForm] = useState<UserFormState>(emptyForm);

    const isEditing = Boolean(editingUser);
    const isFormVisible = showCreateForm || isEditing;

    const loadUsers = useCallback(async () => {
        try {
            const [usersResponse, statsResponse] = await Promise.all([
                userService.getAllUsers({
                    search: search || undefined,
                    role: roleFilter || undefined,
                    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
                    limit: 100,
                }),
                userService.getStats(),
            ]);

            setUsers(usersResponse.data ?? []);
            setStats(statsResponse);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar usuarios'));
        } finally {
            setIsLoading(false);
        }
    }, [roleFilter, search, statusFilter]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const resetForm = () => {
        setEditingUser(null);
        setShowCreateForm(false);
        setForm(emptyForm);
    };

    const handleCreate = () => {
        if (isFormVisible) {
            resetForm();
            return;
        }

        setEditingUser(null);
        setForm(emptyForm);
        setShowCreateForm(true);
    };

    const handleEdit = (selectedUser: User) => {
        setEditingUser(selectedUser);
        setShowCreateForm(false);
        setForm({
            firstName: selectedUser.firstName || '',
            lastName: selectedUser.lastName || '',
            email: selectedUser.email,
            phone: selectedUser.phone || '',
            role: selectedUser.role,
            password: '',
        });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const firstName = form.firstName.trim();
        const lastName = form.lastName.trim();
        const email = form.email.trim();
        const phone = form.phone.trim();
        const fullName = `${firstName} ${lastName}`.trim();

        if (!firstName || !lastName || !fullName) {
            toast.error('Nombre y apellido son obligatorios');
            return;
        }

        if (firstName.length < 2 || lastName.length < 2) {
            toast.error('Nombre y apellido deben tener al menos 2 caracteres');
            return;
        }

        if (!email) {
            toast.error('El correo electronico es obligatorio');
            return;
        }

        if (!form.role) {
            toast.error('Debes seleccionar un rol');
            return;
        }

        if (!isEditing && !form.password.trim()) {
            toast.error('Email y contraseña son obligatorios');
            return;
        }

        if (!isEditing && form.password.trim().length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setIsSubmitting(true);

        try {
            if (isEditing && editingUser) {
                const payload: UpdateUserDto = {
                    firstName,
                    lastName,
                    phone: phone || undefined,
                    role: form.role,
                };

                await userService.updateUser(editingUser.id, payload);
                toast.success('Usuario actualizado correctamente');
            } else {
                const payload: CreateUserDto = {
                    fullName,
                    firstName,
                    lastName,
                    email,
                    phone: phone || undefined,
                    role: form.role,
                    password: form.password.trim(),
                };

                await userService.createUser(payload);
                toast.success('Usuario creado correctamente');
            }

            await loadUsers();

            if (isEditing && editingUser?.id === user?.id) {
                await refreshProfile();
            }

            resetForm();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo guardar el usuario'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (selectedUser: User) => {
        const nextStatus = !selectedUser.isActive;
        const actionLabel = nextStatus ? 'activar' : 'desactivar';

        if (!window.confirm(`¿Seguro que deseas ${actionLabel} a ${selectedUser.firstName} ${selectedUser.lastName}?`)) {
            return;
        }

        try {
            await userService.toggleUserStatus(selectedUser.id, nextStatus);
            toast.success(`Usuario ${nextStatus ? 'activado' : 'desactivado'} correctamente`);

            if (selectedUser.id === user?.id) {
                await refreshProfile();
            }

            await loadUsers();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar el estado'));
        }
    };

    const handleDelete = async (selectedUser: User) => {
        if (!window.confirm(`¿Seguro que deseas deshabilitar a ${selectedUser.firstName} ${selectedUser.lastName}?`)) {
            return;
        }

        try {
            await userService.deleteUser(selectedUser.id);
            toast.success('Usuario deshabilitado correctamente');

            if (selectedUser.id === user?.id) {
                await refreshProfile();
            }

            await loadUsers();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo eliminar el usuario'));
        }
    };

    const handleTransferMaster = async (selectedUser: User) => {
        if (!window.confirm(`¿Transferir el master admin a ${selectedUser.firstName} ${selectedUser.lastName}?`)) {
            return;
        }

        try {
            await userService.transferMasterAdmin(selectedUser.id);
            await refreshProfile();
            toast.success('Master admin transferido correctamente');
            await loadUsers();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo transferir el master admin'));
        }
    };

    const roleCounts = useMemo(() => {
        const counts: Record<UserRole, number> = {
            admin: 0,
            arquitecto: 0,
            inspector: 0,
        };

        stats?.byRole.forEach((item) => {
            counts[item.role] = Number(item.count) || 0;
        });

        return counts;
    }, [stats]);

    if (isLoading) {
        return <Loader fullScreen />;
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
                        Administracion
                    </p>
                    <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Usuarios</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Desde aqui el administrador puede crear, editar, activar y desactivar cuentas.
                    </p>
                </div>

                <button
                    onClick={handleCreate}
                    className={`btn flex w-full items-center justify-center gap-2 sm:w-auto sm:self-start ${isFormVisible ? 'btn-secondary' : 'btn-primary'}`}
                    type="button"
                >
                    <UserPlus className="h-5 w-5" />
                    {isFormVisible ? 'Cerrar formulario' : 'Nuevo Usuario'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-5">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                            <p className="text-3xl font-bold">{stats?.total ?? 0}</p>
                        </div>
                        <UsersIcon className="h-8 w-8 text-primary-600" />
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Activos</p>
                            <p className="text-3xl font-bold text-green-600">{stats?.active ?? 0}</p>
                        </div>
                        <UserCheck className="h-8 w-8 text-green-600" />
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
                            <p className="text-3xl font-bold text-red-600">{roleCounts.admin}</p>
                        </div>
                        <Shield className="h-8 w-8 text-red-600" />
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Arquitectos</p>
                            <p className="text-3xl font-bold text-blue-600">{roleCounts.arquitecto}</p>
                        </div>
                        <UsersIcon className="h-8 w-8 text-blue-600" />
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Inspectores</p>
                            <p className="text-3xl font-bold text-emerald-600">{roleCounts.inspector}</p>
                        </div>
                        <UsersIcon className="h-8 w-8 text-emerald-600" />
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-1 items-start gap-6 ${isFormVisible ? '2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]' : ''}`}>
                <div className="min-w-0 space-y-6">
                    <div className="card">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            <div>
                                <label className="mb-2 block text-sm font-medium">Buscar</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                    <input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        className="input pl-10"
                                        placeholder="Nombre o email"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">Rol</label>
                                <select
                                    value={roleFilter}
                                    onChange={(event) => setRoleFilter(event.target.value as UserRole | '')}
                                    className="input"
                                >
                                    <option value="">Todos</option>
                                    <option value="admin">Administrador</option>
                                    <option value="arquitecto">Arquitecto</option>
                                    <option value="inspector">Inspector</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">Estado</label>
                                <select
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                                    className="input"
                                >
                                    <option value="all">Todos</option>
                                    <option value="active">Activos</option>
                                    <option value="inactive">Inactivos</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-[760px] w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Telefono</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                                No se encontraron usuarios con los filtros actuales.
                                            </td>
                                        </tr>
                                    ) : users.map((listedUser) => {
                                        const canTransferMaster = Boolean(
                                            user?.isMasterAdmin &&
                                            !listedUser.isMasterAdmin &&
                                            listedUser.isActive
                                        );

                                        return (
                                            <tr key={listedUser.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                                            {listedUser.firstName?.[0] ?? '?'}{listedUser.lastName?.[0] ?? ''}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-medium">{listedUser.firstName} {listedUser.lastName}</p>
                                                                {listedUser.isMasterAdmin && (
                                                                    <span className="badge badge-warning flex items-center gap-1">
                                                                        <Crown className="h-3 w-3" />
                                                                        Master
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="break-all text-sm text-gray-500 dark:text-gray-400">{listedUser.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <span className={`badge ${roleBadgeColors[listedUser.role]}`}>
                                                        {roleLabels[listedUser.role]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <span className={`badge ${listedUser.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                        {listedUser.isActive ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 align-top text-sm text-gray-600 dark:text-gray-300">
                                                    {listedUser.phone || 'Sin telefono'}
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                                                        {canTransferMaster && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTransferMaster(listedUser)}
                                                                className="rounded-lg border border-yellow-300 px-3 py-2 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                                                            >
                                                                Transferir Master
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(listedUser)}
                                                            className="rounded-lg border border-gray-300 p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                                            aria-label={`Editar ${listedUser.firstName} ${listedUser.lastName}`}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStatus(listedUser)}
                                                            disabled={Boolean(listedUser.isMasterAdmin && listedUser.isActive)}
                                                            className="rounded-lg border border-gray-300 p-2 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                                                            aria-label={listedUser.isActive ? `Desactivar ${listedUser.firstName} ${listedUser.lastName}` : `Activar ${listedUser.firstName} ${listedUser.lastName}`}
                                                        >
                                                            {listedUser.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(listedUser)}
                                                            disabled={Boolean(listedUser.isMasterAdmin)}
                                                            className="rounded-lg border border-red-300 p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-900/20"
                                                            aria-label={`Eliminar ${listedUser.firstName} ${listedUser.lastName}`}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {isFormVisible && (
                <div className="card self-start">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">{isEditing ? 'Editar usuario' : 'Crear usuario'}</h2>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {isEditing ? 'Actualiza el rol o los datos basicos de la cuenta.' : 'Crea nuevas cuentas para administradores, arquitectos o inspectores.'}
                            </p>
                        </div>

                        <button type="button" onClick={resetForm} className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                            {isEditing ? 'Cancelar' : 'Cerrar formulario'}
                        </button>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="firstName" className="mb-2 block text-sm font-medium">Nombre</label>
                                <input
                                    id="firstName"
                                    name="firstName"
                                    className="input"
                                    value={form.firstName}
                                    onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                                    minLength={2}
                                />
                            </div>

                            <div>
                                <label htmlFor="lastName" className="mb-2 block text-sm font-medium">Apellido</label>
                                <input
                                    id="lastName"
                                    name="lastName"
                                    className="input"
                                    value={form.lastName}
                                    onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                                    minLength={2}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium">Correo electronico</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="input"
                                value={form.email}
                                disabled={isEditing}
                                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                            />
                        </div>

                        {!isEditing && (
                            <div>
                                <label htmlFor="password" className="mb-2 block text-sm font-medium">Contraseña</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    className="input"
                                    value={form.password}
                                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                                    minLength={8}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="phone" className="mb-2 block text-sm font-medium">Telefono</label>
                                <input
                                    id="phone"
                                    name="phone"
                                    className="input"
                                    value={form.phone}
                                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                                />
                            </div>

                            <div>
                                <label htmlFor="role" className="mb-2 block text-sm font-medium">Rol</label>
                                <select
                                    id="role"
                                    name="role"
                                    className="input"
                                    value={form.role}
                                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
                                >
                                    <option value="admin">Administrador</option>
                                    <option value="arquitecto">Arquitecto</option>
                                    <option value="inspector">Inspector</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70">
                            {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear usuario'}
                        </button>
                    </form>
                </div>
                )}
            </div>
        </div>
    );
};

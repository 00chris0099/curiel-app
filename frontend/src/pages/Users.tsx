import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader } from '../components/Loader';
import { CustomIcon } from '../components/CustomIcon';
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
    supervisor: 'Supervisor',
    arquitecto: 'Arquitecto',
    inspector: 'Inspector',
};

const roleBadgeColors: Record<UserRole, string> = {
    admin: 'badge-danger',
    supervisor: 'badge-warning',
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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;

    const isEditing = Boolean(editingUser);
    const isFormVisible = showCreateForm || isEditing;

    const loadUsers = useCallback(async () => {
        try {
            const [usersResponse, statsResponse] = await Promise.all([
                userService.getAllUsers({
                    search: search || undefined,
                    role: roleFilter || undefined,
                    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
                    page,
                    limit: pageSize,
                }),
                userService.getStats(),
            ]);

            setUsers(usersResponse.data ?? []);
            setTotalPages(usersResponse.pagination?.totalPages ?? 1);
            setStats(statsResponse);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar usuarios'));
        } finally {
            setIsLoading(false);
        }
    }, [roleFilter, search, statusFilter, page]);

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
            firstName: selectedUser.fullName?.split(' ')[0] || '',
            lastName: selectedUser.fullName?.split(' ').slice(1).join(' ') || '',
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

        if (!window.confirm(`¿Seguro que deseas ${actionLabel} a ${selectedUser.fullName}?`)) {
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
        if (!window.confirm(`¿Seguro que deseas deshabilitar a ${selectedUser.fullName}?`)) {
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
        if (!window.confirm(`¿Transferir el master admin a ${selectedUser.fullName}?`)) {
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

    useEffect(() => {
        setPage(1);
    }, [search, roleFilter, statusFilter]);

    const roleCounts = useMemo(() => {
        const counts: Record<UserRole, number> = {
            admin: 0,
            supervisor: 0,
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
        <div className="space-y-6 pb-10 animate-in fade-in duration-300">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Usuarios</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gestiona las cuentas del sistema.</p>
                </div>
                <button onClick={handleCreate} className={`btn flex items-center gap-2 ${isFormVisible ? 'btn-secondary' : 'btn-primary'}`}>
                    <CustomIcon name={isFormVisible ? 'dots-three' : 'plus'} size="xs" tone={isFormVisible ? 'mist' : 'white'} />
                    {isFormVisible ? 'Cerrar' : 'Nuevo usuario'}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                    { label: 'Total', value: stats?.total ?? 0, color: 'text-gray-900 dark:text-white' },
                    { label: 'Activos', value: stats?.active ?? 0, color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Admins', value: roleCounts.admin, color: 'text-red-600 dark:text-red-400' },
                    { label: 'Supervisores', value: roleCounts.supervisor, color: 'text-amber-600 dark:text-amber-400' },
                    { label: 'Arquitectos', value: roleCounts.arquitecto, color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Inspectores', value: roleCounts.inspector, color: 'text-emerald-600 dark:text-emerald-400' },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 sm:p-4">
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                        <p className={`mt-1 text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="relative">
                            <CustomIcon name="search" size="xs" tone="mist" />
                            <input value={search} onChange={(event) => setSearch(event.target.value)} className="input pl-9" placeholder="Buscar por nombre o email..." />
                        </div>
                        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as UserRole | '')} className="input">
                            <option value="">Todos los roles</option>
                            <option value="admin">Administrador</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="arquitecto">Arquitecto</option>
                            <option value="inspector">Inspector</option>
                        </select>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')} className="input">
                            <option value="all">Todos los estados</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Usuario</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Rol</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Telefono</th>
                                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {users.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">No se encontraron usuarios.</td></tr>
                            ) : users.map((listedUser) => {
                                const canTransferMaster = Boolean(user?.isMasterAdmin && !listedUser.isMasterAdmin && listedUser.isActive);
                                return (
                                    <tr key={listedUser.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#17324a] text-xs font-bold text-white">
                                                    {listedUser.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{listedUser.fullName}</p>
                                                        {listedUser.isMasterAdmin && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Master</span>}
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{listedUser.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3"><span className={`badge ${roleBadgeColors[listedUser.role]}`}>{roleLabels[listedUser.role]}</span></td>
                                        <td className="px-5 py-3"><span className={`badge ${listedUser.isActive ? 'badge-success' : 'badge-danger'}`}>{listedUser.isActive ? 'Activo' : 'Inactivo'}</span></td>
                                        <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{listedUser.phone || '-'}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {canTransferMaster && <button onClick={() => handleTransferMaster(listedUser)} className="rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20">Transferir</button>}
                                                <button onClick={() => handleEdit(listedUser)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"><CustomIcon name="pencil" size="xs" tone="mist" /></button>
                                                <button onClick={() => handleToggleStatus(listedUser)} disabled={Boolean(listedUser.isMasterAdmin && listedUser.isActive)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-800"><CustomIcon name={listedUser.isActive ? 'x-circle' : 'check-circle'} size="xs" tone={listedUser.isActive ? 'rose' : 'sage'} /></button>
                                                <button onClick={() => handleDelete(listedUser)} disabled={Boolean(listedUser.isMasterAdmin)} className="rounded p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"><CustomIcon name="trash" size="xs" tone="rose" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
                        <p className="text-xs text-gray-500">Pagina {page} de {totalPages}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary text-xs">Anterior</button>
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary text-xs">Siguiente</button>
                        </div>
                    </div>
                )}
            </div>

            {isFormVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
                    <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isEditing ? 'Editar usuario' : 'Crear usuario'}</h2>
                        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Nombre</label><input className="input" value={form.firstName} onChange={(event) => setForm((c) => ({ ...c, firstName: event.target.value }))} /></div>
                                <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Apellido</label><input className="input" value={form.lastName} onChange={(event) => setForm((c) => ({ ...c, lastName: event.target.value }))} /></div>
                            </div>
                            <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Correo</label><input type="email" className="input" value={form.email} disabled={isEditing} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} /></div>
                            {!isEditing && <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Contrasena</label><input type="password" className="input" value={form.password} onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))} /></div>}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Telefono</label><input className="input" value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))} /></div>
                                <div><label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Rol</label><select className="input" value={form.role} onChange={(event) => setForm((c) => ({ ...c, role: event.target.value as UserRole }))}><option value="admin">Admin</option><option value="supervisor">Supervisor</option><option value="arquitecto">Arquitecto</option><option value="inspector">Inspector</option></select></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={resetForm} className="btn btn-secondary flex-1">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">{isSubmitting ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

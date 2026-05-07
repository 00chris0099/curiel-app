import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import { Loader } from '../components/Loader';
import { useAuthStore } from '../store/authStore';
import { roleIconMap } from '../utils/iconSystem';

export const Profile = () => {
    const { user, refreshProfile } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            await refreshProfile();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar perfil'));
        } finally {
            setIsLoading(false);
        }
    }, [refreshProfile]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    if (isLoading) {
        return <Loader fullScreen />;
    }

    const roleLabels: Record<string, string> = {
        admin: 'Administrador',
        arquitecto: 'Arquitecto',
        inspector: 'Inspector',
    };

    const roleColors: Record<string, string> = {
        admin: 'badge-danger',
        arquitecto: 'badge-info',
        inspector: 'badge-success',
    };

    const profileRows = [
        {
            title: 'Nombre completo',
            value: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
            icon: 'user-gear' as const,
            tone: 'cream' as const,
        },
        {
            title: 'Correo electrónico',
            value: user?.email || 'No disponible',
            icon: 'bell' as const,
            tone: 'mist' as const,
        },
        user?.phone ? {
            title: 'Teléfono',
            value: user.phone,
            icon: 'users' as const,
            tone: 'blue' as const,
        } : null,
        {
            title: 'Rol en el sistema',
            value: user?.role ? roleLabels[user.role] : '',
            icon: roleIconMap[user?.role || 'inspector'] ?? 'clipboard-check',
            tone: 'sage' as const,
        },
        {
            title: 'Miembro desde',
            value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }) : '',
            icon: 'calendar' as const,
            tone: 'cream' as const,
        },
    ].filter(Boolean) as Array<{ title: string; value: string; icon: 'user-gear' | 'bell' | 'users' | 'clipboard-check' | 'calendar' | 'settings' | 'buildings'; tone: 'cream' | 'mist' | 'blue' | 'sage' }>;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <section className="card overflow-hidden">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                    <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-[#17324a] text-3xl font-bold text-white shadow-[0_20px_44px_rgba(23,50,74,0.2)]">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <div className="flex-1">
                        <p className="section-eyebrow">Perfil profesional</p>
                        <h1 className="mt-2 font-display text-3xl text-slate-900">{user?.firstName} {user?.lastName}</h1>
                        <p className="mt-2 text-slate-600">{user?.email}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <span className={`badge ${user?.role ? roleColors[user.role] : ''}`}>
                                <CustomIcon name={roleIconMap[user?.role || 'inspector'] ?? 'clipboard-check'} size="xs" tone="white" />
                                {user?.role ? roleLabels[user.role] : ''}
                            </span>
                            <span className="badge badge-success">
                                <CustomIcon name="check-circle" size="xs" tone="white" />
                                Cuenta activa
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="card">
                <div className="mb-5">
                    <p className="section-eyebrow">Ficha personal</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">Información de la cuenta</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {profileRows.map((row) => (
                        <div key={row.title} className="rounded-[24px] border border-slate-200 bg-[#fbfbfa] p-4">
                            <div className="flex items-start gap-4">
                                <CustomIcon name={row.icon} size="sm" tone={row.tone} />
                                <div>
                                    <p className="text-sm text-slate-500">{row.title}</p>
                                    <p className="mt-1 font-semibold text-slate-900">{row.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="card bg-[#fbfbfa]">
                <p className="text-sm font-semibold text-slate-500">ID de usuario</p>
                <p className="mt-2 break-all font-mono text-xs text-slate-500">{user?.id}</p>
            </section>
        </div>
    );
};

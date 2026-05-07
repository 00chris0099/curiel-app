import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon, type CustomIconName } from '../components/CustomIcon';
import { Loader } from '../components/Loader';
import inspectionService from '../services/inspection.service';
import { useAuthStore } from '../store/authStore';
import type { InspectionStats } from '../types';
import { canCreateInspection, canManageUsers } from '../utils/inspectionPermissions';

export const Dashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState<InspectionStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await inspectionService.getStats();
            setStats(data);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al cargar estadisticas'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <Loader fullScreen />;
    }

    const statsCards: Array<{ title: string; value: number; icon: CustomIconName; tone: 'cream' | 'amber' | 'blue' | 'sage' | 'rose'; accent: string }> = [
        { title: 'Total inspecciones', value: stats?.total || 0, icon: 'clipboard-check', tone: 'blue', accent: 'text-sky-700' },
        { title: 'Pendientes', value: stats?.pendiente || 0, icon: 'clock', tone: 'amber', accent: 'text-amber-700' },
        { title: 'En proceso', value: stats?.en_proceso || 0, icon: 'play', tone: 'cream', accent: 'text-slate-700' },
        { title: 'Finalizadas', value: stats?.finalizada || 0, icon: 'seal-check', tone: 'sage', accent: 'text-emerald-700' },
        { title: 'Canceladas', value: stats?.cancelada || 0, icon: 'x-circle', tone: 'rose', accent: 'text-rose-700' },
    ];

    const quickActions: Array<{ title: string; description: string; href: string; icon: CustomIconName; tone: 'cream' | 'mist' | 'blue' | 'sage' }> = [
        {
            title: 'Ver inspecciones',
            description: 'Consulta agenda, estados y avance operativo.',
            href: '/inspections',
            icon: 'folder-open',
            tone: 'cream',
        },
        {
            title: 'Mi perfil',
            description: 'Revisa datos personales y rol asignado.',
            href: '/profile',
            icon: 'user-gear',
            tone: 'mist',
        },
    ];

    if (canCreateInspection(user)) {
        quickActions.unshift({
            title: 'Nueva inspeccion',
            description: 'Registra un nuevo servicio tecnico en Lima.',
            href: '/inspections/create',
            icon: 'plus',
            tone: 'blue',
        });
    }

    if (canManageUsers(user)) {
        quickActions.push({
            title: 'Gestionar usuarios',
            description: 'Administra cuentas, roles y accesos internos.',
            href: '/users',
            icon: 'users',
            tone: 'sage',
        });
    }

    return (
        <div className="space-y-6 pb-10">
            <section className="card overflow-hidden">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="section-eyebrow">Panel de control</p>
                        <h1 className="mt-3 font-display text-3xl text-slate-900 sm:text-4xl">Bienvenido, {user?.firstName}</h1>
                        <p className="mt-3 text-slate-600">
                            Supervisa operaciones, estado de inspecciones y actividad del equipo desde una vista clara y consistente.
                        </p>
                        <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-[#f5efe1] px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80">
                            <CustomIcon name="dashboard" size="xs" tone="white" />
                            Rol activo: <span className="capitalize text-slate-900">{user?.role}</span>
                        </div>
                    </div>

                    {canCreateInspection(user) && (
                        <button
                            onClick={() => navigate('/inspections/create')}
                            className="btn btn-primary flex w-full items-center justify-center gap-3 sm:w-auto"
                        >
                            <CustomIcon name="plus" size="xs" tone="white" />
                            Nueva inspeccion
                        </button>
                    )}
                </div>
            </section>

            <section>
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <p className="section-eyebrow">Metricas</p>
                        <h2 className="mt-2 text-xl font-bold text-slate-900">Resumen operativo</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                    {statsCards.map((stat) => (
                        <div key={stat.title} className="card">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm text-slate-500">{stat.title}</p>
                                    <p className={`mt-3 text-3xl font-extrabold ${stat.accent}`}>{stat.value}</p>
                                </div>
                                <CustomIcon name={stat.icon} tone={stat.tone} size="md" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <div className="mb-4">
                    <p className="section-eyebrow">Acciones</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900">Atajos del equipo</h2>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.title}
                            onClick={() => navigate(action.href)}
                            className="card text-left transition-transform hover:-translate-y-0.5"
                        >
                            <CustomIcon name={action.icon} tone={action.tone} size="md" />
                            <h3 className="mt-5 text-lg font-semibold text-slate-900">{action.title}</h3>
                            <p className="mt-2 text-sm text-slate-600">{action.description}</p>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};

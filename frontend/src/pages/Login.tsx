import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { CustomIcon } from '../components/CustomIcon';
import { useAuthStore } from '../store/authStore';

export const Login = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading } = useAuthStore();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const success = await login(formData);
        if (success) {
            navigate('/dashboard');
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f5efe1_45%,_#eef3f7_100%)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_transparent_35%),linear-gradient(180deg,_#0f172a_0%,_#1e293b_45%,_#0f172a_100%)]">
            <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center py-10">
                <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[1.1fr_minmax(0,460px)] lg:items-center">
                    <section className="hidden rounded-[36px] border border-white/70 bg-white/80 p-10 shadow-[0_30px_80px_rgba(23,50,74,0.12)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-800/80 dark:shadow-[0_30px_80px_rgba(0,0,0,0.3)] lg:block">
                        <div className="flex items-center gap-4">
                            <CustomIcon name="dashboard" size="lg" tone="cream" />
                            <div>
                                <p className="section-eyebrow">CURIEL</p>
                                <h1 className="mt-2 font-display text-4xl text-slate-900 dark:text-slate-100">Inspección técnica, ordenada y visual.</h1>
                            </div>
                        </div>
                        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-400">
                            Coordina visitas, evidencia fotográfica, estados y reportes con una interfaz clara para operaciones de campo y administración.
                        </p>

                        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-[24px] bg-[#fbfbfa] p-4 ring-1 ring-slate-200/80 dark:bg-slate-700 dark:ring-slate-600/80">
                                <CustomIcon name="calendar" size="sm" tone="cream" />
                                <p className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Agenda técnica</p>
                            </div>
                            <div className="rounded-[24px] bg-[#fbfbfa] p-4 ring-1 ring-slate-200/80 dark:bg-slate-700 dark:ring-slate-600/80">
                                <CustomIcon name="camera" size="sm" tone="mist" />
                                <p className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Evidencia centralizada</p>
                            </div>
                            <div className="rounded-[24px] bg-[#fbfbfa] p-4 ring-1 ring-slate-200/80 dark:bg-slate-700 dark:ring-slate-600/80">
                                <CustomIcon name="file-pdf" size="sm" tone="blue" />
                                <p className="mt-4 font-semibold text-slate-900 dark:text-slate-100">Reportes listos</p>
                            </div>
                        </div>
                    </section>

                    <section className="card mx-auto w-full max-w-md lg:max-w-none">
                        <div className="mb-8 text-center">
                            <div className="mb-4 flex justify-center lg:hidden">
                                <CustomIcon name="dashboard" size="lg" tone="cream" />
                            </div>
                            <p className="section-eyebrow">Acceso seguro</p>
                            <h2 className="mt-2 font-display text-3xl text-slate-900 dark:text-slate-100">Iniciar sesión</h2>
                            <p className="mt-2 text-slate-600 dark:text-slate-400">Ingresa con tu cuenta para acceder al panel operativo.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Correo electrónico
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary flex w-full items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>
                                        <CustomIcon name="sync" size="xs" tone="white" spin />
                                        Iniciando sesión...
                                    </>
                                ) : (
                                    <>
                                        <CustomIcon name="arrow-right" size="xs" tone="white" />
                                        Iniciar sesión
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-4 text-center">
                            <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                                Olvidé mi contraseña
                            </Link>
                        </p>

                        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">© 2026 CURIEL. Todos los derechos reservados.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

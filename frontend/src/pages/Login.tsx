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
        <div className="min-h-screen bg-white dark:bg-gray-950">
            <div className="grid min-h-screen lg:grid-cols-2">
                {/* Left panel — branding (hidden on mobile) */}
                <div className="relative hidden overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
                    {/* Decorative blobs */}
                    <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
                    <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
                    <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/5 blur-3xl" />

                    {/* Logo + brand */}
                    <div className="relative z-10">
                        <div className="flex items-center gap-3">
                            <img src="/icon.jpeg" alt="CURIEL" className="h-10 w-10 rounded-xl object-cover" />
                            <span className="text-xl font-bold text-white">CURIEL</span>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="relative z-10 max-w-md">
                        <h1 className="text-4xl font-bold leading-tight text-white lg:text-5xl">
                            Inspeccion tecnica
                            <span className="mt-2 block text-red-400">inteligente.</span>
                        </h1>
                        <p className="mt-6 text-lg text-gray-400">
                            Coordina visitas, evidencia fotografica, estados y reportes con una interfaz clara para operaciones de campo.
                        </p>

                        {/* Stats */}
                        <div className="mt-12 grid grid-cols-3 gap-6">
                            <div>
                                <p className="text-3xl font-bold text-white">150+</p>
                                <p className="mt-1 text-sm text-gray-500">Inspecciones</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white">40%</p>
                                <p className="mt-1 text-sm text-gray-500">Mas eficiente</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-white">98%</p>
                                <p className="mt-1 text-sm text-gray-500">Satisfaccion</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="relative z-10">
                        <p className="text-sm text-gray-600">© 2026 CURIEL. Todos los derechos reservados.</p>
                    </div>
                </div>

                {/* Right panel — form */}
                <div className="flex items-center justify-center px-6 py-12 lg:px-12">
                    <div className="w-full max-w-sm">
                        {/* Mobile logo */}
                        <div className="mb-8 flex items-center gap-3 lg:hidden">
                            <img src="/icon.jpeg" alt="CURIEL" className="h-10 w-10 rounded-xl object-cover" />
                            <span className="text-xl font-bold text-gray-900 dark:text-white">CURIEL</span>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Bienvenido de vuelta
                            </h2>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Ingresa con tu cuenta para acceder al panel.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                            <div>
                                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Correo electronico
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <CustomIcon name="bell" size="xs" tone="mist" variant="plain" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="input pl-10"
                                        placeholder="tu@correo.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Contrasena
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        <CustomIcon name="settings" size="xs" tone="mist" variant="plain" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="input pl-10"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                                    Recordarme
                                </label>
                                <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                                    Olvide mi contrasena
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary flex w-full items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <CustomIcon name="sync" size="xs" tone="white" spin />
                                        Ingresando...
                                    </>
                                ) : (
                                    <>
                                        Iniciar sesion
                                        <CustomIcon name="arrow-right" size="xs" tone="white" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-3 text-gray-400 dark:bg-gray-950 dark:text-gray-500">o continua con</span>
                            </div>
                        </div>

                        {/* Google button */}
                        <button
                            type="button"
                            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continuar con Google
                        </button>

                        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No tienes cuenta?{' '}
                            <Link to="/forgot-password" className="font-medium text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300">
                                Contacta al administrador
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
        <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4 dark:bg-[#0f172a]">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="mb-8 flex justify-center">
                    <img src="/icon.jpeg" alt="CURIEL" className="h-12 w-12 rounded-xl object-cover" />
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                    <div className="mb-6 text-center">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Iniciar sesion</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ingresa con tu cuenta para acceder.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Correo electronico
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
                                placeholder="tu@correo.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Contrasena
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
                            className="btn btn-primary flex w-full items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <CustomIcon name="sync" size="xs" tone="white" spin />
                                    Ingresando...
                                </>
                            ) : (
                                <>
                                    <CustomIcon name="arrow-right" size="xs" tone="white" />
                                    Ingresar
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        <Link to="/forgot-password" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                            Olvide mi contrasena
                        </Link>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
                    CURIEL — Inspeccion tecnica
                </p>
            </div>
        </div>
    );
};

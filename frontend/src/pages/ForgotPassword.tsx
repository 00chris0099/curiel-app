import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import apiClient from '../api/axios';

export const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error('Ingresa tu email');
            return;
        }

        setIsLoading(true);
        try {
            await apiClient.post('/auth/forgot-password', { email: email.trim() });
            setSent(true);
            toast.success('Si el email esta registrado, recibiras un enlace');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al enviar el enlace'));
        } finally {
            setIsLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f5efe1_45%,_#eef3f7_100%)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_transparent_35%),linear-gradient(180deg,_#0f172a_0%,_#1e293b_45%,_#0f172a_100%)]">
                <div className="mx-auto flex min-h-screen max-w-md items-center justify-center py-10">
                    <div className="card w-full space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                <CustomIcon name="seal-check" size="lg" tone="sage" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Email enviado</h1>
                            <p className="mt-3 text-slate-600 dark:text-slate-400">
                                Si el email <strong>{email}</strong> esta registrado en nuestro sistema, recibiras un enlace para restablecer tu contrasena.
                            </p>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                Revisa tu bandeja de entrada y la carpeta de spam.
                            </p>
                        </div>
                        <Link to="/login" className="btn btn-primary inline-flex items-center justify-center gap-2">
                            <CustomIcon name="arrow-left" size="xs" tone="white" />
                            Volver al login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f5efe1_45%,_#eef3f7_100%)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_transparent_35%),linear-gradient(180deg,_#0f172a_0%,_#1e293b_45%,_#0f172a_100%)]">
            <div className="mx-auto flex min-h-screen max-w-md items-center justify-center py-10">
                <div className="card w-full space-y-6">
                    <div className="text-center">
                        <div className="mb-4 flex justify-center">
                            <CustomIcon name="warning-circle" size="lg" tone="amber" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Olvide mi contrasena</h1>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">
                            Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                            <input
                                type="email"
                                className="input"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full"
                        >
                            {isLoading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
                        </button>
                    </form>

                    <div className="text-center">
                        <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                            Volver al login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

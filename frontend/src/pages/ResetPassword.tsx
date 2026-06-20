import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import { CustomIcon } from '../components/CustomIcon';
import apiClient from '../api/axios';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f5efe1_45%,_#eef3f7_100%)] px-4">
                <div className="mx-auto flex min-h-screen max-w-md items-center justify-center py-10">
                    <div className="card w-full space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                                <CustomIcon name="warning-circle" size="lg" tone="rose" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Token no valido</h1>
                            <p className="mt-3 text-slate-600">
                                El enlace de restablecimiento no es valido o ha expirado.
                            </p>
                        </div>
                        <Link to="/forgot-password" className="btn btn-primary inline-flex items-center justify-center gap-2">
                            Solicitar nuevo enlace
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!newPassword) {
            toast.error('Ingresa una nueva contrasena');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('La contrasena debe tener al menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Las contrasenas no coinciden');
            return;
        }

        setIsLoading(true);
        try {
            await apiClient.post('/auth/reset-password', { token, newPassword });
            setSuccess(true);
            toast.success('Contrasena restablecida exitosamente');
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Error al restablecer la contrasena'));
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f5efe1_45%,_#eef3f7_100%)] px-4">
                <div className="mx-auto flex min-h-screen max-w-md items-center justify-center py-10">
                    <div className="card w-full space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                                <CustomIcon name="seal-check" size="lg" tone="sage" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Contrasena restablecida</h1>
                            <p className="mt-3 text-slate-600">
                                Tu contrasena ha sido actualizada. Ya puedes iniciar sesion con tu nueva contrasena.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn btn-primary"
                        >
                            Ir al login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f5efe1_45%,_#eef3f7_100%)] px-4">
            <div className="mx-auto flex min-h-screen max-w-md items-center justify-center py-10">
                <div className="card w-full space-y-6">
                    <div className="text-center">
                        <div className="mb-4 flex justify-center">
                            <CustomIcon name="warning-circle" size="lg" tone="amber" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Nueva contrasena</h1>
                        <p className="mt-2 text-slate-600">
                            Ingresa tu nueva contrasena.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Nueva contrasena</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Minimo 6 caracteres"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Confirmar contrasena</label>
                            <input
                                type="password"
                                className="input"
                                placeholder="Repite tu contrasena"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full"
                        >
                            {isLoading ? 'Restableciendo...' : 'Restablecer contrasena'}
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

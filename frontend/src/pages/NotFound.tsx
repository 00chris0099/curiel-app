import { useNavigate } from 'react-router-dom';
import { CustomIcon } from '../components/CustomIcon';

export const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--surface-app)] px-4">
            <div className="card max-w-md space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--surface-cream)]">
                        <CustomIcon name="warning-circle" size="lg" tone="rose" />
                    </div>
                </div>

                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
                        Error 404
                    </p>
                    <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Pagina no encontrada
                    </h1>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        La pagina que buscas no existe o fue movida a otra ubicacion.
                    </p>
                </div>

                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-primary flex items-center justify-center gap-2"
                    >
                        <CustomIcon name="house" size="xs" tone="white" />
                        Ir al dashboard
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn btn-secondary flex items-center justify-center gap-2"
                    >
                        <CustomIcon name="arrow-left" size="xs" tone="mist" />
                        Volver
                    </button>
                </div>
            </div>
        </div>
    );
};

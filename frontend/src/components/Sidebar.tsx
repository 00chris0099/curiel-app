import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CustomIcon, type CustomIconName } from './CustomIcon';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { user } = useAuthStore();

    const navigation: Array<{ name: string; href: string; icon: CustomIconName; roles: string[] }> = [
        { name: 'Dashboard', href: '/dashboard', icon: 'dashboard', roles: ['admin', 'arquitecto', 'inspector', 'supervisor'] },
        { name: 'Panel Supervisor', href: '/supervisor', icon: 'clipboard-check', roles: ['supervisor', 'admin'] },
        { name: 'Alertas', href: '/alerts', icon: 'warning-circle', roles: ['supervisor', 'admin'] },
        { name: 'Evaluaciones', href: '/evaluations', icon: 'clipboard-check', roles: ['supervisor', 'admin'] },
        { name: 'Suspensiones', href: '/suspensions', icon: 'pause', roles: ['supervisor', 'admin'] },
        { name: 'Acciones', href: '/supervisor/actions', icon: 'x-circle', roles: ['supervisor', 'admin'] },
        { name: 'Inspecciones', href: '/inspections', icon: 'clipboard-check', roles: ['admin', 'arquitecto', 'inspector', 'supervisor'] },
        { name: 'Clientes', href: '/clients', icon: 'users', roles: ['admin'] },
        { name: 'Usuarios', href: '/users', icon: 'users', roles: ['admin'] },
        { name: 'Configuracion', href: '/config', icon: 'settings', roles: ['admin'] },
    ];

    const filteredNavigation = navigation.filter((item) => item.roles.includes(user?.role || ''));

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-[#17324a]/28 backdrop-blur-[3px] dark:bg-slate-950/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`
                    fixed bottom-0 left-0 top-0 z-50 flex w-[min(20rem,88vw)] flex-col overflow-hidden border-r border-slate-200 bg-[#fcfcfa] shadow-[0_24px_60px_rgba(23,50,74,0.14)] transition-transform duration-300
                    dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_24px_60px_rgba(0,0,0,0.4)]
                    lg:top-20 lg:w-64 lg:max-w-none lg:translate-x-0 lg:rounded-r-[32px] lg:shadow-none
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700 lg:hidden">
                    <img src="/icon.jpeg" alt="CURIEL" className="h-9 w-9 rounded-xl object-cover" />
                    <button
                        onClick={onClose}
                        className="min-h-11 min-w-11 flex items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        aria-label="Cerrar menu"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                    {filteredNavigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => onClose()}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-[22px] px-4 py-3 transition-all ${isActive
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700'
                                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <CustomIcon name={item.icon} size="sm" tone={isActive ? 'cream' : 'mist'} />
                                    <span className="font-semibold">{item.name}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
};

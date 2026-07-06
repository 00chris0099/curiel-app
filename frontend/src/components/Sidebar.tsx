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
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`
                    fixed bottom-0 left-0 top-0 z-50 flex w-60 flex-col overflow-hidden border-r border-gray-200 bg-white transition-transform duration-200
                    dark:border-gray-800 dark:bg-gray-950
                    lg:top-[3.5rem] lg:translate-x-0 lg:rounded-r-none lg:shadow-none
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800 lg:hidden">
                    <img src="/icon.jpeg" alt="CURIEL" className="h-8 w-8 rounded-lg object-cover" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">CURIEL</span>
                    <button
                        onClick={onClose}
                        className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                        aria-label="Cerrar menu"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
                    {filteredNavigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => onClose()}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <CustomIcon name={item.icon} size="xs" tone={isActive ? 'blue' : 'mist'} />
                                    <span>{item.name}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
};

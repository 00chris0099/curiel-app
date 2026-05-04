import { Home, ClipboardList, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { user } = useAuthStore();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'arquitecto', 'inspector'] },
        { name: 'Inspecciones', href: '/inspections', icon: ClipboardList, roles: ['admin', 'arquitecto', 'inspector'] },
        { name: 'Usuarios', href: '/users', icon: Users, roles: ['admin'] },
    ];

    // Filtrar navegación según rol del usuario
    const filteredNavigation = navigation.filter((item) =>
        item.roles.includes(user?.role || '')
    );

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed bottom-0 left-0 top-0 z-50 flex w-72 max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 dark:border-gray-700 dark:bg-gray-800
          lg:top-16 lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                {/* Header (mobile only) */}
                <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-primary-600">CURIEL</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                    {filteredNavigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => onClose()}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="mt-auto border-t border-gray-200 p-4 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        <p>Sistema de Inspecciones</p>
                        <p className="mt-1">v1.0.0</p>
                    </div>
                </div>
            </aside>
        </>
    );
};

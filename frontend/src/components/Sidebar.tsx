import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CustomIcon, type CustomIconName } from './CustomIcon';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

type NavSection = {
    title: string;
    items: Array<{ name: string; href: string; icon: CustomIconName; roles: string[] }>;
};

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { user } = useAuthStore();
    const [collapsed, setCollapsed] = useState(false);

    const sections: NavSection[] = [
        {
            title: '',
            items: [
                { name: 'Dashboard', href: '/dashboard', icon: 'dashboard', roles: ['admin', 'arquitecto', 'inspector', 'supervisor'] },
            ],
        },
        {
            title: 'Operaciones',
            items: [
                { name: 'Inspecciones', href: '/inspections', icon: 'clipboard-check', roles: ['admin', 'arquitecto', 'inspector', 'supervisor'] },
                { name: 'Panel Supervisor', href: '/supervisor', icon: 'clipboard-check', roles: ['supervisor', 'admin'] },
                { name: 'Alertas', href: '/alerts', icon: 'warning-circle', roles: ['supervisor', 'admin'] },
                { name: 'Evaluaciones', href: '/evaluations', icon: 'clipboard-check', roles: ['supervisor', 'admin'] },
                { name: 'Suspensiones', href: '/suspensions', icon: 'pause', roles: ['supervisor', 'admin'] },
                { name: 'Acciones', href: '/supervisor/actions', icon: 'x-circle', roles: ['supervisor', 'admin'] },
            ],
        },
        {
            title: 'Gestion',
            items: [
                { name: 'Clientes', href: '/clients', icon: 'users', roles: ['admin'] },
                { name: 'Usuarios', href: '/users', icon: 'users', roles: ['admin'] },
                { name: 'Configuracion', href: '/config', icon: 'settings', roles: ['admin'] },
            ],
        },
    ];

    const sidebarWidth = collapsed ? 'w-16' : 'w-64';

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed bottom-0 left-0 top-0 z-50 flex flex-col border-r border-gray-200 bg-white transition-all duration-300
                    dark:border-gray-800 dark:bg-gray-950
                    ${sidebarWidth}
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Logo */}
                <div className={`flex h-16 items-center gap-3 border-b border-gray-100 px-4 dark:border-gray-800 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#17324a]">
                        <CustomIcon name="buildings" size="xs" tone="white" />
                    </div>
                    {!collapsed && (
                        <span className="text-sm font-bold text-gray-900 dark:text-white">CURIEL</span>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3">
                    {sections.map((section) => {
                        const visibleItems = section.items.filter((item) => item.roles.includes(user?.role || ''));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={section.title} className="mb-4">
                                {section.title && !collapsed && (
                                    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        {section.title}
                                    </p>
                                )}
                                <div className="space-y-0.5">
                                    {visibleItems.map((item) => (
                                        <NavLink
                                            key={item.name}
                                            to={item.href}
                                            onClick={() => onClose()}
                                            title={collapsed ? item.name : undefined}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                                    isActive
                                                        ? 'bg-[#17324a]/5 text-[#17324a] dark:bg-[#17324a]/10 dark:text-blue-400'
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white'
                                                } ${collapsed ? 'justify-center px-2' : ''}`
                                            }
                                        >
                                            <CustomIcon name={item.icon} size="xs" tone="mist" />
                                            {!collapsed && <span>{item.name}</span>}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Collapse toggle (desktop only) */}
                <div className="hidden border-t border-gray-100 p-3 dark:border-gray-800 lg:block">
                    <button
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <CustomIcon name={collapsed ? 'arrow-right' : 'arrow-left'} size="xs" tone="mist" />
                        {!collapsed && <span>Colapsar</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

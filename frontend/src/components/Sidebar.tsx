import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CustomIcon, type CustomIconName } from './CustomIcon';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

type NavSection = {
    title: string;
    items: Array<{ name: string; href: string; icon: CustomIconName; roles: string[] }>;
};

export const Sidebar = ({ isOpen, onClose, collapsed = false, onToggleCollapse }: SidebarProps) => {
    const { user } = useAuthStore();
    const [localCollapsed, setLocalCollapsed] = useState(false);
    const isCollapsed = onToggleCollapse ? collapsed : localCollapsed;
    const handleToggle = onToggleCollapse ?? (() => setLocalCollapsed(!localCollapsed));

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
            title: 'Gestión',
            items: [
                { name: 'Clientes', href: '/clients', icon: 'users', roles: ['admin'] },
                { name: 'Usuarios', href: '/users', icon: 'users', roles: ['admin'] },
                { name: 'Configuración', href: '/config', icon: 'settings', roles: ['admin'] },
            ],
        },
    ];

    const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

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
                {/* Logo & Desktop Collapse Trigger */}
                <div className={`flex h-16 items-center border-b border-gray-100 px-3 dark:border-gray-800 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <button
                        type="button"
                        onClick={handleToggle}
                        title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                        className={`group flex items-center gap-3 rounded-xl p-1.5 text-left transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${isCollapsed ? 'w-auto justify-center' : 'w-full'}`}
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#17324a] shadow-sm transition-transform group-hover:scale-105">
                            <CustomIcon name="buildings" size="xs" tone="white" />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-1 items-center justify-between min-w-0">
                                <div>
                                    <span className="block text-sm font-extrabold tracking-wider text-[#17324a] dark:text-white">CURIEL</span>
                                    <span className="block text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Inspecciones</span>
                                </div>
                                <span className="text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300">
                                    <CustomIcon name={isCollapsed ? 'arrow-right' : 'arrow-left'} size="xs" tone="mist" />
                                </span>
                            </div>
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-3">
                    {sections.map((section) => {
                        const visibleItems = section.items.filter((item) => item.roles.includes(user?.role || ''));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={section.title || 'main'}>
                                {section.title && !isCollapsed && (
                                    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        {section.title}
                                    </p>
                                )}
                                <div className="space-y-1">
                                    {visibleItems.map((item) => (
                                        <NavLink
                                            key={item.name}
                                            to={item.href}
                                            end={item.href === '/supervisor' || item.href === '/dashboard'}
                                            onClick={() => onClose()}
                                            title={isCollapsed ? item.name : undefined}
                                            className={({ isActive }) =>
                                                `group relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
                                                    isCollapsed
                                                        ? 'h-10 w-10 justify-center p-0 mx-auto'
                                                        : 'px-3 py-2.5 text-sm font-medium'
                                                } ${
                                                    isActive
                                                        ? 'bg-[#17324a] text-white shadow-md ring-2 ring-[#17324a]/20 dark:bg-blue-600 dark:ring-blue-600/30'
                                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-white'
                                                }`
                                            }
                                        >
                                            {({ isActive }) => (
                                                <>
                                                    <span className="flex shrink-0 items-center justify-center">
                                                        <CustomIcon name={item.icon} size="xs" tone={isActive ? 'white' : 'mist'} />
                                                    </span>
                                                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                                                </>
                                            )}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
};

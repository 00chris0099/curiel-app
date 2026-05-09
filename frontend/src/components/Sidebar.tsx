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
        { name: 'Dashboard', href: '/dashboard', icon: 'dashboard', roles: ['admin', 'arquitecto', 'inspector'] },
        { name: 'Inspecciones', href: '/inspections', icon: 'clipboard-check', roles: ['admin', 'arquitecto', 'inspector'] },
        { name: 'Usuarios', href: '/users', icon: 'users', roles: ['admin'] },
    ];

    const filteredNavigation = navigation.filter((item) => item.roles.includes(user?.role || ''));

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-[#17324a]/28 backdrop-blur-[3px] lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`
                    fixed bottom-0 left-0 top-0 z-50 flex w-[min(20rem,88vw)] flex-col overflow-hidden border-r border-slate-200 bg-[#fcfcfa] shadow-[0_24px_60px_rgba(23,50,74,0.14)] transition-transform duration-300
                    lg:top-20 lg:w-64 lg:max-w-none lg:translate-x-0 lg:rounded-r-[32px] lg:shadow-none
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 lg:hidden">
                    <div>
                        <p className="section-eyebrow">Panel</p>
                        <h2 className="font-display text-2xl text-slate-900">CURIEL</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="border-b border-slate-200 px-5 py-6">
                    <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                        <p className="section-eyebrow">Navegacion</p>
                        <p className="mt-2 text-sm text-slate-600">Inspecciones, usuarios y operacion tecnica en una sola vista.</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                    {filteredNavigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            onClick={() => onClose()}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-[22px] px-4 py-3 transition-all ${isActive
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
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

                <div className="mt-auto border-t border-slate-200 p-4">
                    <div className="rounded-[24px] bg-white px-4 py-4 ring-1 ring-slate-200/80">
                        <div className="flex items-center gap-3">
                            <CustomIcon name="house" size="sm" tone="cream" />
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Sistema de inspecciones</p>
                                <p className="text-xs text-slate-500">Version 1.0.0</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

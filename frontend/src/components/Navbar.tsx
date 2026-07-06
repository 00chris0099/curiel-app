import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { CustomIcon } from './CustomIcon';
import { NotificationDropdown } from './NotificationDropdown';
import ConnectionStatus from './ConnectionStatus';

interface NavbarProps {
    onMenuClick: () => void;
}

export const Navbar = ({ onMenuClick }: NavbarProps) => {
    const { user, logout } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <nav className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90">
            <div className="flex h-16 items-center justify-between gap-2 px-3 sm:h-20 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                    <button
                        onClick={onMenuClick}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:rounded-2xl sm:px-3 sm:gap-2 lg:hidden"
                        aria-label="Abrir menu lateral"
                    >
                        <CustomIcon name="dashboard" size="xs" tone="blue" variant="plain" />
                        <span className="hidden sm:inline">Menu</span>
                    </button>

                    <div className="min-w-0">
                        <img src="/icon.jpeg" alt="CURIEL" className="h-8 w-8 rounded-lg object-cover sm:h-10 sm:w-10" />
                    </div>
                </div>

                <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
                    <button
                        onClick={toggleTheme}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:rounded-2xl sm:px-3 sm:gap-2"
                        aria-label="Cambiar tema"
                    >
                        <CustomIcon name="settings" size="xs" tone={isDark ? 'blue' : 'cream'} variant="plain" />
                        <span className="hidden sm:inline">{isDark ? 'Modo claro' : 'Modo suave'}</span>
                    </button>

                    <NotificationDropdown />

                    <div className="min-w-0 flex-shrink-0">
                        <ConnectionStatus variant="navbar" />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 sm:rounded-2xl sm:gap-3 sm:p-2"
                            aria-label="Menu de usuario"
                            aria-expanded={showUserMenu}
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#17324a] text-xs font-semibold text-white sm:h-10 sm:w-10 sm:rounded-2xl sm:text-sm">
                                {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="hidden text-left md:block">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.fullName}</p>
                                <p className="text-xs capitalize text-slate-600 dark:text-slate-400">{user?.role}</p>
                            </div>
                            <CustomIcon name="dots-three" size="xs" tone="mist" />
                        </button>

                        {showUserMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                                <div className="absolute right-0 z-20 mt-3 w-56 max-w-[calc(100vw-1rem)] rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(23,50,74,0.16)] dark:border-slate-700 dark:bg-slate-800">
                                    <a
                                        href="/profile"
                                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <CustomIcon name="user-gear" size="xs" tone="cream" />
                                        Mi perfil
                                    </a>
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                                    >
                                        <span>Cerrar sesion</span>
                                        <CustomIcon name="arrow-right" size="xs" tone="rose" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

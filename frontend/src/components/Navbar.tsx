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
        <nav className="fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
            <div className="flex h-14 items-center justify-between gap-2 px-4 sm:h-[3.5rem] sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-2">
                    <button
                        onClick={onMenuClick}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
                        aria-label="Abrir menu lateral"
                    >
                        <CustomIcon name="dashboard" size="xs" tone="blue" variant="plain" />
                    </button>

                    <div className="min-w-0">
                        <img src="/icon.jpeg" alt="CURIEL" className="h-7 w-7 rounded-lg object-cover sm:h-8 sm:w-8" />
                    </div>
                </div>

                <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
                    <button
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        aria-label="Cambiar tema"
                    >
                        <CustomIcon name={isDark ? 'house' : 'settings'} size="xs" tone={isDark ? 'blue' : 'cream'} variant="plain" />
                    </button>

                    <NotificationDropdown />

                    <div className="min-w-0 flex-shrink-0">
                        <ConnectionStatus variant="navbar" />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex h-9 items-center gap-2 rounded-lg px-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                            aria-label="Menu de usuario"
                            aria-expanded={showUserMenu}
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#17324a] text-[10px] font-bold text-white">
                                {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="hidden text-left md:block">
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">{user?.fullName}</p>
                                <p className="text-[10px] capitalize text-gray-500 dark:text-gray-400">{user?.role}</p>
                            </div>
                        </button>

                        {showUserMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                                <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                                    <a
                                        href="/profile"
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                        onClick={() => setShowUserMenu(false)}
                                    >
                                        <CustomIcon name="user-gear" size="xs" tone="cream" />
                                        Mi perfil
                                    </a>
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    >
                                        <CustomIcon name="arrow-right" size="xs" tone="rose" />
                                        Cerrar sesion
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

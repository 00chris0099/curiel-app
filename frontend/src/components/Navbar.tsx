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
        <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
                {/* Left: hamburger + logo (mobile) */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onMenuClick}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
                        aria-label="Abrir menu"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <div className="hidden lg:block" />
                </div>

                {/* Right: theme, notifications, connection, user */}
                <div className="flex items-center gap-1">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        aria-label="Cambiar tema"
                    >
                        {isDark ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                            </svg>
                        )}
                    </button>

                    {/* Notifications */}
                    <NotificationDropdown />

                    {/* Connection toggle */}
                    <div className="flex items-center px-1">
                        <ConnectionStatus />
                    </div>

                    {/* User dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex h-9 items-center gap-2 rounded-lg px-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
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
                                <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                                    <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                                    </div>
                                    <div className="py-1">
                                        <a
                                            href="/profile"
                                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            <CustomIcon name="user-gear" size="xs" tone="cream" />
                                            Mi perfil
                                        </a>
                                        <a
                                            href="/config"
                                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            <CustomIcon name="settings" size="xs" tone="cream" />
                                            Configuracion
                                        </a>
                                    </div>
                                    <div className="border-t border-gray-100 py-1 dark:border-gray-800">
                                        <button
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            <CustomIcon name="arrow-right" size="xs" tone="rose" />
                                            Cerrar sesion
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

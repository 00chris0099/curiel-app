import { create } from 'zustand';

interface ThemeState {
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
}

// Leer tema inicial de localStorage
const getInitialTheme = (): boolean => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
};

export const useThemeStore = create<ThemeState>((set) => ({
    isDark: getInitialTheme(),

    toggleTheme: () => {
        set((state) => {
            const newIsDark = !state.isDark;

            // Actualizar DOM
            if (newIsDark) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }

            return { isDark: newIsDark };
        });
    },

    setTheme: (isDark) => {
        // Actualizar DOM
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }

        set({ isDark });
    },
}));

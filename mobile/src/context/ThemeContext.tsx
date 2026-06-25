import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({});

const STORAGE_KEY = '@curiel_theme';

export const THEMES = {
    light: {
        isDark: false,
        colors: {
            primary: '#1a237e',
            primaryLight: '#e8eaf6',
            error: '#f44336',
            success: '#4caf50',
            warning: '#ff9800',
            info: '#2196f3',
            text: '#333333',
            textSecondary: '#666666',
            textMuted: '#999999',
            textOnPrimary: '#ffffff',
            border: '#dddddd',
            borderLight: '#f0f0f0',
            bg: '#f5f5f5',
            card: '#ffffff',
            inputBg: '#ffffff',
            inputBorder: '#dddddd',
            placeholder: '#999999',
            headerBg: '#1a237e',
            headerText: '#ffffff',
            statusBar: 'dark-content',
            shadow: '#000000',
            overlay: 'rgba(0,0,0,0.5)',
            divider: '#f0f0f0',
            surface: '#ffffff',
            surfaceVariant: '#f9fafb',
            online: '#4caf50',
            offline: '#f44336',
            fab: '#1a237e',
            danger: '#f44336',
            dangerBg: '#ffebee',
            warningBg: '#fff3e0',
            successBg: '#e8f5e9',
            infoBg: '#e3f2fd',
            selectedBg: '#e8f5e9',
            selectedText: '#2e7d32',
            skeleton: '#e5e7eb',
            skeletonHighlight: '#f3f4f6',
        },
    },
    dark: {
        isDark: true,
        colors: {
            primary: '#5c6bc0',
            primaryLight: '#1e2248',
            error: '#ef5350',
            success: '#66bb6a',
            warning: '#ffa726',
            info: '#42a5f5',
            text: '#e2e8f0',
            textSecondary: '#94a3b8',
            textMuted: '#64748b',
            textOnPrimary: '#ffffff',
            border: '#334155',
            borderLight: '#1e293b',
            bg: '#0f172a',
            card: '#1e293b',
            inputBg: '#1e293b',
            inputBorder: '#334155',
            placeholder: '#64748b',
            headerBg: '#0f172a',
            headerText: '#e2e8f0',
            statusBar: 'light-content',
            shadow: '#000000',
            overlay: 'rgba(0,0,0,0.7)',
            divider: '#1e293b',
            surface: '#1e293b',
            surfaceVariant: '#0f172a',
            online: '#66bb6a',
            offline: '#ef5350',
            fab: '#5c6bc0',
            danger: '#ef5350',
            dangerBg: '#3b1219',
            warningBg: '#3b2e1a',
            successBg: '#1a3b2a',
            infoBg: '#1a2e3b',
            selectedBg: '#1a2e3b',
            selectedText: '#66bb6a',
            skeleton: '#334155',
            skeletonHighlight: '#475569',
        },
    },
};

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored !== null) {
                setIsDark(stored === 'dark');
            }
        } catch (e) {
            console.error('Error loading theme:', e);
        } finally {
            setLoaded(true);
        }
    };

    const toggleTheme = async () => {
        const next = !isDark;
        setIsDark(next);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
        } catch (e) {
            console.error('Error saving theme:', e);
        }
    };

    const theme = isDark ? THEMES.dark : THEMES.light;

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme, loaded }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context || !context.theme) {
        return { theme: THEMES.light, isDark: false, toggleTheme: () => {}, loaded: true };
    }
    return context;
};

export default ThemeContext;

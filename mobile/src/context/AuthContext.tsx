import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, registerAuthFailureHandler } from '../services/api';
import { getDB, closeDB } from '../database/schema';
import config from '../config';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        loadStoredUser();

        // Register auth failure handler for API interceptor
        registerAuthFailureHandler(() => {
            setUser(null);
            setIsAuthenticated(false);
        });

        return () => registerAuthFailureHandler(null);
    }, []);

    const loadStoredUser = async () => {
        try {
            const [token, userData] = await AsyncStorage.multiGet([
                config.STORAGE_KEYS.AUTH_TOKEN,
                config.STORAGE_KEYS.USER_DATA
            ]);

            if (token[1] && userData[1]) {
                setUser(JSON.parse(userData[1]));
                setIsAuthenticated(true);
                // Initialize SQLite DB on startup if already authenticated
                await getDB();
            }
        } catch (error) {
            console.error('Error al cargar usuario:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await authService.login(email, password);

            if (response.success) {
                const { user: userData, token, refreshToken } = response.data;

                await AsyncStorage.multiSet([
                    [config.STORAGE_KEYS.AUTH_TOKEN, token],
                    [config.STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
                    [config.STORAGE_KEYS.USER_DATA, JSON.stringify(userData)]
                ]);

                // Initialize SQLite DB after login
                await getDB();

                setUser(userData);
                setIsAuthenticated(true);

                return { success: true };
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Error al iniciar sesion';
            return { success: false, error: message };
        }
    };

    const logout = async () => {
        try {
            const refreshToken = await AsyncStorage.getItem(config.STORAGE_KEYS.REFRESH_TOKEN);
            if (refreshToken) {
                await authService.logout(refreshToken);
            }

            await AsyncStorage.multiRemove([
                config.STORAGE_KEYS.AUTH_TOKEN,
                config.STORAGE_KEYS.REFRESH_TOKEN,
                config.STORAGE_KEYS.USER_DATA,
                config.STORAGE_KEYS.CACHED_INSPECTIONS
            ]);

            // Close SQLite DB on logout
            await closeDB();

            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Error al cerrar sesion:', error);
        }
    };

    const updateUser = async (userData) => {
        try {
            const response = await authService.updateProfile(userData);

            if (response.success) {
                const updatedUser = response.data.user;
                await AsyncStorage.setItem(
                    config.STORAGE_KEYS.USER_DATA,
                    JSON.stringify(updatedUser)
                );
                setUser(updatedUser);
                return { success: true };
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Error al actualizar perfil';
            return { success: false, error: message };
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        logout,
        updateUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
};

export default AuthContext;

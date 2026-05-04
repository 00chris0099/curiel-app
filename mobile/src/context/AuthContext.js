import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';
import config from '../config';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Cargar usuario al iniciar
    useEffect(() => {
        loadStoredUser();
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
                const { user: userData, token } = response.data;

                // Guardar en AsyncStorage
                await AsyncStorage.multiSet([
                    [config.STORAGE_KEYS.AUTH_TOKEN, token],
                    [config.STORAGE_KEYS.USER_DATA, JSON.stringify(userData)]
                ]);

                setUser(userData);
                setIsAuthenticated(true);

                return { success: true };
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Error al iniciar sesión';
            return { success: false, error: message };
        }
    };

    const logout = async () => {
        try {
            await AsyncStorage.multiRemove([
                config.STORAGE_KEYS.AUTH_TOKEN,
                config.STORAGE_KEYS.USER_DATA,
                config.STORAGE_KEYS.CACHED_INSPECTIONS
            ]);

            setUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
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

import React, { useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OfflineProvider } from './src/context/OfflineContext';
import { ActivityIndicator, View } from 'react-native';
import ErrorBoundary from './src/components/ErrorBoundary';
import { VideoSplashScreen } from './src/components/VideoSplashScreen';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import InspectionDetailScreen from './src/screens/InspectionDetailScreen';
import ExecutionScreen from './src/screens/ExecutionScreen';
import PhotoCaptureScreen from './src/screens/PhotoCaptureScreen';
import ConflictResolutionScreen from './src/screens/ConflictResolutionScreen';
import OfflineStatusScreen from './src/screens/OfflineStatusScreen';
import CreateInspectionScreen from './src/screens/CreateInspectionScreen';
import AreaDetailScreen from './src/screens/AreaDetailScreen';
import ObservationFormScreen from './src/screens/ObservationFormScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createStackNavigator();

const Navigation = () => {
    const { isAuthenticated, loading } = useAuth();
    const [splashDone, setSplashDone] = useState(false);

    const handleSplashFinish = useCallback(() => {
        setSplashDone(true);
    }, []);

    if (loading || !splashDone) {
        return (
            <VideoSplashScreen onFinish={handleSplashFinish} />
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#1a237e'
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold'
                    }
                }}
            >
                {!isAuthenticated ? (
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                ) : (
                    <>
                        <Stack.Screen
                            name="Home"
                            component={HomeScreen}
                            options={{
                                title: 'CURIEL - Inspecciones',
                                headerLeft: null
                            }}
                        />
                        <Stack.Screen
                            name="InspectionDetail"
                            component={InspectionDetailScreen}
                            options={{ title: 'Detalle de Inspeccion' }}
                        />
                        <Stack.Screen
                            name="Execution"
                            component={ExecutionScreen}
                            options={{ title: 'Ejecucion' }}
                        />
                        <Stack.Screen
                            name="PhotoCapture"
                            component={PhotoCaptureScreen}
                            options={{ title: 'Tomar Foto', headerShown: false }}
                        />
                        <Stack.Screen
                            name="AreaDetail"
                            component={AreaDetailScreen}
                            options={{ title: 'Detalle de Area' }}
                        />
                        <Stack.Screen
                            name="ObservationForm"
                            component={ObservationFormScreen}
                            options={{ title: 'Observacion' }}
                        />
                        <Stack.Screen
                            name="ConflictResolution"
                            component={ConflictResolutionScreen}
                            options={{ title: 'Conflictos' }}
                        />
                        <Stack.Screen
                            name="OfflineStatus"
                            component={OfflineStatusScreen}
                            options={{ title: 'Estado Offline' }}
                        />
                        <Stack.Screen
                            name="CreateInspection"
                            component={CreateInspectionScreen}
                            options={{ title: 'Nueva Inspeccion' }}
                        />
                        <Stack.Screen
                            name="Profile"
                            component={ProfileScreen}
                            options={{ title: 'Mi Perfil' }}
                        />
                        <Stack.Screen
                            name="Settings"
                            component={SettingsScreen}
                            options={{ title: 'Configuracion' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <OfflineProvider>
                    <Navigation />
                </OfflineProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

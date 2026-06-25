import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { createStyles } from '../utils/sharedStyles';

const LoginScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    const loginStyles = StyleSheet.create({
        content: {
            flex: 1,
            padding: 24,
            justifyContent: 'center'
        },
        logoContainer: {
            alignItems: 'center',
            marginBottom: 48
        },
        logoPlaceholder: {
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: theme.colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16
        },
        logoText: {
            fontSize: 32,
            fontWeight: 'bold',
            color: '#fff'
        },
        form: {
            marginBottom: 24
        },
        button: {
            backgroundColor: theme.colors.primary,
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            marginTop: 8
        },
        buttonDisabled: {
            opacity: 0.6
        },
        buttonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '600'
        }
    });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        const result = await login(email, password);
        setLoading(false);

        if (!result.success) {
            Alert.alert('Error', result.error);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={loginStyles.content}>
                {/* Logo */}
                <View style={loginStyles.logoContainer}>
                    <View style={loginStyles.logoPlaceholder}>
                        <Text style={loginStyles.logoText}>CURIEL</Text>
                    </View>
                    <Text style={styles.secondaryText}>Inspecciones Técnicas</Text>
                </View>

                {/* Formulario */}
                <View style={loginStyles.form}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="tu@email.com"
                        placeholderTextColor={theme.colors.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                    />

                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={theme.colors.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        editable={!loading}
                    />

                    <TouchableOpacity
                        style={[styles.buttonPrimary, loading && loginStyles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={theme.colors.textOnPrimary} />
                        ) : (
                            <Text style={styles.buttonText}>Iniciar Sesión</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;

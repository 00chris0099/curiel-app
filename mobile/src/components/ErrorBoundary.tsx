import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.emoji}>!</Text>
                    <Text style={styles.title}>Algo salio mal</Text>
                    <Text style={styles.message}>
                        {this.state.error?.message || 'Ocurrio un error inesperado'}
                    </Text>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry}>
                            <Text style={styles.retryBtnText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 24 },
    emoji: { fontSize: 48, color: '#f44336', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 8 },
    message: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
    actions: { flexDirection: 'row', gap: 12 },
    retryBtn: { backgroundColor: '#1a237e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    retryBtnText: { color: '#fff', fontWeight: '600' }
});

export default ErrorBoundary;

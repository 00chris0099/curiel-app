jest.mock('react-native', () => ({
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    StyleSheet: { create: (s) => s }
}));

const ErrorBoundary = require('../components/ErrorBoundary').default;

describe('ErrorBoundary', () => {
    it('has correct initial state', () => {
        const instance = new ErrorBoundary({ children: null });
        expect(instance.state.hasError).toBe(false);
        expect(instance.state.error).toBeNull();
    });

    it('getDerivedStateFromError sets error state', () => {
        const error = new Error('Test error');
        const result = ErrorBoundary.getDerivedStateFromError(error);
        expect(result.hasError).toBe(true);
        expect(result.error).toBe(error);
    });

    it('renders children when no error', () => {
        const instance = new ErrorBoundary({ children: 'child' });
        expect(instance.render()).toBe('child');
    });

    it('renders error UI when hasError', () => {
        const instance = new ErrorBoundary({ children: 'child' });
        instance.state = { hasError: true, error: new Error('fail') };
        const result = instance.render();
        expect(result).toBeTruthy();
    });
});

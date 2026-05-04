import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type ErrorBoundaryProps = {
    children: ReactNode;
    backHref?: string;
};

type ErrorBoundaryState = {
    hasError: boolean;
    errorMessage: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
        errorMessage: '',
    };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            errorMessage: error.message || 'Ocurrio un error inesperado al renderizar la pantalla.',
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ERROR_BOUNDARY_RENDER_ERROR:', error);
        console.error('ERROR_BOUNDARY_COMPONENT_STACK:', errorInfo.componentStack);
    }

    handleRetry = () => {
        window.location.reload();
    };

    handleBack = () => {
        window.location.href = this.props.backHref || '/inspections';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="mx-auto max-w-3xl pb-10 pt-6">
                    <div className="card space-y-4 text-center">
                        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Error al cargar esta pantalla</h1>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{this.state.errorMessage}</p>
                        </div>
                        <div className="flex flex-col justify-center gap-3 sm:flex-row">
                            <button type="button" className="btn btn-secondary" onClick={this.handleBack}>
                                Volver a inspecciones
                            </button>
                            <button type="button" className="btn btn-primary flex items-center justify-center gap-2" onClick={this.handleRetry}>
                                <RefreshCw className="h-4 w-4" />
                                Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

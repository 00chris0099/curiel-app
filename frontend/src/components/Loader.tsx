import { Loader2 } from 'lucide-react';

interface LoaderProps {
    size?: number;
    className?: string;
    fullScreen?: boolean;
}

export const Loader = ({ size = 40, className = '', fullScreen = false }: LoaderProps) => {
    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-900/50 z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
                    <Loader2
                        className={`animate-spin text-primary-600 ${className}`}
                        style={{ width: size, height: size }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-8">
            <Loader2
                className={`animate-spin text-primary-600 ${className}`}
                style={{ width: size, height: size }}
            />
        </div>
    );
};

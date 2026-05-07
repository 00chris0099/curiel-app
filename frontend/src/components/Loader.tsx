import { CustomIcon } from './CustomIcon';

interface LoaderProps {
    size?: number;
    className?: string;
    fullScreen?: boolean;
}

export const Loader = ({ size = 40, className = '', fullScreen = false }: LoaderProps) => {
    const iconSize = size >= 52 ? 'lg' : size >= 40 ? 'md' : 'sm';

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(23,50,74,0.12)]">
                    <CustomIcon name="sync" spin size={iconSize} tone="cream" className={className} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-8">
            <CustomIcon name="sync" spin size={iconSize} tone="cream" className={className} />
        </div>
    );
};

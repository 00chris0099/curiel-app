import { useRef, useEffect } from 'react';

type AutoResizeTextareaProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    minHeightClass?: string;
    maxHeightClass?: string;
    id?: string;
    name?: string;
};

/**
 * Textarea que crece automáticamente con el contenido.
 * A diferencia de un textarea fijo, ajusta su altura al texto escrito
 * (hasta un máximo) para que siempre se vea todo lo que se escribe.
 */
export const AutoResizeTextarea = ({
    value,
    onChange,
    placeholder,
    disabled,
    className = '',
    minHeightClass = 'min-h-[200px]',
    maxHeightClass = 'max-h-[60vh]',
    id,
    name,
}: AutoResizeTextareaProps) => {
    const ref = useRef<HTMLTextAreaElement>(null);

    const resize = () => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(resize, [value]);

    return (
        <textarea
            ref={ref}
            id={id}
            name={name}
            className={`input w-full resize-none overflow-y-auto text-base leading-relaxed ${minHeightClass} ${maxHeightClass} ${className}`}
            value={value}
            onChange={(e) => {
                onChange(e.target.value);
                // Si el consumidor no re-renderiza de inmediato, ajusta igual
                requestAnimationFrame(resize);
            }}
            placeholder={placeholder}
            disabled={disabled}
        />
    );
};

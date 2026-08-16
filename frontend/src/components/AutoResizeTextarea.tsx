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
 *
 * IMPORTANTE: las clases de altura llevan `!` porque la regla global
 * `textarea.input { min-height: 6rem }` (96px) ganaría por especificidad
 * sin el modificador !important de Tailwind.
 *
 * Base alta en móvil (320px) y mayor en pantallas grandes (420px);
 * crece con el texto hasta un máximo de 60% de la altura de la pantalla.
 */
export const AutoResizeTextarea = ({
    value,
    onChange,
    placeholder,
    disabled,
    className = '',
    minHeightClass = '!min-h-[340px] sm:!min-h-[440px]',
    maxHeightClass = '!max-h-[80vh]',
    id,
    name,
}: AutoResizeTextareaProps) => {
    const ref = useRef<HTMLTextAreaElement>(null);

    const resize = () => {
        const el = ref.current;
        if (!el) return;
        // Reinicia a auto para medir el contenido real, luego aplica la altura
        el.style.height = 'auto';
        el.style.height = `${Math.max(el.scrollHeight, el.clientHeight)}px`;
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

export type DocumentType = 'dni' | 'ruc' | 'ce' | 'pasaporte';

/**
 * Filtra el valor de entrada según el tipo de documento para impedir
 * escribir caracteres no válidos o exceder el límite permitido.
 */
export const filterDocumentInput = (type: DocumentType | string, value: string): string => {
    if (type === 'dni') {
        // Solo dígitos, máximo 8
        return value.replace(/\D/g, '').slice(0, 8);
    }
    if (type === 'ruc') {
        // Solo dígitos, máximo 11
        return value.replace(/\D/g, '').slice(0, 11);
    }
    if (type === 'ce' || type === 'pasaporte') {
        // Alfanumérico, máximo 12
        return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase();
    }
    return value;
};

/**
 * Filtra la entrada de número de teléfono/celular
 * (Solo números, máximo 9 dígitos)
 */
export const filterPhoneInput = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 9);
};

/**
 * Valida si el documento cumple con las reglas exactas.
 */
export const validateDocument = (type: DocumentType | string, value: string): { isValid: boolean; error?: string } => {
    const trimmed = value.trim();
    if (!trimmed) {
        return { isValid: false, error: 'El número de documento es requerido' };
    }

    if (type === 'dni') {
        if (!/^\d{8}$/.test(trimmed)) {
            return { isValid: false, error: 'El DNI debe tener exactamente 8 dígitos numéricos' };
        }
    } else if (type === 'ruc') {
        if (!/^\d{11}$/.test(trimmed)) {
            return { isValid: false, error: 'El RUC debe tener exactamente 11 dígitos numéricos' };
        }
        if (!/^(10|20)/.test(trimmed)) {
            return { isValid: false, error: 'El RUC debe comenzar con 10 (persona natural) o 20 (empresa)' };
        }
    } else if (type === 'ce') {
        if (trimmed.length < 8 || trimmed.length > 12) {
            return { isValid: false, error: 'El Carnet de Extranjería debe tener entre 8 y 12 caracteres' };
        }
    }
    return { isValid: true };
};

/**
 * Valida el número celular/teléfono (9 dígitos iniciando en 9 para celulares peruanos)
 */
export const validatePhone = (value?: string): { isValid: boolean; error?: string } => {
    if (!value || !value.trim()) return { isValid: true };
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 0) {
        if (!/^9\d{8}$/.test(cleaned)) {
            return { isValid: false, error: 'El número de celular debe tener 9 dígitos y empezar con 9 (ej. 987654321)' };
        }
    }
    return { isValid: true };
};

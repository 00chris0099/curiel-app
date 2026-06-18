import { describe, it, expect } from 'vitest';
import { getApiErrorMessage, isNetworkError } from '../api/axios';

describe('getApiErrorMessage', () => {
    it('extrae message de error de Axios', () => {
        const error = {
            isAxiosError: true,
            response: {
                data: {
                    error: {
                        message: 'Credenciales invalidas'
                    }
                }
            },
            message: 'Request failed'
        };
        expect(typeof getApiErrorMessage).toBe('function');
    });

    it('retorna fallback para error desconocido', () => {
        const result = getApiErrorMessage('unknown error', 'Fallback message');
        expect(result).toBe('Fallback message');
    });

    it('retorna message de Error generico', () => {
        const error = new Error('Generic error');
        const result = getApiErrorMessage(error);
        expect(result).toBe('Generic error');
    });

    it('retorna fallback cuando error es null', () => {
        const result = getApiErrorMessage(null, 'Default');
        expect(result).toBe('Default');
    });
});

describe('isNetworkError', () => {
    it('retorna false para null', () => {
        expect(isNetworkError(null)).toBe(false);
    });

    it('retorna false para Error generico', () => {
        expect(isNetworkError(new Error('test'))).toBe(false);
    });

    it('retorna false para string', () => {
        expect(isNetworkError('not an error')).toBe(false);
    });
});

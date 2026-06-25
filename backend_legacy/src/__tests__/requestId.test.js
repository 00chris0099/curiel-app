const requestId = require('../middlewares/requestId');

describe('requestId middleware', () => {
    it('asigna un requestId al request cuando no hay header x-request-id', () => {
        const req = { headers: {} };
        const res = { setHeader: jest.fn() };
        const next = jest.fn();

        requestId(req, res, next);

        expect(req.requestId).toBeDefined();
        expect(typeof req.requestId).toBe('string');
        expect(req.requestId).toHaveLength(36);
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
        expect(next).toHaveBeenCalled();
    });

    it('reutiliza el x-request-id del header si ya existe', () => {
        const existingId = 'custom-request-id-12345';
        const req = { headers: { 'x-request-id': existingId } };
        const res = { setHeader: jest.fn() };
        const next = jest.fn();

        requestId(req, res, next);

        expect(req.requestId).toBe(existingId);
        expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', existingId);
        expect(next).toHaveBeenCalled();
    });

    it('genera UUIDs unicos para cada request', () => {
        const req1 = { headers: {} };
        const req2 = { headers: {} };
        const res = { setHeader: jest.fn() };
        const next = jest.fn();

        requestId(req1, res, next);
        requestId(req2, res, next);

        expect(req1.requestId).not.toBe(req2.requestId);
    });

    it('siempre llama a next()', () => {
        const req = { headers: {} };
        const res = { setHeader: jest.fn() };
        const next = jest.fn();

        requestId(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});

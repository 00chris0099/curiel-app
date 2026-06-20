const uuid = require('../utils/uuid').default;

describe('UUID Generator', () => {
    it('generates a valid UUID v4 format', () => {
        const id = uuid();
        expect(typeof id).toBe('string');
        expect(id).toHaveLength(36);
        expect(id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
        );
    });

    it('generates unique IDs on each call', () => {
        const id1 = uuid();
        const id2 = uuid();
        expect(id1).not.toBe(id2);
    });
});

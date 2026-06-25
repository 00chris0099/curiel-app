const { v4: uuidv4 } = require('uuid');

describe('UUID Utils', () => {
    it('genera un UUID v4 valido', () => {
        const id = uuidv4();
        expect(id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
    });

    it('genera UUIDs unicos', () => {
        const id1 = uuidv4();
        const id2 = uuidv4();
        expect(id1).not.toBe(id2);
    });

    it('genera UUIDs con 36 caracteres', () => {
        const id = uuidv4();
        expect(id).toHaveLength(36);
    });
});

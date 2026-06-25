const { createStyles } = require('../sharedStyles');

describe('sharedStyles', () => {
    it('createStyles retorna un objeto con fontfamily definido', () => {
        const styles = createStyles({ isDark: false });
        expect(styles.fontFamily).toBeDefined();
        expect(typeof styles.fontFamily).toBe('string');
    });

    it('createStyles acepta theme oscuro', () => {
        const styles = createStyles({ isDark: true });
        expect(styles.fontFamily).toBeDefined();
    });

    it('createStyles retorna un objeto con propiedades de texto', () => {
        const styles = createStyles({ isDark: false });
        expect(styles.title).toBeDefined();
        expect(styles.subtitle).toBeDefined();
    });
});

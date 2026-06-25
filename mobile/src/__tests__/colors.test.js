const colors = require('../colors');

describe('Mobile Colors', () => {
    it('exporta THEME_COLORS con light y dark', () => {
        expect(colors.THEME_COLORS).toBeDefined();
        expect(colors.THEME_COLORS.light).toBeDefined();
        expect(colors.THEME_COLORS.dark).toBeDefined();
    });

    it('THEME_COLORS light tiene surface, text, border', () => {
        const light = colors.THEME_COLORS.light;
        expect(light.surface).toBeDefined();
        expect(light.text).toBeDefined();
        expect(light.border).toBeDefined();
    });

    it('THEME_COLORS dark tiene surface, text, border', () => {
        const dark = colors.THEME_COLORS.dark;
        expect(dark.surface).toBeDefined();
        expect(dark.text).toBeDefined();
        expect(dark.border).toBeDefined();
    });

    it('getStatusColor retorna un color para cada status', () => {
        expect(colors.getStatusColor('pendiente')).toBeDefined();
        expect(colors.getStatusColor('en_progreso')).toBeDefined();
        expect(colors.getStatusColor('completada')).toBeDefined();
        expect(colors.getStatusColor('cancelada')).toBeDefined();
    });

    it('getSeverityColor retorna un color para cada severidad', () => {
        expect(colors.getSeverityColor('baja')).toBeDefined();
        expect(colors.getSeverityColor('media')).toBeDefined();
        expect(colors.getSeverityColor('alta')).toBeDefined();
        expect(colors.getSeverityColor('critica')).toBeDefined();
    });

    it('getStatusLabel retorna un label legible', () => {
        const label = colors.getStatusLabel('pendiente');
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
    });

    it('DARK_SEVERITY_COLORS tiene las 4 severidades', () => {
        expect(colors.DARK_SEVERITY_COLORS).toBeDefined();
        expect(colors.DARK_SEVERITY_COLORS.baja).toBeDefined();
        expect(colors.DARK_SEVERITY_COLORS.media).toBeDefined();
        expect(colors.DARK_SEVERITY_COLORS.alta).toBeDefined();
        expect(colors.DARK_SEVERITY_COLORS.critica).toBeDefined();
    });
});

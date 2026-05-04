const puppeteer = require('puppeteer');
const config = require('../config');
const {
    Inspection,
    InspectionArea,
    InspectionObservation,
    InspectionSummary,
    Photo,
    Signature,
    User,
    Role
} = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { buildInspectionReportHtml } = require('../pdf/inspectionReportTemplate');

const safeUserAttributes = {
    exclude: ['passwordHash', '_plainPassword']
};

const severityOrder = {
    critica: 0,
    alta: 1,
    media: 2,
    leve: 3
};

const areaPriority = [
    'Entrada',
    'Sala',
    'Comedor',
    'Kitchenette',
    'Dormitorio principal',
    'Dormitorio secundario',
    'Baño principal',
    'Baño 2',
    'Balcón',
    'Centro de lavado',
    'Estudio',
    'Muros y vanos'
];

class InspectionReportService {
    async generateInspectionReport(inspectionId, userId, userRole, isMasterAdmin = false) {
        const inspection = await Inspection.findByPk(inspectionId, {
            include: [
                {
                    model: User,
                    as: 'inspector',
                    attributes: safeUserAttributes,
                    include: [
                        {
                            model: Role,
                            as: 'roles',
                            attributes: ['name']
                        }
                    ]
                },
                {
                    model: Signature,
                    as: 'signatures'
                }
            ]
        });

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        if (!isMasterAdmin && userRole === 'inspector' && inspection.inspectorId !== userId) {
            throw new AppError('No tienes permisos para generar este informe', 403, 'FORBIDDEN');
        }

        const [areas, observations, photos, summary] = await Promise.all([
            InspectionArea.findAll({
                where: { inspectionId },
                order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
            }),
            InspectionObservation.findAll({
                where: { inspectionId },
                order: [['areaId', 'ASC'], ['createdAt', 'ASC']]
            }),
            Photo.findAll({
                where: { inspectionId },
                order: [['createdAt', 'ASC']]
            }),
            InspectionSummary.findOne({ where: { inspectionId } })
        ]);

        const metadata = this._parseInspectionMetadata(inspection.notes);
        const sortedAreas = this._sortAreas(areas.map((area) => area.toJSON()));
        const sortedObservations = observations
            .map((observation) => observation.toJSON())
            .sort((left, right) => {
                const leftArea = sortedAreas.findIndex((area) => area.id === left.areaId);
                const rightArea = sortedAreas.findIndex((area) => area.id === right.areaId);

                if (leftArea !== rightArea) {
                    return leftArea - rightArea;
                }

                return (severityOrder[left.severity] ?? 99) - (severityOrder[right.severity] ?? 99);
            });
        const serializedPhotos = photos.map((photo) => photo.toJSON());
        const inspectorSignature = (inspection.signatures || []).find((signature) => signature.signatureType === 'inspector') || null;

        const recommendationGroups = this._buildRecommendationGroups(sortedObservations, summary);
        const html = buildInspectionReportHtml({
            inspection: inspection.toJSON(),
            metadata,
            areas: sortedAreas,
            observations: sortedObservations,
            photos: serializedPhotos,
            summary: summary ? summary.toJSON() : null,
            recommendations: recommendationGroups,
            inspectorSignature: inspectorSignature ? inspectorSignature.toJSON() : null,
            logoUrl: config.pdf.companyLogo,
            generatedAt: new Date().toISOString()
        });

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: config.pdf.executablePath || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1.5 });
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                displayHeaderFooter: true,
                headerTemplate: '<div></div>',
                footerTemplate: `
                    <div style="width:100%;padding:0 16mm 8mm;font-size:9px;color:#6b7280;display:flex;justify-content:space-between;align-items:center;">
                        <span>${config.pdf.footerPhone}</span>
                        <span>${config.pdf.footerEmail}</span>
                        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
                    </div>
                `,
                margin: {
                    top: '18mm',
                    right: '0mm',
                    bottom: '18mm',
                    left: '0mm'
                }
            });

            return {
                buffer: pdfBuffer,
                filename: this._buildFileName(inspection)
            };
        } finally {
            await browser.close();
        }
    }

    _parseInspectionMetadata(notes) {
        if (!notes) {
            return {};
        }

        const match = notes.match(/\[department-inspection-meta\]\n([\s\S]*?)\n\[\/department-inspection-meta\]/);
        if (!match) {
            return {};
        }

        try {
            return JSON.parse(match[1]);
        } catch (error) {
            return {};
        }
    }

    _sortAreas(areas) {
        return [...areas].sort((left, right) => {
            const leftPriority = areaPriority.indexOf(left.name);
            const rightPriority = areaPriority.indexOf(right.name);

            if (leftPriority !== -1 || rightPriority !== -1) {
                return (leftPriority === -1 ? 999 : leftPriority) - (rightPriority === -1 ? 999 : rightPriority);
            }

            return (left.sortOrder || 999) - (right.sortOrder || 999);
        });
    }

    _buildRecommendationGroups(observations, summary) {
        const groups = {
            pintura: [],
            estructura: [],
            instalaciones: [],
            acabados: []
        };

        const pushRecommendation = (group, text) => {
            if (!groups[group].includes(text)) {
                groups[group].push(text);
            }
        };

        observations.forEach((observation) => {
            const text = `${observation.title || ''} ${observation.description || ''}`.toLowerCase();
            const defaultRecommendation = observation.recommendation;

            if (text.includes('fisura') || text.includes('grieta') || observation.type === 'estructura') {
                pushRecommendation('estructura', defaultRecommendation || 'Resanar y sellar fisuras, evaluar continuidad del agrietamiento y repintar la superficie intervenida.');
            }

            if (text.includes('humedad') || text.includes('filtraci') || observation.type === 'sanitario') {
                pushRecommendation('instalaciones', defaultRecommendation || 'Identificar el origen de humedad o filtración, ejecutar sellado impermeable y verificar redes sanitarias involucradas.');
            }

            if (text.includes('pintura') || text.includes('vetada') || text.includes('mancha') || text.includes('descascar')) {
                pushRecommendation('pintura', defaultRecommendation || 'Preparar superficie, corregir base afectada y aplicar repintado homogéneo con acabado compatible.');
            }

            if (observation.type === 'electrico') {
                pushRecommendation('instalaciones', defaultRecommendation || 'Revisar circuito, accesorios y protecciones eléctricas; corregir instalación con técnico calificado.');
            }

            if (observation.type === 'acabados' || observation.type === 'carpinteria' || text.includes('puerta') || text.includes('ventana')) {
                pushRecommendation('acabados', defaultRecommendation || 'Ajustar terminaciones, nivelar piezas y reemplazar elementos dañados para restituir el acabado final.');
            }

            if (observation.type === 'otro' && defaultRecommendation) {
                pushRecommendation('acabados', defaultRecommendation);
            }
        });

        if (summary?.finalRecommendations) {
            const lines = summary.finalRecommendations
                .split(/\n+/)
                .map((line) => line.trim())
                .filter(Boolean);

            lines.forEach((line) => {
                const normalized = line.toLowerCase();
                if (normalized.includes('pint')) {
                    pushRecommendation('pintura', line);
                } else if (normalized.includes('estruc') || normalized.includes('fisura') || normalized.includes('grieta')) {
                    pushRecommendation('estructura', line);
                } else if (normalized.includes('eléct') || normalized.includes('electr') || normalized.includes('sanitar') || normalized.includes('humedad')) {
                    pushRecommendation('instalaciones', line);
                } else {
                    pushRecommendation('acabados', line);
                }
            });
        }

        return groups;
    }

    _buildFileName(inspection) {
        const base = `${inspection.projectName || 'informe'}-${inspection.clientName || 'cliente'}`
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80);

        return `informe-inspeccion-${base || inspection.id}.pdf`;
    }
}

module.exports = new InspectionReportService();

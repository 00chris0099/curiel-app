const puppeteer = require('puppeteer');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');
const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');
const { buildInspectionReportHtml } = require('../pdf/inspectionReportTemplate');
const { uploadPdf } = require('../utils/cloudinaryStorage');
const pdfCacheService = require('./pdfCacheService');

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

const defaultExecutablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_BIN ||
    '/usr/bin/chromium';

class InspectionReportService {
    async generateInspectionReport(inspectionId, userId, userRole, isMasterAdmin = false) {
        const inspection = await prisma.inspecciones.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 }
            }
        });

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        if (!isMasterAdmin && ['admin', 'arquitecto'].includes(userRole)) {
            return this._buildReportPayload(inspection, inspectionId);
        }

        if (!isMasterAdmin && userRole === 'inspector') {
            if (inspection.inspectorId !== userId) {
                throw new AppError('No tienes permisos para generar este informe', 403, 'FORBIDDEN');
            }
            if (!['lista_revision', 'finalizada'].includes(inspection.status)) {
                throw new AppError('El inspector solo puede generar informes cuando la inspección está lista para revisión o finalizada', 403, 'FORBIDDEN');
            }
        } else if (!isMasterAdmin) {
            throw new AppError('No tienes permisos para generar este informe', 403, 'FORBIDDEN');
        }

        return this._buildReportPayload(inspection, inspectionId);
    }

    async _buildReportPayload(inspection, inspectionId) {
        const [areas, observations, photos, summary, signatures] = await Promise.all([
            prisma.inspecciones.inspectionArea.findMany({
                where: { inspectionId },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
            }),
            prisma.inspecciones.inspectionObservation.findMany({
                where: { inspectionId },
                orderBy: [{ areaId: 'asc' }, { createdAt: 'asc' }]
            }),
            prisma.media.photo.findMany({
                where: { inspectionId },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.inspecciones.inspectionSummary.findUnique({
                where: { inspectionId }
            }),
            prisma.media.signature.findMany({
                where: { inspectionId }
            })
        ]);

        const metadata = this._parseInspectionMetadata(inspection.notes);
        const sortedAreas = this._sortAreas(areas.map(a => ({ ...a })));
        const sortedObservations = observations
            .map(obs => ({ ...obs }))
            .sort((left, right) => {
                const leftArea = sortedAreas.findIndex(a => a.id === left.areaId);
                const rightArea = sortedAreas.findIndex(a => a.id === right.areaId);
                if (leftArea !== rightArea) return leftArea - rightArea;
                return (severityOrder[left.severity] ?? 99) - (severityOrder[right.severity] ?? 99);
            });
        const serializedPhotos = photos.map(p => ({ ...p }));
        const inspectorSignature = signatures.find(s => s.signatureType === 'inspector') || null;

        const contentHash = pdfCacheService.computeContentHash({
            areas: sortedAreas,
            observations: sortedObservations,
            photos: serializedPhotos,
            summary,
            metadata
        });

        const cached = await pdfCacheService.getCachedReport(inspectionId);
        if (cached && cached.contentHash === contentHash) {
            logger.info('PDF cache hit', { inspectionId });
            return {
                buffer: null,
                filename: this._buildFileName(inspection),
                cloudUrl: cached.cloudUrl,
                cloudExpiresAt: cached.expiresAt,
                fromCache: true
            };
        }

        const recommendationGroups = this._buildRecommendationGroups(sortedObservations, summary);
        const html = buildInspectionReportHtml({
            inspection: { ...inspection },
            metadata,
            areas: sortedAreas,
            observations: sortedObservations,
            photos: serializedPhotos,
            summary: summary ? { ...summary } : null,
            recommendations: recommendationGroups,
            inspectorSignature: inspectorSignature ? { ...inspectorSignature } : null,
            logoUrl: config.pdf.companyLogo,
            generatedAt: new Date().toISOString()
        });

        let browser;
        const executablePath = this._resolveExecutablePath();

        try {
            logger.info('Using Chromium executable', { path: executablePath });

            browser = await puppeteer.launch({
                executablePath,
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-zygote',
                    '--single-process',
                    '--font-render-hinting=medium'
                ]
            });

            const page = await browser.newPage();
            await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1.5 });
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdfBinary = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true
            });

            const pdfBuffer = Buffer.from(pdfBinary);

            logger.info('PDF generado', { bufferSize: pdfBuffer.length, header: pdfBuffer.subarray(0, 4).toString() });

            if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 1000) {
                throw new AppError('El PDF generado es inválido o está incompleto', 500, 'INVALID_PDF_BUFFER');
            }

            if (pdfBuffer.subarray(0, 4).toString() !== '%PDF') {
                throw new AppError('El archivo generado no es un PDF válido', 500, 'INVALID_PDF_HEADER');
            }

            const filename = this._buildFileName(inspection);
            let cloudUrl = null;
            let cloudExpiresAt = null;

            try {
                const cloudResult = await uploadPdf(pdfBuffer, filename.replace('.pdf', ''));
                cloudUrl = cloudResult.url;
                cloudExpiresAt = cloudResult.expiresAt;
                logger.info('PDF subido a Cloudinary', { url: cloudUrl });

                await pdfCacheService.saveCache(inspectionId, cloudUrl, contentHash);
            } catch (cloudError) {
                logger.warn('Fallo subida a Cloudinary, PDF disponible solo localmente', { error: cloudError.message });
            }

            return {
                buffer: pdfBuffer,
                filename,
                cloudUrl,
                cloudExpiresAt,
            };
        } catch (error) {
            logger.error('PUPPETEER_REPORT_ERROR', {
                message: error?.message,
                stack: error?.stack
            });

            throw new AppError(
                error?.message || 'No se pudo generar el PDF de la inspección',
                500,
                'PUPPETEER_REPORT_ERROR'
            );
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    _resolveExecutablePath() {
        const candidates = [
            process.env.PUPPETEER_EXECUTABLE_PATH,
            process.env.CHROME_BIN,
            config.pdf.executablePath,
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/google-chrome-stable'
        ].filter(Boolean);

        const existingPath = candidates.find(candidate => fs.existsSync(candidate));
        return existingPath || defaultExecutablePath;
    }

    _parseInspectionMetadata(notes) {
        if (!notes) return {};

        const match = notes.match(/\[department-inspection-meta\]\n([\s\S]*?)\n\[\/department-inspection-meta\]/);
        if (!match) return {};

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

        const seen = new Set();

        const pushRecommendation = (group, text) => {
            if (!text || seen.has(text)) return;
            seen.add(text);
            groups[group].push(text);
        };

        const classifyByType = (type) => {
            const map = {
                estructura: 'estructura',
                sanitario: 'instalaciones',
                electrico: 'instalaciones',
                acabados: 'acabados',
                carpinteria: 'acabados',
                pintura: 'pintura'
            };
            return map[type] || null;
        };

        const classifyByKeywords = (text) => {
            if (/fisura|grieta|agriet|rajad|colaps|desnivel|asent|hundim|deformac| estructural/.test(text)) return 'estructura';
            if (/humedad|filtraci|inund|goter|sanitari|desag[uü]|tuberi|v[aá]lvula|cloaca|sumidero|agua/.test(text)) return 'instalaciones';
            if (/el[eé]ctric|cable|cortocircuito|poder|tomacorriente|luminari|interruptor|breaker|fusible/.test(text)) return 'instalaciones';
            if (/pintura|vetada|mancha|descascar|peeling|oxid|corrosi|color|repint|imprim/.test(text)) return 'pintura';
            if (/puerta|ventana|cierre|bisagra|cerrad|cristal|vidrio|persiana|cortina|carpinter|madera/.test(text)) return 'acabados';
            if (/piso|azulejo|cer[aá]mic|porcelanat|baldosa| alfombra|laminado|ENCHAP|revestim/.test(text)) return 'acabados';
            if (/pared|tabique|friso|cielo|techo|losa/.test(text)) return 'estructura';
            return null;
        };

        const getSeverityRecommendation = (severity, group) => {
            const severityMap = {
                critica: {
                    estructura: 'Se requiere evaluación estructural inmediata por profesional especializado. No habitar until verificar la integridad del elemento afectado.',
                    instalaciones: 'Interrumpir el uso de la instalación afectada hasta su reparación completa. Solicitar revisión profesional urgente.',
                    pintura: 'Evaluar el daño subyacente antes de proceder con repintado. Si afecta la impermeabilización, escalar a equipo especializado.',
                    acabados: 'Reemplazar el elemento dañado. No es posible reparación parcial por el nivel de deterioro.'
                },
                alta: {
                    estructura: 'Resanar y sellar grietas, evaluar continuidad del daño y monitorear posibles propagaciones. Documentar con fotografías periódicas.',
                    instalaciones: 'Identificar el origen del problema, ejecutar reparación por técnico calificado y verificar funcionamiento post-reparación.',
                    pintura: 'Preparar superficie, corregir la causa subyacente (humedad, filtración) y aplicar sistema de pintura compatible.',
                    acabados: 'Ajustar, nivelar o reemplazar piezas dañadas. Verificar alineación y funcionamiento de mecanismos.'
                },
                media: {
                    estructura: ' Registrar y monitorear. Programar reparación en próxima etapa de mantenimiento si la tendencia se mantiene.',
                    instalaciones: 'Programar reparación y verificar que no exista daño colateral. Mantener vigilancia durante período de observación.',
                    pintura: 'Programar reaplicación de acabado en próxima etapa de mantenimiento. Verificar que la causa original esté controlada.',
                    acabados: 'Programar ajuste o reemplazo en próxima etapa de mantenimiento. Documentar estado actual.'
                },
                leve: {
                    estructura: 'Observar y registrar. Incluir en plan de mantenimiento preventivo.',
                    instalaciones: 'Verificar funcionamiento y programar mantenimiento preventivo. Documentar para seguimiento.',
                    pintura: 'Incluir en plan de retoque de mantenimiento. No requiere intervención inmediata.',
                    acabados: 'Incluir en plan de mantenimiento estético. No afecta funcionalidad.'
                }
            };
            return severityMap[severity]?.[group] || null;
        };

        observations.forEach((obs) => {
            const text = `${obs.title || ''} ${obs.description || ''}`.toLowerCase();
            const userRec = obs.recommendation;

            let group = classifyByType(obs.type);
            if (!group) group = classifyByKeywords(text);
            if (!group) {
                if (userRec) group = 'acabados';
                else return;
            }

            const severityRec = getSeverityRecommendation(obs.severity, group);
            const recommendation = userRec || severityRec;

            if (recommendation) {
                pushRecommendation(group, recommendation);
            }
        });

        if (summary?.finalRecommendations) {
            const lines = summary.finalRecommendations
                .split(/\n+/)
                .map(line => line.trim())
                .filter(Boolean);

            lines.forEach((line) => {
                const normalized = line.toLowerCase();
                let group = 'acabados';
                if (/pint|repint|color|acabado de superficie/.test(normalized)) group = 'pintura';
                else if (/estruc|fisura|grieta|pared|techo|losa|asent/.test(normalized)) group = 'estructura';
                else if (/el[eé]ct|electr|sanit|humedad|tuberi|agua|desag/.test(normalized)) group = 'instalaciones';

                pushRecommendation(group, line);
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

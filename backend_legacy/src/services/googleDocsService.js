const { google } = require('googleapis');
const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
    AlignmentType, BorderStyle, WidthType, PageBreak, convertInchesToTwip, HeadingLevel,
    Header, Footer, PageNumber, Tab, TabStopType, TabStopPosition
} = require('docx');
const { Readable } = require('stream');
const https = require('https');
const http = require('http');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const { buildInspectionReportHtml } = require('../pdf/inspectionReportTemplate');

const SCOPES = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
];

// ─── AUTH ───────────────────────────────────────────────────────────────────────

function createOAuthClient() {
    const clientId = process.env.GOOGLE_O_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_O_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_O_REDIRECT_URI || process.env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error('Google OAuth credentials not configured (GOOGLE_O_CLIENT_ID, GOOGLE_O_CLIENT_SECRET, GOOGLE_O_REDIRECT_URI)');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function createServiceAccountClients() {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyJson) return null;

    try {
        const key = typeof keyJson === 'string' ? JSON.parse(keyJson) : keyJson;
        const auth = new google.auth.GoogleAuth({
            credentials: key,
            scopes: SCOPES,
        });
        return {
            docsClient: google.docs({ version: 'v1', auth }),
            driveClient: google.drive({ version: 'v3', auth }),
        };
    } catch (err) {
        logger.error('[GoogleDocs] Service account auth failed', { error: err.message });
        return null;
    }
}

function getDriveClient(userTokens) {
    if (userTokens) {
        const oauth2Client = createOAuthClient();
        oauth2Client.setCredentials({
            access_token: userTokens.accessToken,
            refresh_token: userTokens.refreshToken,
        });
        return google.drive({ version: 'v3', auth: oauth2Client });
    }

    const sa = createServiceAccountClients();
    if (sa) return sa.driveClient;

    throw new Error('No Google credentials available');
}

// ─── IMAGE HELPER ───────────────────────────────────────────────────────────────

function fetchImageBuffer(url) {
    return new Promise((resolve) => {
        try {
            const client = url.startsWith('https') ? https : http;
            const req = client.get(url, { timeout: 15000 }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return fetchImageBuffer(res.headers.location).then(resolve);
                }
                if (res.statusCode !== 200) {
                    resolve(null);
                    return;
                }
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    resolve({
                        buffer: Buffer.concat(chunks),
                        contentType: res.headers['content-type'] || 'image/png',
                    });
                });
                res.on('error', () => resolve(null));
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
        } catch {
            resolve(null);
        }
    });
}

function getDocxImageFormat(contentType) {
    const map = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'png',
        'image/bmp': 'png',
    };
    return map[(contentType || '').toLowerCase()] || 'png';
}

// ─── DOCX HELPERS ───────────────────────────────────────────────────────────────

const BORDER_COLOR = 'BFBFBF';
const BLUE = '2563EB';
const MEDIUM_BORDER = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const BLUE_BORDER = { style: BorderStyle.SINGLE, size: 2, color: BLUE };

const CELL_FULL = { top: MEDIUM_BORDER, bottom: MEDIUM_BORDER, left: MEDIUM_BORDER, right: MEDIUM_BORDER };
const CELL_NONE = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

const TWIP_WIDTHS = {
    full: convertInchesToTwip(6.3),
    label: convertInchesToTwip(1.9),
    value: convertInchesToTwip(4.4),
    half: convertInchesToTwip(3.15),
};

const FONT = 'Arial';
const FONT_SIZE = 21;   // 10.5pt in half-points
const FONT_SIZE_SM = 18; // 9pt
const FONT_SIZE_MD = 20; // 10pt
const FONT_SIZE_LG = 32; // 16pt
const FONT_SIZE_TITLE = 52; // 26pt

const SPACING = {
    afterNone: 0,
    afterSm: 40,
    afterMd: 80,
    afterLg: 120,
    afterXl: 200,
    afterXxl: 300,
    beforeSm: 40,
    beforeMd: 80,
    beforeLg: 120,
    beforeXl: 160,
    beforeXxl: 200,
    beforeXxl2: 300,
};

function setCellBorders(cell, borders) {
    cell.options.borders = borders;
    return cell;
}

function borderedBox(title, rows) {
    const borderCells = [
        new TableCell({
            columnSpan: 2,
            borders: { top: BLUE_BORDER, bottom: { style: BorderStyle.SINGLE, size: 1, color: BLUE }, left: MEDIUM_BORDER, right: MEDIUM_BORDER },
            shading: { type: 'clear', fill: 'EFF6FF' },
            children: [
                new Paragraph({
                    spacing: { before: 80, after: 80 },
                    indent: { left: convertInchesToTwip(0.1) },
                    children: [new TextRun({ text: title, bold: true, size: FONT_SIZE_LG, color: '111827', font: FONT })],
                }),
            ],
        }),
    ];

    for (const row of rows) {
        borderCells.push(
            new TableCell({
                borders: CELL_FULL,
                width: { size: TWIP_WIDTHS.label, type: WidthType.DXA },
                shading: { type: 'clear', fill: 'F9FAFB' },
                children: [
                    new Paragraph({
                        spacing: { before: 40, after: 40 },
                        indent: { left: convertInchesToTwip(0.1) },
                        children: [new TextRun({ text: row.label, bold: true, size: FONT_SIZE_SM, color: '374151', font: FONT })],
                    }),
                ],
            }),
            new TableCell({
                borders: CELL_FULL,
                width: { size: TWIP_WIDTHS.value, type: WidthType.DXA },
                children: [
                    new Paragraph({
                        spacing: { before: 40, after: 40 },
                        indent: { left: convertInchesToTwip(0.1) },
                        children: [new TextRun({ text: row.value || '---', size: FONT_SIZE, color: '1A1A1A', font: FONT })],
                    }),
                ],
            }),
        );
    }

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [TWIP_WIDTHS.label, TWIP_WIDTHS.value],
        rows: [
            new TableRow({ children: [borderCells[0], new TableCell({ borders: CELL_NONE, children: [new Paragraph('')], columnSpan: 0 })] }),
            ...chunk(borderCells.slice(1), 2).map(cells => new TableRow({ children: cells })),
        ],
    });
}

function chunk(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

function sectionTitle(text) {
    return new Paragraph({
        spacing: { before: 0, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE } },
        children: [new TextRun({ text, bold: true, size: FONT_SIZE_LG, color: '111827', font: FONT })],
    });
}

function bodyParagraph(text, opts = {}) {
    return new Paragraph({
        spacing: { before: opts.before || SPACING.afterNone, after: opts.after || SPACING.afterMd },
        alignment: opts.align,
        children: [new TextRun({
            text,
            bold: opts.bold,
            italics: opts.italic,
            size: opts.size || FONT_SIZE,
            color: opts.color || '1A1A1A',
            font: FONT,
        })],
    });
}

function multiRunParagraph(opts = {}) {
    return new Paragraph({
        spacing: { before: opts.before || SPACING.afterNone, after: opts.after || SPACING.afterMd },
        alignment: opts.align,
        children: opts.runs || [],
    });
}

function bulletItem(text) {
    return new Paragraph({
        spacing: { before: SPACING.beforeSm, after: SPACING.afterSm },
        indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.15) },
        children: [new TextRun({ text: '•  ', size: FONT_SIZE, font: FONT }), new TextRun({ text, size: FONT_SIZE, color: '1A1A1A', font: FONT })],
    });
}

function emptyParagraph() {
    return new Paragraph({ spacing: { before: SPACING.afterSm, after: SPACING.afterSm }, children: [] });
}

function photoWithCaption(photo, imageBuffers, opts = {}) {
    const children = [];
    const imgBuf = imageBuffers.find(b => b.url === photo.url);
    if (imgBuf) {
        const fmt = getDocxImageFormat(imgBuf.contentType);
        children.push(new Paragraph({
            spacing: { before: SPACING.beforeMd, after: SPACING.afterSm },
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({
                data: imgBuf.buffer,
                transformation: { width: opts.width || 520, height: opts.height || 290 },
                type: fmt,
            })],
        }));
    }
    if (photo.caption) {
        children.push(bodyParagraph(photo.caption, { italic: true, color: '6B7280', size: FONT_SIZE_SM, after: SPACING.afterLg }));
    }
    return children;
}

// ─── REPORT DATA EXTRACTION ─────────────────────────────────────────────────────

function extractReportData(reportData) {
    const { inspection, metadata, areas, observations, photos, summary, recommendations } = reportData;

    const inspector = inspection.inspector || {};
    const inspectorName = inspector.fullName
        || `${inspector.firstName || ''} ${inspector.lastName || ''}`.trim()
        || 'Sin asignar';
    const inspectorRole = inspector.roles?.[0]?.name || inspector.role || 'inspector';
    const capValue = inspector.capNumber || inspector.cap || inspector.registrationNumber || null;
    const district = metadata?.district || inspection.state || 'Lima';
    const address = metadata?.exactAddress || inspection.address || '';
    const buildingName = metadata?.buildingName || 'No registrado';
    const apartmentNumber = metadata?.apartmentNumber || 'No registrado';
    const serviceType = metadata?.serviceType || inspection.inspectionType || '';
    const totalArea = areas.reduce((sum, area) => sum + Number(area.calculatedAreaM2 || 0), 0);

    // Build observations grouped by area with sequence numbers
    let observationCounter = 1;
    const sections = areas.map((area) => {
        const areaObs = observations
            .filter((obs) => obs.areaId === area.id)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((obs) => ({
                ...obs,
                sequence: observationCounter++,
                photos: photos.filter((p) => p.observationId === obs.id),
            }));
        return { title: area.name.toUpperCase(), area, observations: areaObs };
    });

    // Collect all recommendations
    const allRecs = [];
    for (const group of ['pintura', 'estructura', 'instalaciones', 'acabados']) {
        for (const item of (recommendations[group] || [])) {
            allRecs.push(item);
        }
    }
    const manualRecs = (summary?.finalRecommendations || '')
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);
    for (const item of manualRecs) allRecs.push(item);

    const buildingPhoto = photos.find((p) => p.type === 'edificio') || null;
    const planPhoto = photos.find((p) => p.type === 'plano') || null;
    const wallWindowPercent = metadata?.wallWindowPercent || metadata?.pctMurosVanos || null;

    return {
        inspection, metadata, areas, inspectorName, inspectorRole, capValue,
        district, address, buildingName, apartmentNumber, serviceType,
        totalArea, sections, allRecs, buildingPhoto, planPhoto, wallWindowPercent,
        inspectorSignature: reportData.inspectorSignature,
        generatedAt: reportData.generatedAt || new Date().toISOString(),
    };
}

// ─── IMAGE CACHE ────────────────────────────────────────────────────────────────

const imageCache = new Map();

async function getImageBuffer(url) {
    if (imageCache.has(url)) return imageCache.get(url);

    const result = await fetchImageBuffer(url);
    if (result) {
        imageCache.set(url, result);
    }
    return result;
}

// ─── DOCX BUILDER ───────────────────────────────────────────────────────────────

async function buildDocx(reportData) {
    const data = extractReportData(reportData);
    const sections = [];
    const imageBuffers = [];

    // Pre-fetch all images
    const allImageUrls = new Set();
    for (const section of data.sections) {
        for (const obs of section.observations) {
            for (const photo of (obs.photos || [])) {
                if (photo.url) allImageUrls.add(photo.url);
            }
        }
    }
    if (data.inspectorSignature?.signatureUrl) allImageUrls.add(data.inspectorSignature.signatureUrl);
    if (data.buildingPhoto?.url) allImageUrls.add(data.buildingPhoto.url);
    if (data.planPhoto?.url) allImageUrls.add(data.planPhoto.url);
    if (reportData.logoUrl) allImageUrls.add(reportData.logoUrl);

    for (const url of allImageUrls) {
        const result = await getImageBuffer(url);
        if (result) imageBuffers.push({ url, ...result });
    }

    // ── PAGE 1: COVER ───────────────────────────────────────────────────────────

    sections.push({
        properties: {
            page: {
                size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
                margin: { top: convertInchesToTwip(1.0), bottom: convertInchesToTwip(0.7), left: convertInchesToTwip(0.7), right: convertInchesToTwip(0.7) },
            },
        },
        children: [
            new Paragraph({ spacing: { before: convertInchesToTwip(1.5), after: SPACING.afterXxl }, children: [] }),
            // Logo instead of CURIEL text
            ...(() => {
                const logoUrl = reportData.logoUrl || null;
                if (logoUrl) {
                    const logoBuf = imageBuffers.find(b => b.url === logoUrl);
                    if (logoBuf) {
                        const fmt = getDocxImageFormat(logoBuf.contentType);
                        return [new Paragraph({
                            spacing: { after: SPACING.afterXl },
                            children: [new ImageRun({
                                data: logoBuf.buffer,
                                transformation: { width: 160, height: 45 },
                                type: fmt,
                            })],
                        })];
                    }
                }
                return [];
            })(),
            new Paragraph({
                spacing: { after: SPACING.afterXl },
                border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE } },
                children: [new TextRun({ text: 'INFORME DE INSPECCION', bold: true, size: FONT_SIZE_TITLE, color: '111827', font: FONT })],
            }),
            new Paragraph({
                spacing: { after: SPACING.afterXxl },
                children: [new TextRun({
                    text: 'Informe tecnico profesional elaborado con criterios inmobiliarios, metricos y fotograficos para revision tecnica integral del inmueble.',
                    italics: true, size: FONT_SIZE, color: '6B7280', font: FONT,
                })],
            }),

            // General info box (on cover) - same structure as PDF
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [TWIP_WIDTHS.label, TWIP_WIDTHS.value],
                rows: [
                    new TableRow({ children: [
                        new TableCell({
                            columnSpan: 2,
                            borders: { top: BLUE_BORDER, bottom: { style: BorderStyle.SINGLE, size: 1, color: BLUE }, left: MEDIUM_BORDER, right: MEDIUM_BORDER },
                            shading: { type: 'clear', fill: 'EFF6FF' },
                            children: [new Paragraph({
                                spacing: { before: SPACING.beforeMd, after: SPACING.afterMd },
                                indent: { left: convertInchesToTwip(0.1) },
                                children: [new TextRun({ text: 'INFORMACION GENERAL', bold: true, size: FONT_SIZE_LG, color: '111827', font: FONT })],
                            })],
                        }),
                    ]}),
                    ...[
                        { label: 'Cliente', value: data.inspection.clientName },
                        { label: 'Direccion', value: data.address },
                        { label: 'Distrito', value: data.district },
                        { label: 'Provincia', value: 'Lima' },
                        { label: 'Edificio', value: data.buildingName },
                        { label: 'Fecha de inspeccion', value: formatDateEs(data.inspection.scheduledDate) },
                        { label: 'Inmueble', value: data.apartmentNumber },
                        { label: 'Servicio', value: data.serviceType },
                    ].map(r => new TableRow({ children: [
                        new TableCell({
                            borders: CELL_FULL,
                            width: { size: TWIP_WIDTHS.label, type: WidthType.DXA },
                            shading: { type: 'clear', fill: 'F9FAFB' },
                            children: [new Paragraph({
                                spacing: { before: SPACING.beforeSm, after: SPACING.afterSm },
                                indent: { left: convertInchesToTwip(0.1) },
                                children: [new TextRun({ text: r.label, bold: true, size: FONT_SIZE_SM, color: '374151', font: FONT })],
                            })],
                        }),
                        new TableCell({
                            borders: CELL_FULL,
                            width: { size: TWIP_WIDTHS.value, type: WidthType.DXA },
                            children: [new Paragraph({
                                spacing: { before: SPACING.beforeSm, after: SPACING.afterSm },
                                indent: { left: convertInchesToTwip(0.1) },
                                children: [new TextRun({ text: r.value || '---', size: FONT_SIZE, color: '1A1A1A', font: FONT })],
                            })],
                        }),
                    ]})),
                ],
            }),

            // Building photo
            ...(() => {
                if (data.buildingPhoto) {
                    const imgBuf = imageBuffers.find(b => b.url === data.buildingPhoto.url);
                    if (imgBuf) {
                        const fmt = getDocxImageFormat(imgBuf.contentType);
                        return [new Paragraph({
                            spacing: { before: SPACING.beforeXl, after: SPACING.afterNone },
                            border: { top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR }, bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR }, left: MEDIUM_BORDER, right: MEDIUM_BORDER },
                            alignment: AlignmentType.CENTER,
                            children: [new ImageRun({
                                data: imgBuf.buffer,
                                transformation: { width: 540, height: 300 },
                                type: fmt,
                            })],
                        })];
                    }
                }
                return [new Paragraph({
                    spacing: { before: SPACING.beforeXl, after: SPACING.afterNone },
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'Foto del edificio no disponible', italics: true, size: FONT_SIZE, color: '9CA3AF', font: FONT })],
                })];
            })(),

            new Paragraph({ spacing: { before: SPACING.beforeXxl2 }, children: [] }),
            new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR } },
                spacing: { before: 100 },
                children: [
                    new TextRun({ text: `Generado: ${formatDateTimeEs(data.generatedAt)}    |    `, size: FONT_SIZE_SM, color: '9CA3AF', font: FONT }),
                    new TextRun({ text: '983 893 067    |    info@tudepacheck.com', size: FONT_SIZE_SM, color: '9CA3AF', font: FONT }),
                ],
            }),
        ],
    });

    // ── PAGE 2: INSPECCION METRICA - SPLIT: table left + plan right ───────────

    const complianceText = data.wallWindowPercent !== null
        ? `Cumple el area total del departamento con ${data.wallWindowPercent}% de muros y vanos, es aceptable.`
        : 'Cumple el area total del departamento, es aceptable.';

    sections.push({
        properties: {
            page: {
                size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
                margin: { top: convertInchesToTwip(1.0), bottom: convertInchesToTwip(0.7), left: convertInchesToTwip(0.7), right: convertInchesToTwip(0.7) },
            },
        },
        children: [
            // Split table: left = metric table, right = plan photo
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [TWIP_WIDTHS.half, TWIP_WIDTHS.half],
                rows: [
                    new TableRow({ children: [
                        // LEFT CELL: Metric table
                        new TableCell({
                            borders: CELL_FULL,
                            width: { size: TWIP_WIDTHS.half, type: WidthType.DXA },
                            children: [
                                new Paragraph({
                                    spacing: { before: SPACING.beforeMd, after: SPACING.afterMd },
                                    indent: { left: convertInchesToTwip(0.1) },
                                    children: [new TextRun({ text: 'INSPECCION METRICA', bold: true, size: FONT_SIZE_LG, color: '111827', font: FONT })],
                                }),
                                // Header row
                                new Table({
                                    width: { size: 100, type: WidthType.PERCENTAGE },
                                    columnWidths: [TWIP_WIDTHS.label, TWIP_WIDTHS.value],
                                    rows: [
                                        new TableRow({ children: [
                                            new TableCell({
                                                borders: CELL_FULL,
                                                width: { size: TWIP_WIDTHS.label, type: WidthType.DXA },
                                                shading: { type: 'clear', fill: 'F9FAFB' },
                                                children: [new Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    indent: { left: convertInchesToTwip(0.05) },
                                                    children: [new TextRun({ text: 'AMBIENTE', bold: true, size: FONT_SIZE_SM, color: '6B7280', font: FONT })],
                                                })],
                                            }),
                                            new TableCell({
                                                borders: CELL_FULL,
                                                width: { size: TWIP_WIDTHS.value, type: WidthType.DXA },
                                                shading: { type: 'clear', fill: 'F9FAFB' },
                                                children: [new Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    alignment: AlignmentType.RIGHT,
                                                    indent: { right: convertInchesToTwip(0.05) },
                                                    children: [new TextRun({ text: 'AREA (m2)', bold: true, size: FONT_SIZE_SM, color: '6B7280', font: FONT })],
                                                })],
                                            }),
                                        ]}),
                                        ...data.areas.map(area => new TableRow({ children: [
                                            new TableCell({
                                                borders: CELL_FULL,
                                                width: { size: TWIP_WIDTHS.label, type: WidthType.DXA },
                                                children: [new Paragraph({
                                                    spacing: { before: SPACING.afterSm, after: SPACING.afterSm },
                                                    indent: { left: convertInchesToTwip(0.05) },
                                                    children: [new TextRun({ text: area.name || '---', size: FONT_SIZE, color: '1A1A1A', font: FONT })],
                                                })],
                                            }),
                                            new TableCell({
                                                borders: CELL_FULL,
                                                width: { size: TWIP_WIDTHS.value, type: WidthType.DXA },
                                                children: [new Paragraph({
                                                    spacing: { before: SPACING.afterSm, after: SPACING.afterSm },
                                                    alignment: AlignmentType.RIGHT,
                                                    indent: { right: convertInchesToTwip(0.05) },
                                                    children: [new TextRun({ text: formatMetric(area.calculatedAreaM2), size: FONT_SIZE, color: '1A1A1A', font: FONT })],
                                                })],
                                            }),
                                        ]})),
                                        // Total row
                                        new TableRow({ children: [
                                            new TableCell({
                                                borders: { top: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR }, bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR }, left: MEDIUM_BORDER, right: MEDIUM_BORDER },
                                                width: { size: TWIP_WIDTHS.label, type: WidthType.DXA },
                                                children: [new Paragraph({
                                                    spacing: { before: SPACING.beforeMd, after: SPACING.afterMd },
                                                    indent: { left: convertInchesToTwip(0.05) },
                                                    children: [new TextRun({ text: 'TOTAL', bold: true, size: FONT_SIZE, color: '1A1A1A', font: FONT })],
                                                })],
                                            }),
                                            new TableCell({
                                                borders: { top: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR }, bottom: { style: BorderStyle.SINGLE, size: 2, color: BORDER_COLOR }, left: MEDIUM_BORDER, right: MEDIUM_BORDER },
                                                width: { size: TWIP_WIDTHS.value, type: WidthType.DXA },
                                                children: [new Paragraph({
                                                    spacing: { before: SPACING.beforeMd, after: SPACING.afterMd },
                                                    alignment: AlignmentType.RIGHT,
                                                    indent: { right: convertInchesToTwip(0.05) },
                                                    children: [new TextRun({ text: formatMetric(data.totalArea), bold: true, size: FONT_SIZE, color: '1A1A1A', font: FONT })],
                                                })],
                                            }),
                                        ]}),
                                    ],
                                }),
                            ],
                        }),
                        // RIGHT CELL: Plan photo
                        new TableCell({
                            borders: CELL_FULL,
                            width: { size: TWIP_WIDTHS.half, type: WidthType.DXA },
                            children: [
                                new Paragraph({
                                    spacing: { before: SPACING.beforeMd, after: SPACING.afterMd },
                                    alignment: AlignmentType.CENTER,
                                    children: [new TextRun({ text: 'PLANO DEL INMUEBLE', bold: true, size: FONT_SIZE_LG, color: '111827', font: FONT })],
                                }),
                                ...(() => {
                                    if (data.planPhoto) {
                                        const imgBuf = imageBuffers.find(b => b.url === data.planPhoto.url);
                                        if (imgBuf) {
                                            const fmt = getDocxImageFormat(imgBuf.contentType);
                                            return [new Paragraph({
                                                spacing: { before: SPACING.beforeSm, after: SPACING.afterSm },
                                                alignment: AlignmentType.CENTER,
                                                children: [new ImageRun({
                                                    data: imgBuf.buffer,
                                                    transformation: { width: 280, height: 200 },
                                                    type: fmt,
                                                })],
                                            })];
                                        }
                                    }
                                    return [new Paragraph({
                                        spacing: { before: SPACING.beforeXl, after: SPACING.afterSm },
                                        alignment: AlignmentType.CENTER,
                                        children: [new TextRun({ text: 'Plano no disponible', italics: true, size: FONT_SIZE, color: '9CA3AF', font: FONT })],
                                    })];
                                })(),
                            ],
                        }),
                    ]}),
                ],
            }),

            // Compliance text - green box like PDF
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ children: [
                        new TableCell({
                            borders: { top: { style: BorderStyle.SINGLE, size: 1, color: '86EFAC' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: '86EFAC' }, left: { style: BorderStyle.SINGLE, size: 1, color: '86EFAC' }, right: { style: BorderStyle.SINGLE, size: 1, color: '86EFAC' } },
                            shading: { type: 'clear', fill: 'F0FDF4' },
                            children: [
                                new Paragraph({
                                    spacing: { before: SPACING.beforeSm, after: SPACING.afterSm },
                                    indent: { left: convertInchesToTwip(0.1) },
                                    children: [new TextRun({
                                        text: complianceText,
                                        bold: true, size: FONT_SIZE, color: '166534', font: FONT,
                                    })],
                                }),
                            ],
                        }),
                    ]}),
                ],
            }),
            new Paragraph({
                spacing: { before: SPACING.beforeLg },
                children: [new TextRun({
                    text: 'El area total corresponde a la suma de las mediciones individuales de cada ambiente inspeccionado.',
                    italics: true, size: FONT_SIZE_SM, color: '6B7280', font: FONT,
                })],
            }),
        ],
    });

    // ── PAGES 3+: SECCIONES POR AMBIENTE ────────────────────────────────────────

    for (const section of data.sections) {
        const sectionChildren = [
            sectionTitle(section.title),
        ];

        if (section.observations.length === 0) {
            sectionChildren.push(bodyParagraph('No se registraron observaciones tecnicas en esta seccion.', { italic: true, color: '9CA3AF' }));
        } else {
            for (const obs of section.observations) {
                sectionChildren.push(bodyParagraph(`Observacion ${obs.sequence}`, { bold: true, color: '374151', before: SPACING.beforeXl, after: SPACING.afterSm }));

                // Photos with captions
                for (const photo of (obs.photos || [])) {
                    sectionChildren.push(...photoWithCaption(photo, imageBuffers, { width: 520, height: 290 }));
                }

                // Description
                sectionChildren.push(bodyParagraph(obs.description || '', { after: SPACING.afterMd }));

                // Metadata - same format as PDF: Type · Severity · Metric · Recommendation
                const metaParts = [`Tipo: ${obs.type || '---'}`];
                if (obs.severity) metaParts.push(`Severidad: ${obs.severity}`);
                if (obs.metricValue) metaParts.push(`Metrica: ${formatMetric(obs.metricValue, obs.metricUnit ? ` ${obs.metricUnit}` : '')}`);
                if (obs.recommendation) metaParts.push(`Recomendacion: ${obs.recommendation}`);
                sectionChildren.push(bodyParagraph(metaParts.join('  ·  '), { italic: true, color: '6B7280', size: FONT_SIZE_SM, after: SPACING.afterXl }));
            }
        }

        sections.push({
            properties: {
                page: {
                    size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
                    margin: { top: convertInchesToTwip(1.0), bottom: convertInchesToTwip(0.7), left: convertInchesToTwip(0.7), right: convertInchesToTwip(0.7) },
                },
            },
            children: sectionChildren,
        });
    }

    // ── PAGE: RECOMENDACIONES ───────────────────────────────────────────────────

    const recChildren = [
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({ children: [
                    new TableCell({
                        borders: { top: BLUE_BORDER, bottom: { style: BorderStyle.SINGLE, size: 1, color: BLUE }, left: MEDIUM_BORDER, right: MEDIUM_BORDER },
                        shading: { type: 'clear', fill: 'EFF6FF' },
                        children: [new Paragraph({
                            spacing: { before: SPACING.beforeMd, after: SPACING.afterMd },
                            indent: { left: convertInchesToTwip(0.1) },
                            children: [new TextRun({ text: 'RECOMENDACIONES', bold: true, size: FONT_SIZE_LG, color: '111827', font: FONT })],
                        })],
                    }),
                ]}),
                new TableRow({ children: [
                    new TableCell({
                        borders: CELL_FULL,
                        children: [
                            emptyParagraph(),
                            ...(data.allRecs.length > 0
                                ? data.allRecs.map(rec => bulletItem(rec))
                                : [bodyParagraph('No se generaron recomendaciones automaticas.', { italic: true, color: '9CA3AF' })]
                            ),
                            emptyParagraph(),
                        ],
                    }),
                ]}),
            ],
        }),
    ];

    sections.push({
        properties: {
            page: {
                size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
                margin: { top: convertInchesToTwip(1.0), bottom: convertInchesToTwip(0.7), left: convertInchesToTwip(0.7), right: convertInchesToTwip(0.7) },
            },
        },
        children: recChildren,
    });

    // ── PAGE: CIERRE TECNICO ────────────────────────────────────────────────────

    const cierreChildren = [
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [TWIP_WIDTHS.label, TWIP_WIDTHS.value],
            rows: [
                new TableRow({ children: [
                    new TableCell({
                        columnSpan: 2,
                        borders: { top: BLUE_BORDER, bottom: { style: BorderStyle.SINGLE, size: 1, color: BLUE }, left: MEDIUM_BORDER, right: MEDIUM_BORDER },
                        shading: { type: 'clear', fill: 'EFF6FF' },
                        children: [new Paragraph({
                            spacing: { before: 80, after: 80 },
                            indent: { left: convertInchesToTwip(0.1) },
                            children: [new TextRun({ text: 'CIERRE TECNICO', bold: true, size: FONT_SIZE_LG, color: '111827', font: FONT })],
                        })],
                    }),
                ]}),
                ...[
                    { label: 'Cliente', value: data.inspection.clientName },
                    { label: 'Direccion', value: data.address },
                    { label: 'Distrito', value: data.district },
                    { label: 'Fecha', value: formatDateEs(data.inspection.scheduledDate) },
                    { label: 'Inmueble', value: data.apartmentNumber },
                ].map(r => new TableRow({ children: [
                    new TableCell({
                        borders: CELL_FULL,
                        width: { size: TWIP_WIDTHS.label, type: WidthType.DXA },
                        shading: { type: 'clear', fill: 'F9FAFB' },
                        children: [new Paragraph({
                            spacing: { before: 40, after: 40 },
                            indent: { left: convertInchesToTwip(0.1) },
                            children: [new TextRun({ text: r.label, bold: true, size: FONT_SIZE_SM, color: '374151', font: FONT })],
                        })],
                    }),
                    new TableCell({
                        borders: CELL_FULL,
                        width: { size: TWIP_WIDTHS.value, type: WidthType.DXA },
                        children: [new Paragraph({
                            spacing: { before: 40, after: 40 },
                            indent: { left: convertInchesToTwip(0.1) },
                            children: [new TextRun({ text: r.value || '---', size: FONT_SIZE, color: '1A1A1A', font: FONT })],
                        })],
                    }),
                ]})),
            ],
        }),

        // Conclusion
        new Paragraph({
            spacing: { before: SPACING.beforeXxl2, after: SPACING.afterLg },
            children: [new TextRun({
                text: data.summary?.generalConclusion || 'Sin conclusion general registrada.',
                size: FONT_SIZE, color: '1A1A1A', font: FONT,
            })],
        }),
        new Paragraph({
            spacing: { after: SPACING.afterXl },
            children: [new TextRun({
                text: 'Este informe consolida los hallazgos observados en la fecha de inspeccion y debe complementarse con las acciones correctivas correspondientes para el inmueble evaluado.',
                italics: true, size: FONT_SIZE_SM, color: '9CA3AF', font: FONT,
            })],
        }),

        // Signature block
        new Paragraph({
            spacing: { after: SPACING.afterLg },
            children: [new TextRun({
                text: 'El presente informe fue realizado e inspeccionado por:',
                size: FONT_SIZE_SM, color: '6B7280', font: FONT,
            })],
        }),

        // Inspector signature image
        ...(() => {
            if (data.inspectorSignature?.signatureUrl) {
                const imgBuf = imageBuffers.find(b => b.url === data.inspectorSignature.signatureUrl);
                if (imgBuf) {
                    const fmt = getDocxImageFormat(imgBuf.contentType);
                    return [new Paragraph({
                        spacing: { before: SPACING.beforeMd, after: SPACING.afterMd },
                        children: [new ImageRun({
                            data: imgBuf.buffer,
                            transformation: { width: 200, height: 80 },
                            type: fmt,
                        })],
                    })];
                }
            }
            return [bodyParagraph('Firma pendiente', { italic: true, color: '9CA3AF', size: FONT_SIZE_SM, after: SPACING.afterMd })];
        })(),

        // Signature line
        new Paragraph({
            spacing: { before: SPACING.beforeSm, after: SPACING.afterMd },
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '1A1A1A' } },
            children: [],
        }),
        bodyParagraph(data.inspectorName, { bold: true, color: '1A1A1A' }),
        bodyParagraph(data.inspectorRole, { color: '6B7280', size: FONT_SIZE_SM }),
        ...(data.inspectorRole === 'arquitecto'
            ? [bodyParagraph(`CAP: ${data.capValue || 'No registrado'}`, { color: '6B7280', size: FONT_SIZE_SM })]
            : []),
    ];

    sections.push({
        properties: {
            page: {
                size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
                margin: { top: convertInchesToTwip(1.0), bottom: convertInchesToTwip(0.7), left: convertInchesToTwip(0.7), right: convertInchesToTwip(0.7) },
            },
        },
        children: cierreChildren,
    });

    // ── ADD HEADERS & FOOTERS TO ALL SECTIONS ──────────────────────────────────

    const logoImageBuf = reportData.logoUrl ? imageBuffers.find(b => b.url === reportData.logoUrl) : null;

    const buildSectionHeader = () => new Header({
        children: [
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [convertInchesToTwip(2.5), convertInchesToTwip(2.5), convertInchesToTwip(1.5)],
                rows: [
                    new TableRow({ children: [
                        new TableCell({
                            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                            width: { size: convertInchesToTwip(2.5), type: WidthType.DXA },
                            children: [new Paragraph({
                                spacing: { before: 0, after: 0 },
                                children: [new TextRun({ text: 'Protegemos la inversion de tu departamento', italics: true, size: FONT_SIZE_SM, color: '6B7280', font: FONT })],
                            })],
                        }),
                        new TableCell({
                            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                            width: { size: convertInchesToTwip(2.5), type: WidthType.DXA },
                            children: [],
                        }),
                        new TableCell({
                            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                            width: { size: convertInchesToTwip(1.5), type: WidthType.DXA },
                            children: [new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                spacing: { before: 0, after: 0 },
                                children: logoImageBuf ? [new ImageRun({
                                    data: logoImageBuf.buffer,
                                    transformation: { width: 100, height: 36 },
                                    type: getDocxImageFormat(logoImageBuf.contentType),
                                })] : [],
                            })],
                        }),
                    ]}),
                ],
            }),
        ],
    });

    const buildSectionFooter = () => new Footer({
        children: [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                border: { top: { style: BorderStyle.SINGLE, size: 3, color: 'E57A1A' } },
                children: [
                    new TextRun({ text: '  983 893 067  |  info@tudepacheck.com  ', size: FONT_SIZE_SM, color: '9CA3AF', font: FONT }),
                ],
            }),
        ],
    });

    for (const section of sections) {
        section.headers = { default: buildSectionHeader() };
        section.footers = { default: buildSectionFooter() };
    }

    // ── BUILD DOCUMENT ──────────────────────────────────────────────────────────

    const doc = new Document({
        creator: 'CURIEL Inspection Management',
        title: `Informe de Inspeccion — ${data.inspection.projectName || ''}`,
        description: 'Informe tecnico de inspeccion inmobiliaria',
        sections,
    });

    return Packer.toBuffer(doc);
}

// ─── FORMAT HELPERS ─────────────────────────────────────────────────────────────

function formatDateEs(value) {
    if (!value) return '---';
    return new Date(value).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTimeEs(value) {
    if (!value) return '---';
    return new Date(value).toLocaleString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatMetric(value, suffix = '') {
    if (value === null || value === undefined || value === '') return '---';
    return `${Number(value).toFixed(2)}${suffix}`;
}

// ─── UPLOAD TO GOOGLE DRIVE ─────────────────────────────────────────────────────

async function uploadPdfToDrive(driveClient, pdfBuffer, title, folderId) {
    const fileMetadata = {
        name: title,
        mimeType: 'application/pdf',
    };
    if (folderId) {
        fileMetadata.parents = [folderId];
    }

    const res = await driveClient.files.create({
        requestBody: fileMetadata,
        media: {
            mimeType: 'application/pdf',
            body: Readable.from(pdfBuffer),
        },
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true,
    });

    return {
        documentId: res.data.id,
        url: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`,
        downloadUrl: res.data.webContentLink || null,
    };
}

// ─── PDF GENERATION ────────────────────────────────────────────────────────────

async function generatePdfBuffer(reportData) {
    const html = buildInspectionReportHtml(reportData);

    let browser;
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
        || process.env.CHROME_BIN
        || null;

    try {
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

        return Buffer.from(pdfBinary);
    } finally {
        if (browser) await browser.close();
    }
}

// ─── PUBLIC: CREATE SERVICE ACCOUNT DOC (PDF → Google Drive) ────────────────────

async function createGoogleDoc(reportData) {
    const sa = createServiceAccountClients();
    if (!sa) throw new Error('Google service account not configured');

    const title = `Informe de Inspeccion — ${reportData.inspection.projectName}`;
    const pdfBuffer = await generatePdfBuffer(reportData);

    const folderId = process.env.GOOGLE_DOCS_FOLDER_ID || null;
    const result = await uploadPdfToDrive(sa.driveClient, pdfBuffer, title, folderId);

    logger.info(`[GoogleDocs] PDF uploaded to Drive: ${result.url}`);

    return {
        documentId: result.documentId,
        url: result.url,
        title,
    };
}

// ─── PUBLIC: CREATE USER DOC (OAUTH, PDF → Google Drive) ──────────────────────

async function createUserGoogleDoc(reportData, userTokens) {
    const driveClient = getDriveClient(userTokens);

    const title = `Informe de Inspeccion — ${reportData.inspection.projectName}`;
    const pdfBuffer = await generatePdfBuffer(reportData);

    const result = await uploadPdfToDrive(driveClient, pdfBuffer, title, null);

    logger.info(`[GoogleDocs] User PDF uploaded to Drive: ${result.url}`);

    return {
        documentId: result.documentId,
        url: result.url,
        title,
    };
}

module.exports = {
    createGoogleDoc,
    createUserGoogleDoc,
    buildDocx,
};

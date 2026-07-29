const { google } = require('googleapis');
const logger = require('../utils/logger');

const SCOPES = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
];

let docsClient = null;
let driveClient = null;

function getAuth() {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyJson) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not set');
    }

    let key;
    if (typeof keyJson === 'string') {
        try {
            key = JSON.parse(keyJson);
        } catch {
            const cleaned = keyJson
                .replace(/[\r\n\t]+/g, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim();
            try {
                key = JSON.parse(cleaned);
            } catch (e2) {
                logger.error('Google key parse failed', { sample: cleaned.substring(0, 80), error: e2.message });
                throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is malformed: ' + e2.message);
            }
        }
    } else {
        key = keyJson;
    }

    return new google.auth.GoogleAuth({
        credentials: key,
        scopes: SCOPES,
    });
}

function getClients() {
    if (docsClient && driveClient) return { docsClient, driveClient };

    const auth = getAuth();
    docsClient = google.docs({ version: 'v1', auth });
    driveClient = google.drive({ version: 'v3', auth });

    return { docsClient, driveClient };
}

function escapeDocText(value) {
    return String(value || '').replace(/\n/g, '\n');
}

function formatDate(value) {
    if (!value) return '---';
    return new Date(value).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatMetric(value, suffix = '') {
    if (value === null || value === undefined || value === '') return '---';
    return `${Number(value).toFixed(2)}${suffix}`;
}

function buildDocContent(reportData) {
    const {
        inspection,
        metadata,
        areas,
        observations,
        photos,
        summary,
        recommendations,
        inspectorSignature
    } = reportData;

    const buildingPhoto = photos.find((p) => p.type === 'edificio') || null;
    const totalArea = areas.reduce((sum, area) => sum + Number(area.calculatedAreaM2 || 0), 0);

    const inspectorName = inspection.inspector?.fullName
        || `${inspection.inspector?.firstName || ''} ${inspection.inspector?.lastName || ''}`.trim()
        || 'Sin asignar';
    const inspectorRole = inspection.inspector?.roles?.[0]?.name || inspection.inspector?.role || 'inspector';
    const capValue = inspection.inspector?.capNumber || inspection.inspector?.cap || null;
    const district = metadata.district || inspection.state || 'Lima';
    const address = metadata.exactAddress || inspection.address;
    const buildingName = metadata.buildingName || 'No registrado';
    const apartmentNumber = metadata.apartmentNumber || 'No registrado';
    const serviceType = metadata.serviceType || inspection.inspectionType;

    const allRecommendations = [];
    ['pintura', 'estructura', 'instalaciones', 'acabados'].forEach((group) => {
        (recommendations[group] || []).forEach((item) => allRecommendations.push(item));
    });
    (summary?.finalRecommendations || '').split(/\n+/).map((l) => l.trim()).filter(Boolean)
        .forEach((item) => allRecommendations.push(item));

    const obsBlocks = [];
    let obsCounter = 1;

    areas.forEach((area) => {
        const areaObs = observations
            .filter((obs) => obs.areaId === area.id)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        obsBlocks.push({ type: 'area_header', name: area.name.toUpperCase(), area });

        if (areaObs.length === 0) {
            obsBlocks.push({ type: 'no_observations' });
        } else {
            areaObs.forEach((obs) => {
                const obsPhotos = photos.filter((p) => p.observationId === obs.id);
                obsBlocks.push({ type: 'observation', sequence: obsCounter++, obs, photos: obsPhotos });
            });
        }
    });

    return {
        projectName: inspection.projectName,
        clientName: inspection.clientName,
        address,
        district,
        buildingName,
        apartmentNumber,
        serviceType,
        scheduledDate: inspection.scheduledDate,
        totalArea,
        areas,
        obsBlocks,
        allRecommendations,
        summary,
        inspectorName,
        inspectorRole,
        capValue,
        buildingPhotoUrl: buildingPhoto?.url || null,
        signatureUrl: inspectorSignature?.signatureUrl || null
    };
}

function buildInsertRequests(docContent) {
    const requests = [];
    let index = 1;

    const addText = (text, style = {}) => {
        const line = escapeDocText(text);
        requests.push({
            insertText: {
                location: { index },
                text: line
            }
        });

        if (Object.keys(style).length > 0) {
            requests.push({
                updateParagraphStyle: {
                    range: { startIndex: index, endIndex: index + line.length },
                    paragraphStyle: style,
                    fields: Object.keys(style).join(',')
                }
            });
        }

        index += line.length;
    };

    const addStyledText = (text, textStyle = {}) => {
        const line = escapeDocText(text);
        requests.push({
            insertText: {
                location: { index },
                text: line
            }
        });

        if (Object.keys(textStyle).length > 0) {
            requests.push({
                updateTextStyle: {
                    range: { startIndex: index, endIndex: index + line.length },
                    textStyle,
                    fields: Object.keys(textStyle).join(',')
                }
            });
        }

        index += line.length;
    };

    const addBullet = (text) => {
        const line = escapeDocText(text);
        requests.push({
            insertText: {
                location: { index },
                text: line
            }
        });

        requests.push({
            createParagraphBullets: {
                range: { startIndex: index, endIndex: index + line.length },
                bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE'
            }
        });

        index += line.length;
    };

    const nl = () => {
        requests.push({
            insertText: {
                location: { index },
                text: '\n'
            }
        });
        index += 1;
    };

    // ─── PORTADA ───
    addText('INFORME DE INSPECCIÓN', { namedStyleType: 'HEADING_1' });
    nl();
    addText('Informe técnico profesional elaborado con criterios inmobiliarios, métricos y fotográficos.', { namedStyleType: 'NORMAL_TEXT' });
    nl();
    nl();

    addText('INFORMACIÓN GENERAL', { namedStyleType: 'HEADING_2' });

    const infoFields = [
        ['Cliente', docContent.clientName],
        ['Dirección', docContent.address],
        ['Distrito', docContent.district],
        ['Provincia', 'Lima'],
        ['Edificio', docContent.buildingName],
        ['Fecha de inspección', formatDate(docContent.scheduledDate)],
        ['Inmueble', docContent.apartmentNumber],
        ['Servicio', docContent.serviceType],
    ];

    infoFields.forEach(([label, value]) => {
        addStyledText(`${label}: `, { bold: true });
        addText(value);
        nl();
    });

    if (docContent.buildingPhotoUrl) {
        nl();
        addText(`[Foto del edificio: ${docContent.buildingPhotoUrl}]`);
    }

    nl();
    nl();

    // ─── INSPECCIÓN MÉTRICA ───
    addText('INSPECCIÓN MÉTRICA', { namedStyleType: 'HEADING_1' });
    nl();

    addStyledText('Ambiente', { bold: true });
    addText('\t');
    addStyledText('Área (m²)', { bold: true });
    nl();

    docContent.areas.forEach((area) => {
        addText(area.name);
        addText('\t');
        addText(formatMetric(area.calculatedAreaM2));
        nl();
    });

    addStyledText('TOTAL', { bold: true });
    addText('\t');
    addStyledText(formatMetric(docContent.totalArea), { bold: true });
    nl();
    nl();

    // ─── SECCIONES POR AMBIENTE ───
    docContent.obsBlocks.forEach((block) => {
        if (block.type === 'area_header') {
            addText(block.name, { namedStyleType: 'HEADING_2' });
        } else if (block.type === 'no_observations') {
            addText('No se registraron observaciones técnicas en esta sección.');
        } else if (block.type === 'observation') {
            nl();
            addStyledText(`Observación ${block.sequence}:`, { bold: true });
            nl();

            if (block.photos.length) {
                block.photos.forEach((photo) => {
                    addText(`[Foto: ${photo.url}]`);
                    if (photo.caption) {
                        addText(` — ${photo.caption}`);
                    }
                    nl();
                });
            }

            addText(block.obs.description);
            nl();

            const details = [`Tipo: ${block.obs.type}`];
            if (block.obs.severity) details.push(`Severidad: ${block.obs.severity}`);
            if (block.obs.metricValue) details.push(`Métrica: ${formatMetric(block.obs.metricValue, block.obs.metricUnit ? ` ${block.obs.metricUnit}` : '')}`);
            if (block.obs.recommendation) details.push(`Recomendación: ${block.obs.recommendation}`);

            addStyledText(details.join(' · '), { foregroundColor: { color: { rgbColor: { red: 0.42, green: 0.45, blue: 0.47 } } } });
        }
    });

    nl();
    nl();

    // ─── RECOMENDACIONES ───
    addText('RECOMENDACIONES', { namedStyleType: 'HEADING_1' });
    nl();

    if (docContent.allRecommendations.length) {
        docContent.allRecommendations.forEach((rec) => {
            addBullet(rec);
        });
    } else {
        addText('No se generaron recomendaciones automáticas.');
    }

    nl();
    nl();

    // ─── CIERRE TÉCNICO ───
    addText('CIERRE TÉCNICO', { namedStyleType: 'HEADING_1' });
    nl();

    addText('INFORMACIÓN DEL INMUEBLE', { namedStyleType: 'HEADING_2' });

    [
        ['Cliente', docContent.clientName],
        ['Dirección', docContent.address],
        ['Distrito', docContent.district],
        ['Provincia', 'Lima'],
        ['Fecha', formatDate(docContent.scheduledDate)],
        ['Inmueble', docContent.apartmentNumber],
    ].forEach(([label, value]) => {
        addStyledText(`${label}: `, { bold: true });
        addText(value);
        nl();
    });

    nl();
    addText(docContent.summary?.generalConclusion || 'Sin conclusión general registrada.');
    nl();
    nl();
    addText('Este informe consolida los hallazgos observados en la fecha de inspección y debe complementarse con las acciones correctivas correspondientes para el inmueble evaluado.');
    nl();
    nl();
    nl();

    addText(`Firmado por: ${docContent.inspectorName}`);
    nl();
    addText(`Rol: ${docContent.inspectorRole}`);
    if (docContent.inspectorRole === 'arquitecto' && docContent.capValue) {
        nl();
        addText(`CAP: ${docContent.capValue}`);
    }

    if (docContent.signatureUrl) {
        nl();
        addText(`[Firma: ${docContent.signatureUrl}]`);
    }

    return requests;
}

async function cleanupDrive(driveClient) {
    try {
        const res = await driveClient.files.list({
            q: "mimeType='application/vnd.google-apps.document' and trashed=false",
            fields: 'files(id, name, createdTime)',
            pageSize: 100,
        });
        const files = res.data.files || [];
        if (files.length === 0) return;

        logger.info(`[GoogleDocs] Cleaning ${files.length} old docs from Drive`);
        for (const file of files) {
            try {
                await driveClient.files.delete({ fileId: file.id });
            } catch {}
        }
        logger.info('[GoogleDocs] Drive cleanup done');
    } catch (err) {
        logger.warn('[GoogleDocs] Drive cleanup failed', { message: err.message });
    }
}

async function createGoogleDoc(reportData) {
    const { docsClient, driveClient } = getClients();
    const docContent = buildDocContent(reportData);

    const title = `Informe de Inspección — ${reportData.inspection.projectName}`;

    await cleanupDrive(driveClient);

    let documentId;
    try {
        const createResponse = await driveClient.files.create({
            requestBody: {
                name: title,
                mimeType: 'application/vnd.google-apps.document',
            },
            fields: 'id',
        });
        documentId = createResponse.data.id;
        logger.info(`[GoogleDocs] Document created via Drive: ${documentId}`);
    } catch (err) {
        logger.error('[GoogleDocs] Error creating document via Drive', {
            status: err.status,
            code: err.code,
            message: err.message,
        });
        throw err;
    }

    try {
        const insertRequests = buildInsertRequests(docContent);
        const batchSize = 50;
        for (let i = 0; i < insertRequests.length; i += batchSize) {
            const batch = insertRequests.slice(i, i + batchSize);
            await docsClient.documents.batchUpdate({
                documentId,
                requestBody: { requests: batch }
            });
            logger.info(`[GoogleDocs] Batch ${Math.floor(i / batchSize) + 1} applied (${batch.length} requests)`);
        }
    } catch (err) {
        logger.warn('[GoogleDocs] Could not insert content, doc created empty', {
            status: err.status,
            message: err.message,
        });
    }

    const folderId = process.env.GOOGLE_DOCS_FOLDER_ID || null;
    if (folderId) {
        try {
            await driveClient.files.update({
                fileId: documentId,
                addParents: folderId,
                fields: 'id, parents'
            });
            logger.info(`[GoogleDocs] Moved to folder: ${folderId}`);
        } catch (err) {
            logger.warn('[GoogleDocs] Could not move to folder', {
                status: err.status,
                message: err.message,
            });
        }
    }

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    logger.info(`[GoogleDocs] Document ready: ${docUrl}`);

    return {
        documentId,
        url: docUrl,
        title
    };
}

module.exports = {
    createGoogleDoc
};

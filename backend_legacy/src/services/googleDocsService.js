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

function toGoogleFriendlyUrl(url) {
    if (!url) return url;
    if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
        if (!url.includes('/f_png') && !url.includes('/f_jpg') && !url.includes('/f_auto')) {
            return url.replace('/image/upload/', '/image/upload/f_png/');
        }
    }
    return url;
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

function buildTextRequests(docContent) {
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

    const addImage = (uri) => {
        requests.push({
            insertInlineImage: {
                location: { index },
                uri: toGoogleFriendlyUrl(uri)
            }
        });
        index += 1;
    };

    const setPageSize = () => {
        requests.push({
            updateDocumentStyle: {
                documentStyle: {
                    pageSize: {
                        width: { magnitude: 612, unit: 'PT' },
                        height: { magnitude: 792, unit: 'PT' }
                    },
                    marginTop: { magnitude: 50, unit: 'PT' },
                    marginBottom: { magnitude: 50, unit: 'PT' },
                    marginLeft: { magnitude: 55, unit: 'PT' },
                    marginRight: { magnitude: 55, unit: 'PT' }
                },
                fields: 'pageSize,marginTop,marginBottom,marginLeft,marginRight'
            }
        });
    };

    const getTableIndex = () => index;

    setPageSize();

    addText('INFORME DE INSPECCIÓN', { namedStyleType: 'HEADING_1' });
    addText('Informe técnico profesional. Criterios inmobiliarios, métricos y fotográficos.');
    nl();

    addText('INFORMACIÓN GENERAL', { namedStyleType: 'HEADING_2' });

    const infoFields = [
        ['Cliente', docContent.clientName],
        ['Dirección', docContent.address],
        ['Distrito', docContent.district],
        ['Provincia', 'Lima'],
        ['Edificio', docContent.buildingName],
        ['Fecha', formatDate(docContent.scheduledDate)],
        ['Inmueble', docContent.apartmentNumber],
        ['Servicio', docContent.serviceType],
    ];

    infoFields.forEach(([label, value]) => {
        addStyledText(`${label}: `, { bold: true });
        addText(value);
    });

    if (docContent.buildingPhotoUrl) {
        nl();
        addImage(docContent.buildingPhotoUrl);
    }

    nl();

    addText('INSPECCIÓN MÉTRICA', { namedStyleType: 'HEADING_2' });
    nl();

    const tableIndex = getTableIndex();

    docContent.obsBlocks.forEach((block) => {
        if (block.type === 'area_header') {
            nl();
            addText(block.name, { namedStyleType: 'HEADING_2' });
        } else if (block.type === 'no_observations') {
            addText('Sin observaciones registradas.');
        } else if (block.type === 'observation') {
            nl();
            addStyledText(`Obs. ${block.sequence}: `, { bold: true });

            const meta = [];
            if (block.obs.severity) meta.push(block.obs.severity);
            if (block.obs.type) meta.push(block.obs.type);
            if (block.obs.metricValue) meta.push(`${formatMetric(block.obs.metricValue, block.obs.metricUnit ? ` ${block.obs.metricUnit}` : '')}`);

            if (meta.length) {
                addStyledText(`[${meta.join(' · ')}]`, {
                    foregroundColor: { color: { rgbColor: { red: 0.42, green: 0.45, blue: 0.47 } } }
                });
            }

            nl();
            addText(block.obs.description);

            if (block.obs.recommendation) {
                nl();
                addStyledText('→ Rec: ', { bold: true, italic: true });
                addText(block.obs.recommendation);
            }

            if (block.photos.length) {
                block.photos.forEach((photo) => {
                    nl();
                    addImage(photo.url);
                    if (photo.caption) {
                        addText(` — ${photo.caption}`);
                    }
                });
            }
        }
    });

    nl();

    addText('RECOMENDACIONES', { namedStyleType: 'HEADING_2' });

    if (docContent.allRecommendations.length) {
        docContent.allRecommendations.forEach((rec) => {
            addBullet(rec);
        });
    } else {
        addText('No se generaron recomendaciones automáticas.');
    }

    nl();

    addText('CIERRE TÉCNICO', { namedStyleType: 'HEADING_2' });

    addText(docContent.summary?.generalConclusion || 'Sin conclusión general registrada.');
    nl();
    nl();

    addText(`Firmado por: ${docContent.inspectorName} — ${docContent.inspectorRole}`);
    if (docContent.inspectorRole === 'arquitecto' && docContent.capValue) {
        addText(` — CAP: ${docContent.capValue}`);
    }

    if (docContent.signatureUrl) {
        nl();
        addImage(docContent.signatureUrl);
    }

    return { requests, tableIndex };
}

async function buildAndApplyTable(docsClient, documentId, tableIndex, docContent) {
    const rows = docContent.areas.length + 2;

    await docsClient.documents.batchUpdate({
        documentId,
        requestBody: {
            requests: [{
                insertTable: {
                    location: { index: tableIndex },
                    rows,
                    columns: 2
                }
            }]
        }
    });

    logger.info(`[GoogleDocs] Table inserted at index ${tableIndex} (${rows} rows)`);

    const doc = await docsClient.documents.get({ documentId });
    const body = doc.data.body.content;

    let tableStruct = null;
    for (const element of body) {
        if (element.table) {
            tableStruct = element.table;
            break;
        }
    }

    if (!tableStruct) {
        logger.warn('[GoogleDocs] Table not found in document after insertion');
        return;
    }

    const cellRequests = [];

    const setCell = (row, col, text, isBold = false) => {
        const cell = tableStruct.tableCells[row * 2 + col];
        if (!cell) return;
        const cellContent = cell.tableCellContent;
        if (!cellContent || cellContent.length === 0) return;

        const cellStartIndex = cellContent[0].startIndex;

        cellRequests.push({
            insertText: {
                location: { index: cellStartIndex },
                text: String(text)
            }
        });

        if (isBold) {
            cellRequests.push({
                updateTextStyle: {
                    range: {
                        startIndex: cellStartIndex,
                        endIndex: cellStartIndex + String(text).length
                    },
                    textStyle: { bold: true },
                    fields: 'bold'
                }
            });
        }
    };

    setCell(0, 0, 'Ambiente', true);
    setCell(0, 1, 'Área (m²)', true);

    docContent.areas.forEach((area, i) => {
        setCell(i + 1, 0, area.name);
        setCell(i + 1, 1, formatMetric(area.calculatedAreaM2));
    });

    setCell(rows - 1, 0, 'TOTAL', true);
    setCell(rows - 1, 1, formatMetric(docContent.totalArea), true);

    if (cellRequests.length > 0) {
        await docsClient.documents.batchUpdate({
            documentId,
            requestBody: { requests: cellRequests }
        });
        logger.info(`[GoogleDocs] Table cells filled (${cellRequests.length} requests)`);
    }
}

async function applyContent(docsClient, documentId, docContent) {
    const { requests, tableIndex } = buildTextRequests(docContent);

    const batchSize = 50;
    for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        try {
            await docsClient.documents.batchUpdate({
                documentId,
                requestBody: { requests: batch }
            });
            logger.info(`[GoogleDocs] Batch ${Math.floor(i / batchSize) + 1} applied (${batch.length} requests)`);
        } catch (err) {
            const hasImages = batch.some((r) => r.insertInlineImage);
            if (hasImages) {
                logger.warn('[GoogleDocs] Batch with images failed, retrying text-only', {
                    batch: Math.floor(i / batchSize) + 1,
                    status: err.status,
                    message: err.message
                });
                const textOnly = batch.filter((r) => !r.insertInlineImage);
                if (textOnly.length > 0) {
                    try {
                        await docsClient.documents.batchUpdate({
                            documentId,
                            requestBody: { requests: textOnly }
                        });
                        logger.info(`[GoogleDocs] Text-only retry succeeded (${textOnly.length} requests)`);
                    } catch (retryErr) {
                        logger.error('[GoogleDocs] Text-only retry also failed', {
                            status: retryErr.status,
                            message: retryErr.message,
                            details: retryErr.errors
                        });
                    }
                }
            } else {
                logger.error('[GoogleDocs] BatchUpdate failed (no images in batch)', {
                    batch: Math.floor(i / batchSize) + 1,
                    status: err.status,
                    code: err.code,
                    message: err.message,
                    details: err.errors
                });
                throw err;
            }
        }
    }

    try {
        await buildAndApplyTable(docsClient, documentId, tableIndex, docContent);
    } catch (err) {
        logger.error('[GoogleDocs] Table insertion failed', {
            status: err.status,
            message: err.message,
            details: err.errors
        });
    }

    logger.info(`[GoogleDocs] Content applied (${requests.length} text requests + table)`);
}

async function cleanupDrive(driveClient) {
    try {
        const folderId = process.env.GOOGLE_DOCS_FOLDER_ID || null;
        const q = folderId
            ? `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`
            : "mimeType='application/vnd.google-apps.document' and trashed=false";
        const res = await driveClient.files.list({
            q,
            fields: 'files(id, name)',
            pageSize: 100,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        const files = res.data.files || [];
        if (files.length === 0) return;

        logger.info(`[GoogleDocs] Cleaning ${files.length} old docs from Drive`);
        for (const file of files) {
            try {
                await driveClient.files.delete({
                    fileId: file.id,
                    supportsAllDrives: true,
                });
            } catch (deleteErr) {
                logger.debug('[GoogleDocs] Could not delete doc', { fileId: file.id });
            }
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

    const folderId = process.env.GOOGLE_DOCS_FOLDER_ID || null;

    let documentId;
    try {
        const requestBody = {
            name: title,
            mimeType: 'application/vnd.google-apps.document',
        };
        if (folderId) {
            requestBody.parents = [folderId];
        }
        const createResponse = await driveClient.files.create({
            requestBody,
            fields: 'id',
            supportsAllDrives: true,
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

    await applyContent(docsClient, documentId, docContent);

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    logger.info(`[GoogleDocs] Document ready: ${docUrl}`);

    return { documentId, url: docUrl, title };
}

async function createUserGoogleDoc(reportData, userTokens) {
    const { google } = require('googleapis');
    const docContent = buildDocContent(reportData);

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_O_CLIENT_ID,
        process.env.GOOGLE_O_CLIENT_SECRET,
        process.env.GOOGLE_O_REDIRECT_URI
    );
    oauth2Client.setCredentials({
        access_token: userTokens.accessToken,
        refresh_token: userTokens.refreshToken,
    });

    const docsClient = google.docs({ version: 'v1', auth: oauth2Client });
    const driveClient = google.drive({ version: 'v3', auth: oauth2Client });

    const title = `Informe de Inspección — ${reportData.inspection.projectName}`;

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
        logger.info(`[GoogleDocs] User doc created: ${documentId}`);
    } catch (err) {
        logger.error('[GoogleDocs] Error creating user doc', {
            status: err.status,
            code: err.code,
            message: err.message,
        });
        throw err;
    }

    await applyContent(docsClient, documentId, docContent);

    const folderId = process.env.GOOGLE_DOCS_FOLDER_ID || null;
    if (folderId) {
        try {
            await driveClient.files.update({
                fileId: documentId,
                addParents: folderId,
                fields: 'id, parents'
            });
        } catch (err) {
            logger.warn('[GoogleDocs] Could not move user doc to folder', { message: err.message });
        }
    }

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    logger.info(`[GoogleDocs] User document ready: ${docUrl}`);

    return { documentId, url: docUrl, title };
}

module.exports = {
    createGoogleDoc,
    createUserGoogleDoc
};

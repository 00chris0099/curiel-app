const { google } = require('googleapis');
const { Readable } = require('stream');
const https = require('https');
const http = require('http');
const logger = require('../utils/logger');
const { buildInspectionReportHtml } = require('../pdf/inspectionReportTemplate');

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

function fetchImageAsBase64(url) {
    return new Promise((resolve) => {
        try {
            const client = url.startsWith('https') ? https : http;
            const req = client.get(url, { timeout: 10000 }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return fetchImageAsBase64(res.headers.location).then(resolve);
                }
                if (res.statusCode !== 200) {
                    resolve(null);
                    return;
                }
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const contentType = res.headers['content-type'] || 'image/png';
                    const base64 = buffer.toString('base64');
                    resolve(`data:${contentType};base64,${base64}`);
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

async function embedImagesAsBase64(html) {
    const imgRegex = /<img\s[^>]*src="([^"]+)"/gi;
    const urls = new Set();
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        const url = match[1];
        if (url && !url.startsWith('data:')) {
            urls.add(url);
        }
    }

    if (urls.size === 0) return html;

    logger.info(`[GoogleDocs] Embedding ${urls.size} images as base64`);

    const urlMap = {};
    const promises = [...urls].map(async (url) => {
        const dataUri = await fetchImageAsBase64(url);
        if (dataUri) {
            urlMap[url] = dataUri;
        } else {
            logger.warn('[GoogleDocs] Could not fetch image', { url });
        }
    });
    await Promise.all(promises);

    let result = html;
    for (const [url, dataUri] of Object.entries(urlMap)) {
        result = result.split(url).join(dataUri);
    }

    logger.info(`[GoogleDocs] Embedded ${Object.keys(urlMap).length}/${urls.size} images`);
    return result;
}

async function buildReportHtml(reportData) {
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

    const html = buildInspectionReportHtml({
        inspection,
        metadata,
        areas,
        observations,
        photos,
        summary,
        recommendations,
        inspectorSignature,
        logoUrl: require('../config').pdf.companyLogo,
        generatedAt: new Date().toISOString()
    });

    return embedImagesAsBase64(html);
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

async function uploadHtmlAsGoogleDoc(driveClient, html, title, folderId) {
    const fileMetadata = {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
    };
    if (folderId) {
        fileMetadata.parents = [folderId];
    }

    const res = await driveClient.files.create({
        requestBody: fileMetadata,
        media: {
            mimeType: 'text/html',
            body: Readable.from(Buffer.from(html, 'utf-8')),
        },
        fields: 'id, webViewLink',
        supportsAllDrives: true,
    });

    return {
        documentId: res.data.id,
        url: res.data.webViewLink || `https://docs.google.com/document/d/${res.data.id}/edit`
    };
}

async function createGoogleDoc(reportData) {
    const { driveClient } = getClients();

    const title = `Informe de Inspección — ${reportData.inspection.projectName}`;

    await cleanupDrive(driveClient);

    const folderId = process.env.GOOGLE_DOCS_FOLDER_ID || null;
    const html = buildReportHtml(reportData);

    const result = await uploadHtmlAsGoogleDoc(driveClient, html, title, folderId);

    logger.info(`[GoogleDocs] Document ready: ${result.url}`);

    return {
        documentId: result.documentId,
        url: result.url,
        title
    };
}

async function createUserGoogleDoc(reportData, userTokens) {
    const { google } = require('googleapis');

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_O_CLIENT_ID,
        process.env.GOOGLE_O_CLIENT_SECRET,
        process.env.GOOGLE_O_REDIRECT_URI
    );
    oauth2Client.setCredentials({
        access_token: userTokens.accessToken,
        refresh_token: userTokens.refreshToken,
    });

    const driveClient = google.drive({ version: 'v3', auth: oauth2Client });

    const title = `Informe de Inspección — ${reportData.inspection.projectName}`;
    const html = buildReportHtml(reportData);

    const result = await uploadHtmlAsGoogleDoc(driveClient, html, title, null);

    logger.info(`[GoogleDocs] User document ready: ${result.url}`);

    return {
        documentId: result.documentId,
        url: result.url,
        title
    };
}

module.exports = {
    createGoogleDoc,
    createUserGoogleDoc
};

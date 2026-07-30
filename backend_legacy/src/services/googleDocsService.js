const { google } = require('googleapis');
const { Readable } = require('stream');
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

function buildReportHtml(reportData) {
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

    return buildInspectionReportHtml({
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

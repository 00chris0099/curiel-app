const { google } = require('googleapis');
const { Readable } = require('stream');
const puppeteer = require('puppeteer');
const logger = require('../utils/logger');
const { buildInspectionReportHtml } = require('../pdf/inspectionReportTemplate');
const { pdfToDocx } = require('./ilovepdfService');

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
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(60000);
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

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

// ─── UPLOAD TO GOOGLE DRIVE ─────────────────────────────────────────────────────

async function findExistingDocByName(driveClient, title, folderId) {
    try {
        const query = `name = '${title}' and trashed = false and mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'`;
        const res = await driveClient.files.list({
            q: query,
            fields: 'files(id, webViewLink, name, createdTime)',
            orderBy: 'createdTime desc',
            pageSize: 1,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });
        if (res.data.files && res.data.files.length > 0) {
            const file = res.data.files[0];
            return {
                documentId: file.id,
                url: file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`,
            };
        }
    } catch (err) {
        logger.warn('[GoogleDocs] Error searching for existing doc', { error: err.message });
    }
    return null;
}

async function uploadPdfToDrive(driveClient, pdfBuffer, title, folderId) {
    const fileMetadata = {
        name: title.endsWith('.pdf') ? title : `${title}.pdf`,
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
        fields: 'id, webViewLink',
        supportsAllDrives: true,
    });

    return {
        documentId: res.data.id,
        url: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`,
    };
}

async function uploadDocxToDrive(driveClient, docxBuffer, title, folderId) {
    const fileMetadata = {
        name: title,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    if (folderId) {
        fileMetadata.parents = [folderId];
    }

    const res = await driveClient.files.create({
        requestBody: fileMetadata,
        media: {
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            body: Readable.from(docxBuffer),
        },
        fields: 'id, webViewLink',
        supportsAllDrives: true,
    });

    return {
        documentId: res.data.id,
        url: res.data.webViewLink || `https://docs.google.com/document/d/${res.data.id}/edit`,
    };
}

// ─── PUBLIC: CREATE SERVICE ACCOUNT DOC (PDF→DOCX→Google Drive) ────────────────

async function createGoogleDoc(reportData) {
    const sa = createServiceAccountClients();
    if (!sa) throw new Error('Google service account not configured');

    const title = `Informe de Inspeccion — ${reportData.inspection.projectName}`;
    const folderId = process.env.GOOGLE_DOCS_FOLDER_ID || null;

    const existing = await findExistingDocByName(sa.driveClient, title, folderId);
    if (existing) {
        logger.info(`[GoogleDocs] Reusing existing service account doc: ${existing.url}`);
        return { documentId: existing.documentId, url: existing.url, title };
    }

    const pdfBuffer = await generatePdfBuffer(reportData);

    const { docxBuffer } = await pdfToDocx(pdfBuffer, `${title}.pdf`);

    const result = await uploadDocxToDrive(sa.driveClient, docxBuffer, title, folderId);

    logger.info(`[GoogleDocs] DOCX created (via LibreOffice): ${result.url}`);

    return {
        documentId: result.documentId,
        url: result.url,
        title,
    };
}

// ─── PUBLIC: CREATE USER DOC (OAUTH, PDF→DOCX→Google Drive) ───────────────────

async function createUserGoogleDoc(reportData, userTokens) {
    const driveClient = getDriveClient(userTokens);

    const title = `Informe de Inspeccion — ${reportData.inspection.projectName}`;

    const existing = await findExistingDocByName(driveClient, title, null);
    if (existing) {
        logger.info(`[GoogleDocs] Reusing existing user doc: ${existing.url}`);
        return { documentId: existing.documentId, url: existing.url, title };
    }

    const pdfBuffer = await generatePdfBuffer(reportData);

    const { docxBuffer } = await pdfToDocx(pdfBuffer, `${title}.pdf`);

    const result = await uploadDocxToDrive(driveClient, docxBuffer, title, null);

    logger.info(`[GoogleDocs] User DOCX created (via LibreOffice): ${result.url}`);

    return {
        documentId: result.documentId,
        url: result.url,
        title,
    };
}

// ─── PUBLIC: DOWNLOAD PDF + SAVE TO DRIVE ──────────────────────────────────────

async function downloadAndSaveToDrive(reportData, userTokens) {
    const driveClient = getDriveClient(userTokens);

    const title = `Informe de Inspeccion — ${reportData.inspection.projectName}`;
    const pdfBuffer = await generatePdfBuffer(reportData);

    const folderId = process.env.GOOGLE_DOCS_FOLDER_ID || null;
    const result = await uploadPdfToDrive(driveClient, pdfBuffer, `${title}.pdf`, folderId);

    logger.info(`[GoogleDocs] PDF saved to Drive: ${result.url}`);

    return {
        pdfBuffer,
        documentId: result.documentId,
        url: result.url,
        title,
    };
}

module.exports = {
    createGoogleDoc,
    createUserGoogleDoc,
    downloadAndSaveToDrive,
};

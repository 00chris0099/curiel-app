const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const ILovePDFFile = require('@ilovepdf/ilovepdf-nodejs/ILovePDFFile');
const logger = require('../utils/logger');

const PUBLIC_KEY = process.env.ILOVEPDF_PUBLIC_KEY;
const SECRET_KEY = process.env.ILOVEPDF_SECRET_KEY;

let instance = null;

function getClient() {
    if (!PUBLIC_KEY || !SECRET_KEY) {
        throw new Error('iLovePDF keys not configured (ILOVEPDF_PUBLIC_KEY, ILOVEPDF_SECRET_KEY)');
    }
    if (!instance) {
        instance = new ILovePDFApi(PUBLIC_KEY, SECRET_KEY);
    }
    return instance;
}

/**
 * Convert PDF buffer to DOCX buffer using iLovePDF API
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} filename - Original filename
 * @returns {Promise<{docxBuffer: Buffer, filename: string}>}
 */
async function pdfToDocx(pdfBuffer, filename = 'report.pdf') {
    const client = getClient();
    const task = client.newTask('pdfword');

    try {
        await task.start();

        const file = new ILovePDFFile(pdfBuffer, filename);
        await task.addFile(file);

        await task.process();

        const data = await task.download();

        const outputFilename = filename.replace(/\.pdf$/i, '.docx');

        logger.info(`[iLovePDF] PDF converted to DOCX: ${outputFilename}`);

        return {
            docxBuffer: data,
            filename: outputFilename,
        };
    } catch (err) {
        logger.error('[iLovePDF] Conversion failed', { error: err.message });
        throw err;
    }
}

module.exports = {
    pdfToDocx,
};

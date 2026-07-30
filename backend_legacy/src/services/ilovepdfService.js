const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');

const SOFFICE_DIR = process.env.LIBRE_OFFICE_DIR
    || 'C:/Program Files/LibreOffice/program';
const SOFFICE_PATH = process.env.LIBRE_OFFICE_EXE
    || path.join(SOFFICE_DIR, 'soffice.com');

const LO_TMP_DIR = path.join(os.tmpdir(), 'loconvert');

function runSoffice(args, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const proc = spawn(SOFFICE_PATH, args, {
            cwd: SOFFICE_DIR,
            timeout: timeoutMs,
            windowsHide: true,
            env: { ...process.env },
        });

        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => { stdout += d; });
        proc.stderr.on('data', d => { stderr += d; });

        proc.on('close', code => {
            resolve({ code, stdout, stderr });
        });
        proc.on('error', reject);
    });
}

/**
 * Convert PDF buffer to DOCX buffer using LibreOffice
 * @param {Buffer} pdfBuffer - The PDF file buffer
 * @param {string} filename - Original filename
 * @returns {Promise<{docxBuffer: Buffer, filename: string}>}
 */
async function pdfToDocx(pdfBuffer, filename = 'report.pdf') {
    if (!fs.existsSync(LO_TMP_DIR)) fs.mkdirSync(LO_TMP_DIR, { recursive: true });

    const inputPath = path.join(LO_TMP_DIR, 'input.pdf');
    const outputPath = path.join(LO_TMP_DIR, 'input.docx');

    try {
        fs.writeFileSync(inputPath, pdfBuffer);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        const { code, stdout, stderr } = await runSoffice([
            '--headless',
            '--norestore',
            '--nologo',
            '--infilter=writer_pdf_import',
            '--convert-to', 'docx:MS Word 2007 XML',
            '--outdir', LO_TMP_DIR,
            inputPath,
        ]);

        if (!fs.existsSync(outputPath)) {
            const detail = stderr || stdout || 'no output';
            throw new Error(`LibreOffice conversion failed (exit ${code}): ${detail}`);
        }

        const docxBuffer = fs.readFileSync(outputPath);
        const outputFilename = filename.replace(/\.pdf$/i, '.docx');

        if (code !== 0) {
            logger.warn(`[LibreOffice] PDF→DOCX succeeded with warnings (exit ${code})`);
        }
        logger.info(`[LibreOffice] PDF→DOCX: ${outputFilename} (${docxBuffer.length} bytes)`);

        return { docxBuffer, filename: outputFilename };
    } catch (err) {
        logger.error('[LibreOffice] PDF→DOCX conversion failed', { error: err.message });
        throw err;
    } finally {
        try {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (_err) { /* ignore cleanup errors */ }
    }
}

module.exports = { pdfToDocx };

const inspectionReportService = require('../services/inspectionReportService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const downloadInspectionReport = asyncHandler(async (req, res) => {
    const result = await inspectionReportService.generateInspectionReport(
        req.params.id,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    const pdfBuffer = result.buffer;

    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 1000) {
        throw new AppError('El PDF generado es inválido o está incompleto', 500, 'INVALID_PDF_BUFFER');
    }

    if (pdfBuffer.subarray(0, 4).toString() !== '%PDF') {
        throw new AppError('El archivo generado no es un PDF válido', 500, 'INVALID_PDF_HEADER');
    }

    await createAuditLog(req.userId, 'generate_inspection_report', 'Inspection', req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="informe-inspeccion-${req.params.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
});

module.exports = {
    downloadInspectionReport
};

const inspectionReportService = require('../services/inspectionReportService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');

const downloadInspectionReport = asyncHandler(async (req, res) => {
    const result = await inspectionReportService.generateInspectionReport(
        req.params.id,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    await createAuditLog(req.userId, 'generate_inspection_report', 'Inspection', req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
});

module.exports = {
    downloadInspectionReport
};

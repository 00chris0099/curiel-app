const inspectionReportService = require('../services/inspectionReportService');
const reportJobQueue = require('../services/reportJobQueue');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');
const { createAuditLog } = require('../middlewares/auditLog');
const { buildInspectionReportHtml } = require('../pdf/inspectionReportTemplate');

const downloadInspectionReport = asyncHandler(async (req, res) => {
    const jobStatus = reportJobQueue.getJobStatus(req.params.id);
    if (jobStatus && (jobStatus.status === 'pending' || jobStatus.status === 'processing')) {
        return res.status(202).json({
            success: true,
            message: 'El informe se está generando. Intente nuevamente en unos segundos.',
            data: { jobStatus: jobStatus.status, retries: jobStatus.retries }
        });
    }

    const result = await inspectionReportService.generateInspectionReport(
        req.params.id,
        req.userId,
        req.userRole,
        req.isMasterAdmin
    );

    if (result.fromCache && result.cloudUrl) {
        await createAuditLog(req.userId, 'download_inspection_report_cached', 'Inspection', req.params.id);
        return res.redirect(result.cloudUrl);
    }

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

const getReportJobStatus = asyncHandler(async (req, res) => {
    const status = reportJobQueue.getJobStatus(req.params.id);
    if (!status) {
        return res.json({
            success: true,
            data: { status: 'idle', message: 'No hay trabajo de generación en cola' }
        });
    }
    return res.json({ success: true, data: status });
});

const getReportPreview = asyncHandler(async (req, res) => {
    const inspectionId = req.params.id;

    const inspection = await require('../lib/databases').prisma.inspecciones.inspection.findUnique({
        where: { id: inspectionId },
        include: {
            inspector: true,
            statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
    });

    if (!inspection) {
        throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
    }

    const [areas, observations, photos, summary, signatures] = await Promise.all([
        require('../lib/databases').prisma.inspecciones.inspectionArea.findMany({
            where: { inspectionId },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
        }),
        require('../lib/databases').prisma.inspecciones.inspectionObservation.findMany({
            where: { inspectionId },
            orderBy: [{ areaId: 'asc' }, { createdAt: 'asc' }]
        }),
        require('../lib/databases').prisma.media.photo.findMany({
            where: { inspectionId },
            orderBy: { createdAt: 'asc' }
        }),
        require('../lib/databases').prisma.inspecciones.inspectionSummary.findUnique({
            where: { inspectionId }
        }),
        require('../lib/databases').prisma.media.signature.findMany({
            where: { inspectionId }
        })
    ]);

    const metadata = inspectionReportService._parseInspectionMetadata(inspection.notes);
    const sortedAreas = inspectionReportService._sortAreas(areas.map(a => ({ ...a })));
    const sortedObservations = observations.map(obs => ({ ...obs }));
    const inspectorSignature = signatures.find(s => s.signatureType === 'inspector') || null;
    const recommendationGroups = inspectionReportService._buildRecommendationGroups(sortedObservations, summary);

    const html = buildInspectionReportHtml({
        inspection,
        metadata,
        areas: sortedAreas,
        observations: sortedObservations,
        photos: photos.map(p => ({ ...p })),
        summary: summary ? { ...summary } : null,
        recommendations: recommendationGroups,
        inspectorSignature: inspectorSignature ? { ...inspectorSignature } : null,
        logoUrl: require('../config').pdf.companyLogo,
        generatedAt: new Date().toISOString()
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
});

module.exports = {
    downloadInspectionReport,
    getReportJobStatus,
    getReportPreview
};

const { Inspection } = require('../models');
const { AppError, asyncHandler } = require('./errorHandler');

const loadInspection = async (inspectionId) => {
    const inspection = await Inspection.findByPk(inspectionId);

    if (!inspection) {
        throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
    }

    return inspection;
};

const ensureInspectionLoaded = async (req) => {
    if (req.inspection) {
        return req.inspection;
    }

    const inspection = await loadInspection(req.params.id);
    req.inspection = inspection;
    return inspection;
};

const requireInspectionAccess = asyncHandler(async (req, res, next) => {
    const inspection = await ensureInspectionLoaded(req);

    if (req.isMasterAdmin || req.userRole === 'admin' || req.userRole === 'arquitecto') {
        return next();
    }

    if (req.userRole === 'inspector' && inspection.inspectorId === req.userId) {
        return next();
    }

    throw new AppError('No tienes permisos para acceder a esta inspección', 403, 'FORBIDDEN');
});

const requireInspectionEditAccess = asyncHandler(async (req, res, next) => {
    await ensureInspectionLoaded(req);

    if (req.isMasterAdmin || req.userRole === 'admin' || req.userRole === 'arquitecto') {
        return next();
    }

    throw new AppError('No tienes permisos para editar esta inspección', 403, 'FORBIDDEN');
});

const requireInspectionStatusAccess = asyncHandler(async (req, res, next) => {
    const inspection = await ensureInspectionLoaded(req);

    if (req.isMasterAdmin || req.userRole === 'admin' || req.userRole === 'arquitecto') {
        return next();
    }

    if (req.userRole === 'inspector' && inspection.inspectorId === req.userId) {
        return next();
    }

    throw new AppError('No tienes permisos para cambiar el estado de esta inspección', 403, 'FORBIDDEN');
});

const requireInspectionReportAccess = asyncHandler(async (req, res, next) => {
    const inspection = await ensureInspectionLoaded(req);

    if (req.isMasterAdmin || req.userRole === 'admin' || req.userRole === 'arquitecto') {
        return next();
    }

    if (req.userRole === 'inspector' && inspection.inspectorId === req.userId) {
        if (['lista_revision', 'finalizada'].includes(inspection.status)) {
            return next();
        }

        throw new AppError('El inspector solo puede generar informes cuando la inspección está lista para revisión o finalizada', 403, 'FORBIDDEN');
    }

    throw new AppError('No tienes permisos para generar este informe', 403, 'FORBIDDEN');
});

module.exports = {
    requireInspectionAccess,
    requireInspectionEditAccess,
    requireInspectionStatusAccess,
    requireInspectionReportAccess,
};

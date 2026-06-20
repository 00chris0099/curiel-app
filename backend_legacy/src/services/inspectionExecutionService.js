const { prisma } = require('../lib/databases');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { AppError } = require('../middlewares/errorHandler');
const notificationService = require('./notificationService');

const defaultAreas = [
    { name: 'Entrada', category: 'interior' },
    { name: 'Sala', category: 'social' },
    { name: 'Comedor', category: 'social' },
    { name: 'Kitchenette', category: 'cocina' },
    { name: 'Centro de lavado', category: 'servicio' },
    { name: 'Balcón', category: 'exterior' },
    { name: 'Estudio', category: 'privado' },
    { name: 'Dormitorio principal', category: 'privado' },
    { name: 'Dormitorio secundario', category: 'privado' },
    { name: 'Baño principal', category: 'baño' },
    { name: 'Baño 2', category: 'baño' },
    { name: 'Muros y vanos', category: 'estructura/acabados' }
];

class InspectionExecutionService {
    async getExecutionData(inspectionId, userId, userRole, isMasterAdmin = false) {
        await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        const summary = await this._recalculateSummary(inspectionId);

        const inspection = await prisma.inspecciones.inspection.findUnique({
            where: { id: inspectionId }
        });

        const [areas, observations, photos] = await Promise.all([
            prisma.inspecciones.inspectionArea.findMany({
                where: { inspectionId },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
            }),
            prisma.inspecciones.inspectionObservation.findMany({
                where: { inspectionId },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.media.photo.findMany({
                where: { inspectionId },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return {
            inspection,
            areas: areas.map(area => this._serializeArea(area)),
            observations: observations.map(obs => this._serializeObservation(obs)),
            photos: photos.map(photo => this._serializePhoto(photo)),
            summary: this._serializeSummary(summary),
            stats: this._buildExecutionStats(summary, areas, observations, photos)
        };
    }

    async createDefaultAreas(inspectionId, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        const existingAreas = await prisma.inspecciones.inspectionArea.findMany({
            where: { inspectionId },
            select: { name: true, sortOrder: true }
        });

        const existingNames = new Set(existingAreas.map(a => a.name));
        const maxSortOrder = existingAreas.reduce((max, a) => Math.max(max, a.sortOrder || 0), 0);
        const areasToCreate = defaultAreas
            .filter(a => !existingNames.has(a.name))
            .map((a, index) => ({
                inspectionId,
                name: a.name,
                category: a.category,
                status: 'pendiente',
                sortOrder: maxSortOrder + index + 1
            }));

        if (areasToCreate.length > 0) {
            await prisma.inspecciones.inspectionArea.createMany({ data: areasToCreate });
        }

        const summary = await this._recalculateSummary(inspectionId);

        return {
            createdCount: areasToCreate.length,
            summary: this._serializeSummary(summary),
            areas: areasToCreate
        };
    }

    async createArea(inspectionId, areaData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        const maxResult = await prisma.inspecciones.inspectionArea.aggregate({
            _max: { sortOrder: true },
            where: { inspectionId }
        });

        const area = await prisma.inspecciones.inspectionArea.create({
            data: {
                inspectionId,
                name: areaData.name,
                category: areaData.category,
                lengthM: this._toNullableDecimal(areaData.lengthM),
                widthM: this._toNullableDecimal(areaData.widthM),
                ceilingHeightM: this._toNullableDecimal(areaData.ceilingHeightM),
                calculatedAreaM2: this._calculateArea(areaData.lengthM, areaData.widthM),
                notes: this._toNullableText(areaData.notes),
                status: areaData.status || 'pendiente',
                sortOrder: areaData.sortOrder ?? ((maxResult._max.sortOrder || 0) + 1)
            }
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            area: this._serializeArea(area),
            summary: this._serializeSummary(summary)
        };
    }

    async updateArea(inspectionId, areaId, areaData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        await this._getAreaOrThrow(areaId, inspectionId);

        const data = {};
        if (areaData.name !== undefined) data.name = areaData.name;
        if (areaData.category !== undefined) data.category = areaData.category;
        if (areaData.lengthM !== undefined) data.lengthM = this._toNullableDecimal(areaData.lengthM);
        if (areaData.widthM !== undefined) data.widthM = this._toNullableDecimal(areaData.widthM);
        if (areaData.ceilingHeightM !== undefined) data.ceilingHeightM = this._toNullableDecimal(areaData.ceilingHeightM);
        if (areaData.notes !== undefined) data.notes = this._toNullableText(areaData.notes);
        if (areaData.status !== undefined) data.status = areaData.status;
        if (areaData.sortOrder !== undefined) data.sortOrder = areaData.sortOrder;

        if (data.lengthM !== undefined || data.widthM !== undefined) {
            const current = await prisma.inspecciones.inspectionArea.findUnique({ where: { id: areaId } });
            data.calculatedAreaM2 = this._calculateArea(
                data.lengthM !== undefined ? data.lengthM : current.lengthM,
                data.widthM !== undefined ? data.widthM : current.widthM
            );
        }

        const area = await prisma.inspecciones.inspectionArea.update({
            where: { id: areaId },
            data
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            area: this._serializeArea(area),
            summary: this._serializeSummary(summary)
        };
    }

    async deleteArea(inspectionId, areaId, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        await this._getAreaOrThrow(areaId, inspectionId);

        const [observationCount, photoCount] = await Promise.all([
            prisma.inspecciones.inspectionObservation.count({ where: { areaId, inspectionId } }),
            prisma.media.photo.count({ where: { areaId, inspectionId } })
        ]);

        if (observationCount > 0 || photoCount > 0) {
            throw new AppError('No se puede eliminar un área que ya tiene observaciones o fotos asociadas', 400, 'AREA_HAS_DATA');
        }

        const area = await prisma.inspecciones.inspectionArea.delete({ where: { id: areaId } });
        const summary = await this._recalculateSummary(inspectionId);

        return {
            area: this._serializeArea(area),
            summary: this._serializeSummary(summary)
        };
    }

    async createObservation(inspectionId, observationData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);
        await this._getAreaOrThrow(observationData.areaId, inspectionId);

        const observation = await prisma.inspecciones.inspectionObservation.create({
            data: {
                inspectionId,
                areaId: observationData.areaId,
                title: observationData.title,
                description: observationData.description,
                severity: observationData.severity,
                type: observationData.type,
                recommendation: this._toNullableText(observationData.recommendation),
                metricValue: this._toNullableDecimal(observationData.metricValue),
                metricUnit: this._toNullableText(observationData.metricUnit),
                status: observationData.status || 'pendiente',
                createdBy: userId
            }
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            observation: this._serializeObservation(observation),
            summary: this._serializeSummary(summary)
        };
    }

    async updateObservation(inspectionId, observationId, observationData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        await this._getObservationOrThrow(observationId, inspectionId);

        if (observationData.areaId) {
            await this._getAreaOrThrow(observationData.areaId, inspectionId);
        }

        const data = {};
        if (observationData.areaId !== undefined) data.areaId = observationData.areaId;
        if (observationData.title !== undefined) data.title = observationData.title;
        if (observationData.description !== undefined) data.description = observationData.description;
        if (observationData.severity !== undefined) data.severity = observationData.severity;
        if (observationData.type !== undefined) data.type = observationData.type;
        if (observationData.recommendation !== undefined) data.recommendation = this._toNullableText(observationData.recommendation);
        if (observationData.metricValue !== undefined) data.metricValue = this._toNullableDecimal(observationData.metricValue);
        if (observationData.metricUnit !== undefined) data.metricUnit = this._toNullableText(observationData.metricUnit);
        if (observationData.status !== undefined) data.status = observationData.status;

        const observation = await prisma.inspecciones.inspectionObservation.update({
            where: { id: observationId },
            data
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            observation: this._serializeObservation(observation),
            summary: this._serializeSummary(summary)
        };
    }

    async deleteObservation(inspectionId, observationId, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        const observation = await this._getObservationOrThrow(observationId, inspectionId);

        await prisma.inspecciones.$transaction(async (tx) => {
            await prisma.media.photo.updateMany({
                where: { observationId, inspectionId },
                data: { observationId: null }
            });

            await tx.inspectionObservation.delete({ where: { id: observationId } });
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            observation: this._serializeObservation(observation),
            summary: this._serializeSummary(summary)
        };
    }

    async createPhoto(inspectionId, payload, file, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        let areaId = payload.areaId || null;
        let observationId = payload.observationId || null;

        if (areaId) {
            await this._getAreaOrThrow(areaId, inspectionId);
        }

        if (observationId) {
            const observation = await this._getObservationOrThrow(observationId, inspectionId);
            if (!areaId) areaId = observation.areaId;
        }

        if (payload.type === 'observacion' && !observationId) {
            throw new AppError('Las fotos de observación deben asociarse a una observación técnica', 400, 'OBSERVATION_REQUIRED');
        }

        if (payload.type === 'area' && !areaId) {
            throw new AppError('Las fotos de área deben asociarse a un área', 400, 'AREA_REQUIRED');
        }

        let url = payload.url || null;
        let publicId = null;

        if (file) {
            const cloudinaryResult = await uploadToCloudinary(file, {
                folder: `curiel/inspections/${inspectionId}/execution`
            });
            url = cloudinaryResult.secure_url;
            publicId = cloudinaryResult.public_id;
        }

        if (!url) {
            throw new AppError('Debes adjuntar una foto o indicar una URL válida', 400, 'PHOTO_SOURCE_REQUIRED');
        }

        const photo = await prisma.media.photo.create({
            data: {
                inspectionId,
                areaId,
                observationId,
                checklistItemId: null,
                type: payload.type,
                url,
                publicId,
                caption: this._toNullableText(payload.caption),
                latitude: this._toNullableDecimal(payload.latitude),
                longitude: this._toNullableDecimal(payload.longitude),
                uploadedById: userId
            }
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            photo: this._serializePhoto(photo),
            summary: this._serializeSummary(summary)
        };
    }

    async updateSummary(inspectionId, summaryData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);
        if (!isMasterAdmin && userRole === 'inspector' && ['lista_revision', 'finalizada', 'cancelada'].includes(inspection.status)) {
            throw new AppError('La inspección ya no puede ser editada por el inspector', 400, 'INSPECTION_COMPLETED');
        }

        await this._recalculateSummary(inspectionId);

        if (summaryData.reportStatus === 'aprobado' && !['admin', 'arquitecto'].includes(userRole) && !isMasterAdmin) {
            throw new AppError('Solo admin o arquitecto pueden aprobar el informe', 403, 'FORBIDDEN');
        }

        const data = {};
        if (summaryData.generalConclusion !== undefined) data.generalConclusion = this._toNullableText(summaryData.generalConclusion);
        if (summaryData.finalRecommendations !== undefined) data.finalRecommendations = this._toNullableText(summaryData.finalRecommendations);
        if (summaryData.reportStatus !== undefined) data.reportStatus = summaryData.reportStatus;

        const summary = await prisma.inspecciones.inspectionSummary.update({
            where: { inspectionId },
            data
        });

        return this._serializeSummary(summary);
    }

    async completeInspection(inspectionId, payload, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin);

        const areaCount = await prisma.inspecciones.inspectionArea.count({ where: { inspectionId } });
        if (areaCount === 0) {
            throw new AppError('Debes registrar al menos un área antes de finalizar la inspección', 400, 'AREAS_REQUIRED');
        }

        const summary = await this._recalculateSummary(inspectionId);
        if (!summary.generalConclusion && !summary.finalRecommendations) {
            throw new AppError('Completa la conclusión general o las recomendaciones finales antes de finalizar', 400, 'SUMMARY_REQUIRED');
        }

        let reportStatus = payload.reportStatus || 'listo_para_revision';
        if (reportStatus === 'aprobado' && !['admin', 'arquitecto'].includes(userRole) && !isMasterAdmin) {
            reportStatus = 'listo_para_revision';
        }

        const previousStatus = inspection.status;

        await prisma.inspecciones.$transaction(async (tx) => {
            await tx.inspectionSummary.update({
                where: { inspectionId },
                data: { reportStatus }
            });

            await tx.inspection.update({
                where: { id: inspectionId },
                data: { status: 'lista_revision', completedDate: null }
            });

            if (previousStatus !== 'lista_revision') {
                await tx.inspectionStatusHistory.create({
                    data: {
                        inspectionId,
                        changedByUserId: userId,
                        fromStatus: previousStatus,
                        toStatus: 'lista_revision',
                        reasonCode: null,
                        reasonLabel: null,
                        comment: null,
                        notifyClient: false,
                        notifyInspector: false
                    }
                });
            }
        });

        await notificationService.createForRoles(['admin', 'arquitecto'], {
            inspectionId: inspection.id,
            type: 'inspection_ready_for_review',
            title: 'Inspección lista para revisión',
            message: `El informe de la inspección ${inspection.projectName} ya está listo para ser revisado.`
        }, [inspection.inspectorId]);

        return {
            inspection,
            summary: this._serializeSummary(summary)
        };
    }

    async _getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin = false) {
        const inspection = await prisma.inspecciones.inspection.findUnique({
            where: { id: inspectionId }
        });

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        if (!isMasterAdmin && !['admin', 'arquitecto', 'inspector'].includes(userRole)) {
            throw new AppError('No tienes permisos para acceder a esta inspección', 403, 'FORBIDDEN');
        }

        if (!isMasterAdmin && userRole === 'inspector' && inspection.inspectorId !== userId) {
            throw new AppError('No tienes permisos para acceder a esta inspección', 403, 'FORBIDDEN');
        }

        return inspection;
    }

    async _getAreaOrThrow(areaId, inspectionId) {
        const area = await prisma.inspecciones.inspectionArea.findFirst({
            where: { id: areaId, inspectionId }
        });

        if (!area) {
            throw new AppError('Área de inspección no encontrada', 404, 'AREA_NOT_FOUND');
        }

        return area;
    }

    async _getObservationOrThrow(observationId, inspectionId) {
        const observation = await prisma.inspecciones.inspectionObservation.findFirst({
            where: { id: observationId, inspectionId }
        });

        if (!observation) {
            throw new AppError('Observación técnica no encontrada', 404, 'OBSERVATION_NOT_FOUND');
        }

        return observation;
    }

    async _recalculateSummary(inspectionId) {
        const [areas, observations] = await Promise.all([
            prisma.inspecciones.inspectionArea.findMany({
                where: { inspectionId },
                select: { calculatedAreaM2: true }
            }),
            prisma.inspecciones.inspectionObservation.findMany({
                where: { inspectionId },
                select: { severity: true }
            })
        ]);

        const totalAreaM2 = areas.reduce((sum, area) => sum + this._toNumber(area.calculatedAreaM2), 0);
        const criticalObservations = observations.filter(i => i.severity === 'critica').length;
        const highObservations = observations.filter(i => i.severity === 'alta').length;
        const mediumObservations = observations.filter(i => i.severity === 'media').length;
        const lightObservations = observations.filter(i => i.severity === 'leve').length;

        const summary = await prisma.inspecciones.inspectionSummary.upsert({
            where: { inspectionId },
            create: {
                inspectionId,
                totalAreaM2: this._roundToTwo(totalAreaM2),
                totalObservations: observations.length,
                criticalObservations,
                highObservations,
                mediumObservations,
                lightObservations
            },
            update: {
                totalAreaM2: this._roundToTwo(totalAreaM2),
                totalObservations: observations.length,
                criticalObservations,
                highObservations,
                mediumObservations,
                lightObservations
            }
        });

        return summary;
    }

    _assertInspectionEditable(inspection, userRole, isMasterAdmin) {
        if (!isMasterAdmin && userRole === 'inspector' && ['lista_revision', 'finalizada', 'cancelada'].includes(inspection.status)) {
            throw new AppError('La inspección ya no está disponible para edición del inspector', 400, 'INSPECTION_COMPLETED');
        }
    }

    _buildExecutionStats(summary, areas, observations, photos) {
        return {
            totalAreaM2: this._toNumber(summary.totalAreaM2),
            areasRegistered: areas.length,
            totalObservations: observations.length,
            criticalObservations: observations.filter(i => i.severity === 'critica').length,
            highObservations: observations.filter(i => i.severity === 'alta').length,
            mediumObservations: observations.filter(i => i.severity === 'media').length,
            lightObservations: observations.filter(i => i.severity === 'leve').length,
            photosCount: photos.length,
            reportStatus: summary.reportStatus
        };
    }

    _serializeArea(area) {
        return {
            ...area,
            lengthM: this._toNumber(area.lengthM, null),
            widthM: this._toNumber(area.widthM, null),
            ceilingHeightM: this._toNumber(area.ceilingHeightM, null),
            calculatedAreaM2: this._toNumber(area.calculatedAreaM2, null)
        };
    }

    _serializeObservation(obs) {
        return { ...obs, metricValue: this._toNumber(obs.metricValue, null) };
    }

    _serializePhoto(photo) {
        return {
            ...photo,
            latitude: this._toNumber(photo.latitude, null),
            longitude: this._toNumber(photo.longitude, null)
        };
    }

    _serializeSummary(summary) {
        if (!summary) return null;
        return { ...summary, totalAreaM2: this._toNumber(summary.totalAreaM2, 0) };
    }

    _calculateArea(lengthM, widthM) {
        const length = this._toNullableDecimal(lengthM);
        const width = this._toNullableDecimal(widthM);
        if (length === null || width === null) return null;
        return this._roundToTwo(length * width);
    }

    _toNullableDecimal(value) {
        if (value === undefined || value === null || value === '') return null;
        return this._roundToTwo(Number(value));
    }

    _toNullableText(value) {
        if (value === undefined || value === null) return null;
        const trimmed = String(value).trim();
        return trimmed ? trimmed : null;
    }

    _toNumber(value, fallback = 0) {
        if (value === undefined || value === null || value === '') return fallback;
        return Number(value);
    }

    _roundToTwo(value) {
        return Number(Number(value).toFixed(2));
    }
}

module.exports = new InspectionExecutionService();

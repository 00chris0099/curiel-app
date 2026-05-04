const {
    Inspection,
    InspectionArea,
    InspectionObservation,
    InspectionSummary,
    Photo,
    User
} = require('../models');
const { sequelize } = require('../config/database');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { AppError } = require('../middlewares/errorHandler');

const safeUserAttributes = {
    exclude: ['passwordHash', '_plainPassword']
};

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

        const inspection = await Inspection.findByPk(inspectionId, {
            include: [
                {
                    model: User,
                    as: 'inspector',
                    attributes: safeUserAttributes
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: safeUserAttributes
                }
            ]
        });

        const [areas, observations, photos] = await Promise.all([
            InspectionArea.findAll({
                where: { inspectionId },
                order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
            }),
            InspectionObservation.findAll({
                where: { inspectionId },
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: safeUserAttributes
                    }
                ],
                order: [['createdAt', 'DESC']]
            }),
            Photo.findAll({
                where: { inspectionId },
                include: [
                    {
                        model: User,
                        as: 'uploader',
                        attributes: safeUserAttributes
                    }
                ],
                order: [['createdAt', 'DESC']]
            })
        ]);

        return {
            inspection: this._serializeInspection(inspection),
            areas: areas.map((area) => this._serializeArea(area)),
            observations: observations.map((observation) => this._serializeObservation(observation)),
            photos: photos.map((photo) => this._serializePhoto(photo)),
            summary: this._serializeSummary(summary),
            stats: this._buildExecutionStats(summary, areas, observations, photos)
        };
    }

    async createDefaultAreas(inspectionId, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        const existingAreas = await InspectionArea.findAll({
            where: { inspectionId },
            attributes: ['name', 'sortOrder']
        });

        const existingNames = new Set(existingAreas.map((area) => area.name));
        const maxSortOrder = existingAreas.reduce((max, area) => Math.max(max, area.sortOrder || 0), 0);
        const areasToCreate = defaultAreas
            .filter((area) => !existingNames.has(area.name))
            .map((area, index) => ({
                inspectionId,
                name: area.name,
                category: area.category,
                status: 'pendiente',
                sortOrder: maxSortOrder + index + 1
            }));

        if (areasToCreate.length > 0) {
            await InspectionArea.bulkCreate(areasToCreate);
        }

        const summary = await this._recalculateSummary(inspectionId);

        return {
            createdCount: areasToCreate.length,
            summary: this._serializeSummary(summary),
            areas: areasToCreate
        };
    }

    async createArea(inspectionId, areaData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        const maxSortOrder = await InspectionArea.max('sortOrder', {
            where: { inspectionId }
        });

        const area = await InspectionArea.create({
            inspectionId,
            name: areaData.name,
            category: areaData.category,
            lengthM: this._toNullableDecimal(areaData.lengthM),
            widthM: this._toNullableDecimal(areaData.widthM),
            ceilingHeightM: this._toNullableDecimal(areaData.ceilingHeightM),
            calculatedAreaM2: this._calculateArea(areaData.lengthM, areaData.widthM),
            notes: this._toNullableText(areaData.notes),
            status: areaData.status || 'pendiente',
            sortOrder: areaData.sortOrder ?? ((maxSortOrder || 0) + 1)
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            area: this._serializeArea(area),
            summary: this._serializeSummary(summary)
        };
    }

    async updateArea(inspectionId, areaId, areaData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        const area = await this._getAreaOrThrow(areaId, inspectionId);

        if (areaData.name !== undefined) area.name = areaData.name;
        if (areaData.category !== undefined) area.category = areaData.category;
        if (areaData.lengthM !== undefined) area.lengthM = this._toNullableDecimal(areaData.lengthM);
        if (areaData.widthM !== undefined) area.widthM = this._toNullableDecimal(areaData.widthM);
        if (areaData.ceilingHeightM !== undefined) area.ceilingHeightM = this._toNullableDecimal(areaData.ceilingHeightM);
        if (areaData.notes !== undefined) area.notes = this._toNullableText(areaData.notes);
        if (areaData.status !== undefined) area.status = areaData.status;
        if (areaData.sortOrder !== undefined) area.sortOrder = areaData.sortOrder;

        area.calculatedAreaM2 = this._calculateArea(area.lengthM, area.widthM);
        await area.save();

        const summary = await this._recalculateSummary(inspectionId);

        return {
            area: this._serializeArea(area),
            summary: this._serializeSummary(summary)
        };
    }

    async deleteArea(inspectionId, areaId, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        const area = await this._getAreaOrThrow(areaId, inspectionId);
        const [observationCount, photoCount] = await Promise.all([
            InspectionObservation.count({ where: { areaId, inspectionId } }),
            Photo.count({ where: { areaId, inspectionId } })
        ]);

        if (observationCount > 0 || photoCount > 0) {
            throw new AppError('No se puede eliminar un área que ya tiene observaciones o fotos asociadas', 400, 'AREA_HAS_DATA');
        }

        await area.destroy();
        const summary = await this._recalculateSummary(inspectionId);

        return {
            area: this._serializeArea(area),
            summary: this._serializeSummary(summary)
        };
    }

    async createObservation(inspectionId, observationData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);
        await this._getAreaOrThrow(observationData.areaId, inspectionId);

        const observation = await InspectionObservation.create({
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
        });

        await observation.reload({
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: safeUserAttributes
                }
            ]
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            observation: this._serializeObservation(observation),
            summary: this._serializeSummary(summary)
        };
    }

    async updateObservation(inspectionId, observationId, observationData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        const observation = await this._getObservationOrThrow(observationId, inspectionId);
        if (observationData.areaId) {
            await this._getAreaOrThrow(observationData.areaId, inspectionId);
            observation.areaId = observationData.areaId;
        }

        if (observationData.title !== undefined) observation.title = observationData.title;
        if (observationData.description !== undefined) observation.description = observationData.description;
        if (observationData.severity !== undefined) observation.severity = observationData.severity;
        if (observationData.type !== undefined) observation.type = observationData.type;
        if (observationData.recommendation !== undefined) observation.recommendation = this._toNullableText(observationData.recommendation);
        if (observationData.metricValue !== undefined) observation.metricValue = this._toNullableDecimal(observationData.metricValue);
        if (observationData.metricUnit !== undefined) observation.metricUnit = this._toNullableText(observationData.metricUnit);
        if (observationData.status !== undefined) observation.status = observationData.status;

        await observation.save();
        await observation.reload({
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: safeUserAttributes
                }
            ]
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            observation: this._serializeObservation(observation),
            summary: this._serializeSummary(summary)
        };
    }

    async deleteObservation(inspectionId, observationId, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        const observation = await this._getObservationOrThrow(observationId, inspectionId);

        await sequelize.transaction(async (transaction) => {
            await Photo.update(
                { observationId: null },
                {
                    where: { observationId, inspectionId },
                    transaction
                }
            );

            await observation.destroy({ transaction });
            await this._recalculateSummary(inspectionId, transaction);
        });

        const summary = await InspectionSummary.findOne({ where: { inspectionId } });

        return {
            observation: this._serializeObservation(observation),
            summary: this._serializeSummary(summary)
        };
    }

    async createPhoto(inspectionId, payload, file, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);
        this._assertInspectionEditable(inspection, userRole, isMasterAdmin);

        let areaId = payload.areaId || null;
        let observationId = payload.observationId || null;

        if (areaId) {
            await this._getAreaOrThrow(areaId, inspectionId);
        }

        if (observationId) {
            const observation = await this._getObservationOrThrow(observationId, inspectionId);
            if (!areaId) {
                areaId = observation.areaId;
            }
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

        const photo = await Photo.create({
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
        });

        await photo.reload({
            include: [
                {
                    model: User,
                    as: 'uploader',
                    attributes: safeUserAttributes
                }
            ]
        });

        const summary = await this._recalculateSummary(inspectionId);

        return {
            photo: this._serializePhoto(photo),
            summary: this._serializeSummary(summary)
        };
    }

    async updateSummary(inspectionId, summaryData, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);
        if (inspection.status === 'finalizada' && userRole === 'inspector' && !isMasterAdmin) {
            throw new AppError('La inspección ya fue finalizada y no puede ser editada por el inspector', 400, 'INSPECTION_COMPLETED');
        }

        const summary = await this._recalculateSummary(inspectionId);

        if (summaryData.reportStatus === 'aprobado' && !['admin', 'arquitecto'].includes(userRole) && !isMasterAdmin) {
            throw new AppError('Solo admin o arquitecto pueden aprobar el informe', 403, 'FORBIDDEN');
        }

        if (summaryData.generalConclusion !== undefined) {
            summary.generalConclusion = this._toNullableText(summaryData.generalConclusion);
        }

        if (summaryData.finalRecommendations !== undefined) {
            summary.finalRecommendations = this._toNullableText(summaryData.finalRecommendations);
        }

        if (summaryData.reportStatus !== undefined) {
            summary.reportStatus = summaryData.reportStatus;
        }

        await summary.save();

        return this._serializeSummary(summary);
    }

    async completeInspection(inspectionId, payload, userId, userRole, isMasterAdmin = false) {
        const inspection = await this._getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin, true);

        const areaCount = await InspectionArea.count({ where: { inspectionId } });
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

        await sequelize.transaction(async (transaction) => {
            summary.reportStatus = reportStatus;
            await summary.save({ transaction });

            inspection.status = 'finalizada';
            inspection.completedDate = new Date();
            await inspection.save({ transaction });
        });

        return {
            inspection: this._serializeInspection(inspection),
            summary: this._serializeSummary(summary)
        };
    }

    async _getInspectionWithAccess(inspectionId, userId, userRole, isMasterAdmin = false) {
        const inspection = await Inspection.findByPk(inspectionId, {
            include: [
                {
                    model: User,
                    as: 'inspector',
                    attributes: safeUserAttributes
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: safeUserAttributes
                }
            ]
        });

        if (!inspection) {
            throw new AppError('Inspección no encontrada', 404, 'INSPECTION_NOT_FOUND');
        }

        if (!isMasterAdmin && userRole === 'inspector' && inspection.inspectorId !== userId) {
            throw new AppError('No tienes permisos para acceder a esta inspección', 403, 'FORBIDDEN');
        }

        return inspection;
    }

    async _getAreaOrThrow(areaId, inspectionId) {
        const area = await InspectionArea.findOne({
            where: {
                id: areaId,
                inspectionId
            }
        });

        if (!area) {
            throw new AppError('Área de inspección no encontrada', 404, 'AREA_NOT_FOUND');
        }

        return area;
    }

    async _getObservationOrThrow(observationId, inspectionId) {
        const observation = await InspectionObservation.findOne({
            where: {
                id: observationId,
                inspectionId
            },
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: safeUserAttributes
                }
            ]
        });

        if (!observation) {
            throw new AppError('Observación técnica no encontrada', 404, 'OBSERVATION_NOT_FOUND');
        }

        return observation;
    }

    async _recalculateSummary(inspectionId, transaction = null) {
        const [areas, observations, summary] = await Promise.all([
            InspectionArea.findAll({
                where: { inspectionId },
                attributes: ['calculatedAreaM2'],
                transaction
            }),
            InspectionObservation.findAll({
                where: { inspectionId },
                attributes: ['severity'],
                transaction
            }),
            InspectionSummary.findOne({
                where: { inspectionId },
                transaction
            })
        ]);

        const totalAreaM2 = areas.reduce((sum, area) => sum + this._toNumber(area.calculatedAreaM2), 0);
        const criticalObservations = observations.filter((item) => item.severity === 'critica').length;
        const highObservations = observations.filter((item) => item.severity === 'alta').length;
        const mediumObservations = observations.filter((item) => item.severity === 'media').length;
        const lightObservations = observations.filter((item) => item.severity === 'leve').length;

        const summaryModel = summary || InspectionSummary.build({ inspectionId });
        summaryModel.totalAreaM2 = this._roundToTwo(totalAreaM2);
        summaryModel.totalObservations = observations.length;
        summaryModel.criticalObservations = criticalObservations;
        summaryModel.highObservations = highObservations;
        summaryModel.mediumObservations = mediumObservations;
        summaryModel.lightObservations = lightObservations;

        await summaryModel.save({ transaction });
        return summaryModel;
    }

    _assertInspectionEditable(inspection, userRole, isMasterAdmin) {
        if (inspection.status === 'finalizada' && userRole === 'inspector' && !isMasterAdmin) {
            throw new AppError('La inspección ya fue finalizada y no puede seguir editándose', 400, 'INSPECTION_COMPLETED');
        }
    }

    _buildExecutionStats(summary, areas, observations, photos) {
        return {
            totalAreaM2: this._toNumber(summary.totalAreaM2),
            areasRegistered: areas.length,
            totalObservations: observations.length,
            criticalObservations: observations.filter((item) => item.severity === 'critica').length,
            highObservations: observations.filter((item) => item.severity === 'alta').length,
            mediumObservations: observations.filter((item) => item.severity === 'media').length,
            lightObservations: observations.filter((item) => item.severity === 'leve').length,
            photosCount: photos.length,
            reportStatus: summary.reportStatus
        };
    }

    _serializeInspection(inspection) {
        return inspection?.toJSON ? inspection.toJSON() : inspection;
    }

    _serializeArea(area) {
        const data = area.toJSON ? area.toJSON() : area;
        return {
            ...data,
            lengthM: this._toNumber(data.lengthM, null),
            widthM: this._toNumber(data.widthM, null),
            ceilingHeightM: this._toNumber(data.ceilingHeightM, null),
            calculatedAreaM2: this._toNumber(data.calculatedAreaM2, null)
        };
    }

    _serializeObservation(observation) {
        const data = observation.toJSON ? observation.toJSON() : observation;
        return {
            ...data,
            metricValue: this._toNumber(data.metricValue, null)
        };
    }

    _serializePhoto(photo) {
        const data = photo.toJSON ? photo.toJSON() : photo;
        return {
            ...data,
            latitude: this._toNumber(data.latitude, null),
            longitude: this._toNumber(data.longitude, null)
        };
    }

    _serializeSummary(summary) {
        if (!summary) {
            return null;
        }

        const data = summary.toJSON ? summary.toJSON() : summary;
        return {
            ...data,
            totalAreaM2: this._toNumber(data.totalAreaM2, 0)
        };
    }

    _calculateArea(lengthM, widthM) {
        const length = this._toNullableDecimal(lengthM);
        const width = this._toNullableDecimal(widthM);

        if (length === null || width === null) {
            return null;
        }

        return this._roundToTwo(length * width);
    }

    _toNullableDecimal(value) {
        if (value === undefined || value === null || value === '') {
            return null;
        }

        return this._roundToTwo(Number(value));
    }

    _toNullableText(value) {
        if (value === undefined || value === null) {
            return null;
        }

        const trimmed = String(value).trim();
        return trimmed ? trimmed : null;
    }

    _toNumber(value, fallback = 0) {
        if (value === undefined || value === null || value === '') {
            return fallback;
        }

        return Number(value);
    }

    _roundToTwo(value) {
        return Number(Number(value).toFixed(2));
    }
}

module.exports = new InspectionExecutionService();

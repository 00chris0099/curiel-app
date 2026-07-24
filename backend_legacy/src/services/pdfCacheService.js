const crypto = require('crypto');
const { prisma } = require('../lib/databases');
const logger = require('../utils/logger');

class PdfCacheService {
    computeContentHash({ areas, observations, photos, summary, metadata }) {
        const payload = JSON.stringify({
            areas: (areas || []).map((a) => ({
                id: a.id,
                name: a.name,
                calculatedAreaM2: a.calculatedAreaM2,
                sortOrder: a.sortOrder
            })),
            observations: (observations || []).map((o) => ({
                id: o.id,
                areaId: o.areaId,
                title: o.title,
                description: o.description,
                severity: o.severity,
                type: o.type,
                metricValue: o.metricValue,
                recommendation: o.recommendation
            })),
            photos: (photos || []).map((p) => ({
                id: p.id,
                url: p.url,
                type: p.type,
                observationId: p.observationId,
                areaId: p.areaId
            })),
            summary: summary ? {
                generalConclusion: summary.generalConclusion,
                finalRecommendations: summary.finalRecommendations,
                reportStatus: summary.reportStatus,
                totalAreaM2: summary.totalAreaM2,
                totalObservations: summary.totalObservations
            } : null,
            metadata
        });

        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    async getCachedReport(inspectionId) {
        try {
            const summary = await prisma.inspecciones.inspectionSummary.findUnique({
                where: { inspectionId },
                select: {
                    cachedReportUrl: true,
                    cachedReportAt: true,
                    reportContentHash: true
                }
            });

            if (!summary || !summary.cachedReportUrl || !summary.reportContentHash) {
                return null;
            }

            return {
                cloudUrl: summary.cachedReportUrl,
                expiresAt: summary.cachedReportAt,
                contentHash: summary.reportContentHash
            };
        } catch (error) {
            logger.warn('Error reading PDF cache', { inspectionId, error: error.message });
            return null;
        }
    }

    async saveCache(inspectionId, cloudUrl, contentHash) {
        try {
            await prisma.inspecciones.inspectionSummary.upsert({
                where: { inspectionId },
                update: {
                    cachedReportUrl: cloudUrl,
                    cachedReportAt: new Date(),
                    reportContentHash: contentHash
                },
                create: {
                    inspectionId,
                    cachedReportUrl: cloudUrl,
                    cachedReportAt: new Date(),
                    reportContentHash: contentHash
                }
            });
            logger.info('PDF cache saved', { inspectionId });
        } catch (error) {
            logger.warn('Error saving PDF cache', { inspectionId, error: error.message });
        }
    }

    async invalidateCache(inspectionId) {
        try {
            await prisma.inspecciones.inspectionSummary.updateMany({
                where: { inspectionId },
                data: {
                    cachedReportUrl: null,
                    cachedReportAt: null,
                    reportContentHash: null
                }
            });
            logger.info('PDF cache invalidated', { inspectionId });
        } catch (error) {
            logger.warn('Error invalidating PDF cache', { inspectionId, error: error.message });
        }
    }
}

module.exports = new PdfCacheService();

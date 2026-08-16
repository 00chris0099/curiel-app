const crypto = require('crypto');
const { prisma } = require('../lib/databases');
const logger = require('../utils/logger');

class PdfCacheService {
    computeContentHash(data) {
        const payload = JSON.stringify({
            areas: (data.areas || []).map((a) => ({
                id: a.id,
                name: a.name,
                calculatedAreaM2: a.calculatedAreaM2,
                sortOrder: a.sortOrder
            })),
            observations: (data.observations || []).map((o) => ({
                id: o.id,
                areaId: o.areaId,
                title: o.title,
                description: o.description,
                severity: o.severity,
                type: o.type,
                recommendation: o.recommendation,
                metricValue: o.metricValue,
                metricUnit: o.metricUnit
            })),
            photos: (data.photos || []).map((p) => ({
                id: p.id,
                url: p.url,
                type: p.type,
                observationId: p.observationId,
                areaId: p.areaId,
                isMain: p.isMain
            })),
            summary: data.summary ? {
                generalConclusion: data.summary.generalConclusion,
                finalRecommendations: data.summary.finalRecommendations,
                reportStatus: data.summary.reportStatus
            } : null,
            metadata: data.metadata || {}
        });

        return crypto.createHash('sha256').update(payload).digest('hex');
    }

    async getCachedReport(inspectionId) {
        try {
            const rows = await prisma.inspecciones.$queryRawUnsafe(
                `SELECT cached_report_url, cached_report_at, report_content_hash
                 FROM inspection_summaries
                 WHERE inspection_id = $1::uuid
                 LIMIT 1`,
                inspectionId
            );

            if (!rows || !rows.length || !rows[0].cached_report_url || !rows[0].report_content_hash) {
                return null;
            }

            return {
                cloudUrl: rows[0].cached_report_url,
                expiresAt: rows[0].cached_report_at,
                contentHash: rows[0].report_content_hash
            };
        } catch (error) {
            logger.warn('Error reading PDF cache', { inspectionId, error: error.message });
            return null;
        }
    }

    async isCacheValid(inspectionId, currentHash) {
        try {
            const cached = await this.getCachedReport(inspectionId);
            if (!cached || !cached.contentHash) return false;
            return cached.contentHash === currentHash;
        } catch {
            return false;
        }
    }

    async saveCache(inspectionId, cloudUrl, contentHash) {
        try {
            await prisma.inspecciones.$executeRawUnsafe(
                `INSERT INTO inspection_summaries (id, inspection_id, cached_report_url, cached_report_at, report_content_hash, created_at, updated_at)
                 VALUES (gen_random_uuid(), $1::uuid, $2, NOW(), $3, NOW(), NOW())
                 ON CONFLICT (inspection_id) DO UPDATE SET
                     cached_report_url = $2,
                     cached_report_at = NOW(),
                     report_content_hash = $3,
                     updated_at = NOW()`,
                inspectionId, cloudUrl, contentHash
            );
            logger.info('PDF cache saved', { inspectionId });
        } catch (error) {
            logger.warn('Failed to save PDF cache', { inspectionId, error: error.message });
        }
    }

    async invalidateCache(inspectionId) {
        try {
            await prisma.inspecciones.$executeRawUnsafe(
                `UPDATE inspection_summaries
                 SET cached_report_url = NULL, cached_report_at = NULL, report_content_hash = NULL
                 WHERE inspection_id = $1::uuid`,
                inspectionId
            );
            logger.info('PDF cache invalidated', { inspectionId });
        } catch (error) {
            logger.warn('Failed to invalidate PDF cache', { inspectionId, error: error.message });
        }
    }
}

module.exports = new PdfCacheService();

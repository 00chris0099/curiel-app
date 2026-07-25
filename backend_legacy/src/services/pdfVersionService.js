const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

class PdfVersionService {
    async getVersions(inspectionId) {
        return prisma.inspecciones.pdfVersion.findMany({
            where: { inspectionId },
            orderBy: { versionNumber: 'desc' },
            take: 50
        });
    }

    async getVersion(inspectionId, versionNumber) {
        const version = await prisma.inspecciones.pdfVersion.findUnique({
            where: {
                inspectionId_versionNumber: {
                    inspectionId,
                    versionNumber: parseInt(versionNumber)
                }
            }
        });

        if (!version) {
            throw new AppError('Versión no encontrada', 404, 'VERSION_NOT_FOUND');
        }

        return version;
    }

    async createVersion(inspectionId, snapshotJson, userId, description) {
        const lastVersion = await prisma.inspecciones.pdfVersion.findFirst({
            where: { inspectionId },
            orderBy: { versionNumber: 'desc' }
        });

        const nextVersion = (lastVersion?.versionNumber || 0) + 1;

        return prisma.inspecciones.pdfVersion.create({
            data: {
                inspectionId,
                versionNumber: nextVersion,
                snapshotJson,
                createdBy: userId,
                description: description || `Versión ${nextVersion}`
            }
        });
    }

    async restoreVersion(inspectionId, versionNumber) {
        const version = await this.getVersion(inspectionId, versionNumber);
        return version.snapshotJson;
    }
}

module.exports = new PdfVersionService();

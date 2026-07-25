const { prisma } = require('../lib/databases');
const { AppError } = require('../middlewares/errorHandler');

class PdfDraftService {
    async getDraft(inspectionId) {
        const draft = await prisma.inspecciones.pdfDraft.findUnique({
            where: { inspectionId }
        });
        return draft;
    }

    async saveDraft(inspectionId, snapshotJson, userId) {
        return prisma.inspecciones.pdfDraft.upsert({
            where: { inspectionId },
            create: {
                inspectionId,
                snapshotJson,
                savedBy: userId
            },
            update: {
                snapshotJson,
                savedBy: userId
            }
        });
    }

    async deleteDraft(inspectionId) {
        try {
            await prisma.inspecciones.pdfDraft.delete({
                where: { inspectionId }
            });
        } catch {
            // Draft doesn't exist, ignore
        }
    }
}

module.exports = new PdfDraftService();

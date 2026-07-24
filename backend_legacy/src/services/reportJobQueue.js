const logger = require('../utils/logger');

const MAX_RETRIES = 3;
const BACKOFF_MS = [5000, 15000, 45000];

class ReportJobQueue {
    constructor() {
        this.jobs = new Map();
    }

    enqueue(inspectionId, generateFn) {
        if (this.jobs.has(inspectionId)) {
            const existing = this.jobs.get(inspectionId);
            if (existing.status === 'pending' || existing.status === 'processing') {
                logger.info('Report job already queued', { inspectionId });
                return existing;
            }
        }

        const job = {
            inspectionId,
            status: 'pending',
            retries: 0,
            result: null,
            error: null,
            enqueuedAt: new Date().toISOString(),
            completedAt: null
        };

        this.jobs.set(inspectionId, job);
        this._processNext(inspectionId, generateFn);
        return job;
    }

    async _processNext(inspectionId, generateFn) {
        const job = this.jobs.get(inspectionId);
        if (!job || job.status === 'processing') return;

        job.status = 'processing';
        this.jobs.set(inspectionId, job);

        try {
            const result = await generateFn(inspectionId);
            job.status = 'completed';
            job.result = { cloudUrl: result.cloudUrl, cloudExpiresAt: result.cloudExpiresAt };
            job.completedAt = new Date().toISOString();
            logger.info('Report job completed', { inspectionId });
        } catch (error) {
            job.retries++;
            if (job.retries < MAX_RETRIES) {
                const delay = BACKOFF_MS[job.retries - 1] || 30000;
                logger.warn('Report job failed, retrying', {
                    inspectionId,
                    retry: job.retries,
                    delay,
                    error: error.message
                });
                job.status = 'pending';
                this.jobs.set(inspectionId, job);
                setTimeout(() => this._processNext(inspectionId, generateFn), delay);
            } else {
                job.status = 'failed';
                job.error = error.message;
                job.completedAt = new Date().toISOString();
                logger.error('Report job failed permanently', {
                    inspectionId,
                    error: error.message
                });
            }
        }
    }

    getStatus(inspectionId) {
        return this.jobs.get(inspectionId) || null;
    }

    getResult(inspectionId) {
        const job = this.jobs.get(inspectionId);
        if (!job) return null;
        return {
            status: job.status,
            result: job.result,
            error: job.error,
            enqueuedAt: job.enqueuedAt,
            completedAt: job.completedAt,
            retries: job.retries
        };
    }
}

module.exports = new ReportJobQueue();

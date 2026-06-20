const express = require('express');
const os = require('os');
const { sequelize } = require('../config/database');
const config = require('../config');
const { client: metricsClient, httpRequestDuration, httpRequestTotal } = require('../utils/metrics');
const { getCacheStatus } = require('../utils/cache');
const authRoutes = require('./authRoutes');
const usersRoutes = require('./usersRoutes');
const inspectionRoutes = require('./inspectionRoutes');
const checklistRoutes = require('./checklistRoutes');
const photoRoutes = require('./photoRoutes');
const notificationRoutes = require('./notificationRoutes');
const clientRoutes = require('./clientRoutes');
const alertRoutes = require('./alertRoutes');
const suspensionRoutes = require('./suspensionRoutes');
const evaluationRoutes = require('./evaluationRoutes');

const router = express.Router();

router.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', metricsClient.register.contentType);
        res.end(await metricsClient.register.metrics());
    } catch (error) {
        res.status(500).end();
    }
});

router.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    let dbLatency = null;

    try {
        const startTime = Date.now();
        await sequelize.authenticate();
        dbLatency = Date.now() - startTime;
        dbStatus = 'connected';
    } catch (error) {
        dbStatus = 'error';
    }

    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    const healthData = {
        success: true,
        status: dbStatus === 'connected' ? 'operational' : 'degraded',
        timestamp: new Date().toISOString(),
        env: config.server.env,
        uptime: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
        uptimeSeconds: Math.round(uptime),
        database: {
            status: dbStatus,
            latency: dbLatency ? `${dbLatency}ms` : null
        },
        cache: getCacheStatus(),
        memory: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        },
        system: {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            loadAvg: os.loadavg().map((l) => l.toFixed(2)),
            freeMemory: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
            totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)}MB`
        },
        version: process.env.npm_package_version || '1.0.0'
    };

    const statusCode = healthData.status === 'operational' ? 200 : 503;
    res.status(statusCode).json(healthData);
});

// Rutas principales
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/checklists', checklistRoutes);
router.use('/photos', photoRoutes);
router.use('/notifications', notificationRoutes);
router.use('/clients', clientRoutes);
router.use('/alerts', alertRoutes);
router.use('/suspensions', suspensionRoutes);
router.use('/evaluations', evaluationRoutes);

module.exports = router;

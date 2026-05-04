const express = require('express');
const { sequelize } = require('../config/database');
const authRoutes = require('./authRoutes');
const usersRoutes = require('./usersRoutes');
const inspectionRoutes = require('./inspectionRoutes');
const checklistRoutes = require('./checklistRoutes');
const photoRoutes = require('./photoRoutes');

const router = express.Router();

// Health check mejorado con DB status
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

    const healthData = {
        success: true,
        status: 'operational',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
            status: dbStatus,
            latency: dbLatency ? `${dbLatency}ms` : null
        },
        memory: {
            used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
        },
        version: '1.0.0'
    };

    res.json(healthData);
});

// Rutas principales
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/inspections', inspectionRoutes);
router.use('/checklists', checklistRoutes);
router.use('/photos', photoRoutes);

module.exports = router;

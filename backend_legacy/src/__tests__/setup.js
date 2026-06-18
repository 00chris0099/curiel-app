const { sequelize } = require('../config/database');
require('../models');

let app;

beforeAll(async () => {
    await sequelize.authenticate();
    app = require('../app');
});

afterAll(async () => {
    await sequelize.close();
});

module.exports = { getApp: () => app };

const { prisma, connectAll, disconnectAll } = require('../lib/databases');

let app;

beforeAll(async () => {
    await connectAll();
    app = require('../app');
});

afterAll(async () => {
    await disconnectAll();
});

module.exports = { getApp: () => app };

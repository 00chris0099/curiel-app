const client = require('prom-client');

const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics({
    prefix: 'curiel_',
    labels: { app: 'curiel-api' }
});

const httpRequestDuration = new client.Histogram({
    name: 'curiel_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new client.Counter({
    name: 'curiel_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
    name: 'curiel_active_connections',
    help: 'Number of active connections'
});

const dbQueryDuration = new client.Histogram({
    name: 'curiel_db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const emailsSent = new client.Counter({
    name: 'curiel_emails_sent_total',
    help: 'Total number of emails sent',
    labelNames: ['status', 'type']
});

const webhooksTriggered = new client.Counter({
    name: 'curiel_webhooks_triggered_total',
    help: 'Total number of webhooks triggered',
    labelNames: ['type', 'status']
});

module.exports = {
    client,
    httpRequestDuration,
    httpRequestTotal,
    activeConnections,
    dbQueryDuration,
    emailsSent,
    webhooksTriggered
};

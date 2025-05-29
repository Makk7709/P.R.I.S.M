const { register, metrics } = require('./prismMetrics');
const http = require('http');

// Ensure metrics are initialized with some values
metrics.efficiency.set(45); // Set initial efficiency

const server = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    try {
      res.setHeader('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      console.error('Error generating metrics:', error);
      res.statusCode = 500;
      res.end('Error generating metrics');
    }
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

const PORT = process.env.METRICS_PORT || 9100;
server.listen(PORT, () => {
  console.log(`Metrics server listening on port ${PORT}`);
}); 
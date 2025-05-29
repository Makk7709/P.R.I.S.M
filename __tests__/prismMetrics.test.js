import PrismMetrics from '../monitoring/prismMetrics';
import http from 'http';

describe('PrismMetrics', () => {
  let metrics;
  const TEST_PORT = 9101;
  const TEST_TIMEOUT = 10000;

  beforeEach(async () => {
    metrics = new PrismMetrics();
    await metrics.startMetricsServer(TEST_PORT);
  });

  afterEach(async () => {
    await metrics.stop();
    // Attendre que le serveur soit complètement arrêté
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  const fetchMetrics = async () => {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${TEST_PORT}/metrics`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(5000, () => req.destroy());
    });
  };

  it('should start metrics server and expose /metrics endpoint', async () => {
    const response = await fetchMetrics();
    expect(response.statusCode).toBe(200);
    expect(response.data).toContain('prism_directives_total');
    expect(response.data).toContain('prism_efficiency_percent');
    expect(response.data).toContain('prism_cycler_interval_ms');
    expect(response.data).toContain('prism_latency_seconds');
  }, TEST_TIMEOUT);

  it('should record directive metrics', async () => {
    metrics.recordDirective('success');
    metrics.recordDirective('success');
    metrics.recordDirective('failure');

    // Attendre que les métriques soient mises à jour
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response = await fetchMetrics();
    expect(response.data).toMatch(/prism_directives_total{result="success"} 2/);
    expect(response.data).toMatch(/prism_directives_total{result="failure"} 1/);
  }, TEST_TIMEOUT);

  it('should record efficiency and cycler interval', async () => {
    metrics.setEfficiency(75.5);
    metrics.setCyclerInterval(1000);

    // Attendre que les métriques soient mises à jour
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response = await fetchMetrics();
    expect(response.data).toMatch(/prism_efficiency_percent 75.5/);
    expect(response.data).toMatch(/prism_cycler_interval_ms 1000/);
  }, TEST_TIMEOUT);

  it('should record latency metrics', async () => {
    // Simuler un événement de profilage
    metrics.recordLatency('strategic', 0.42);
    await new Promise(resolve => setTimeout(resolve, 10)); // Laisser prom-client mettre à jour

    const response = await fetchMetrics();
    
    // Vérifier les sommes et les compteurs pour chaque segment
    expect(response.data).toMatch(/prism_latency_seconds_sum{segment="strategic"} 0\.9[0-9]+/); // ~0.92
    expect(response.data).toMatch(/prism_latency_seconds_count{segment="strategic"} 2/); // 2 observations
    
    expect(response.data).toMatch(/prism_latency_seconds_sum{segment="cycler"} 0\.5/);
    expect(response.data).toMatch(/prism_latency_seconds_count{segment="cycler"} 1/);
    
    expect(response.data).toMatch(/prism_latency_seconds_sum{segment="codex"} 0\.5/);
    expect(response.data).toMatch(/prism_latency_seconds_count{segment="codex"} 1/);
  }, TEST_TIMEOUT);
}); 
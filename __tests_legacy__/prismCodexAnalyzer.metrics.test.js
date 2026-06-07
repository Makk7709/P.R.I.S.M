import PrismCodexAnalyzer from '../memory/prismCodexAnalyzer.js';
import http from 'node:http';

describe('PrismCodexAnalyzer - Metrics Integration', () => {
  let analyzer;
  let metricsServer;
  const TEST_PORT = 9102;
  const TEST_METRICS = `
# HELP prism_efficiency_percent Current PRISM efficiency percentage
# TYPE prism_efficiency_percent gauge
prism_efficiency_percent 55.5

# HELP prism_latency_seconds PRISM operation latency in seconds
# TYPE prism_latency_seconds histogram
prism_latency_seconds_sum{segment="strategic"} 1.8
prism_latency_seconds_count{segment="strategic"} 1
prism_latency_seconds_sum{segment="cycler"} 0.9
prism_latency_seconds_count{segment="cycler"} 1
prism_latency_seconds_sum{segment="codex"} 2.5
prism_latency_seconds_count{segment="codex"} 1

# HELP prism_cycler_interval_ms Current PRISM cycler interval in milliseconds
# TYPE prism_cycler_interval_ms gauge
prism_cycler_interval_ms 1000
`;

  beforeEach(async () => {
    // Mock du bus d'événements
    jest.spyOn(prismBus, 'emit');

    // Créer un serveur de métriques de test
    metricsServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(TEST_METRICS);
    });

    await new Promise(resolve => {
      metricsServer.listen(TEST_PORT, resolve);
    });

    // Initialiser l'analyseur
    analyzer = new PrismCodexAnalyzer();
    await analyzer.initialize();
  });

  afterEach(async () => {
    await new Promise(resolve => {
      metricsServer.close(resolve);
    });
    jest.restoreAllMocks();
  });

  it('should subscribe to Prometheus metrics and auto-tune parameters', async () => {
    // Configurer l'abonnement aux métriques
    await analyzer.subscribeExternalMetrics({
      url: `http://localhost:${TEST_PORT}/metrics`,
      interval: 100 // Intervalle court pour le test
    });

    // Attendre que le premier scraping soit effectué
    await new Promise(resolve => setTimeout(resolve, 200));

    // Vérifier que les ajustements ont été émis
    expect(prismBus.emit).toHaveBeenCalledWith(
      'prism:codex:thresholdsAdjusted',
      expect.objectContaining({
        adjustments: expect.arrayContaining([
          expect.objectContaining({
            type: 'aurora_threshold',
            value: expect.any(Number)
          }),
          expect.objectContaining({
            type: 'cycler_interval',
            value: expect.any(Number)
          })
        ])
      })
    );
  }, 10000);

  it('should handle metrics server errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Arrêter le serveur pour simuler une erreur
    await new Promise(resolve => {
      metricsServer.close(resolve);
    });

    // Configurer l'abonnement aux métriques
    await analyzer.subscribeExternalMetrics({
      url: `http://localhost:${TEST_PORT}/metrics`,
      interval: 100
    });

    // Attendre que la tentative de scraping échoue
    await new Promise(resolve => setTimeout(resolve, 200));

    // Vérifier que l'erreur a été gérée
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error scraping metrics:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  }, 10000);

  it('should parse Prometheus metrics correctly', () => {
    const metrics = analyzer._parsePrometheusMetrics(TEST_METRICS);

    expect(metrics).toEqual({
      efficiency: 55.5,
      latencies: {
        strategic: 1.8,
        cycler: 0.9,
        codex: 2.5
      },
      cyclerInterval: 1000
    });
  });

  it('should respect latency budgets when auto-tuning', async () => {
    const metrics = {
      efficiency: 70, // Au-dessus du seuil de 60%
      latencies: {
        strategic: 1.7, // 85% du budget de 2.0s
        cycler: 0.5, // 50% du budget de 1.0s
        codex: 2 // 66% du budget de 3.0s
      },
      cyclerInterval: 1000
    };

    await analyzer._autoTuneParameters(metrics);

    // Vérifier que seul l'intervalle strategic a été ajusté
    expect(prismBus.emit).toHaveBeenCalledWith(
      'prism:codex:thresholdsAdjusted',
      expect.objectContaining({
        adjustments: [
          expect.objectContaining({
            type: 'cycler_interval',
            value: 1200 // 1000ms * 1.2
          })
        ]
      })
    );
  });
}); 
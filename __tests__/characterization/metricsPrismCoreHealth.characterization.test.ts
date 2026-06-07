/**
 * Characterization test for MetricsPrismCore._updateSystemHealth().
 *
 * Captures the EXACT current score -> status mapping (including the strict `>`
 * boundaries at 80 and 50) before the Sonar nested-conditional refactor of the
 * ternary at MetricsPrismCore.js. The test exercises the public-ish private
 * method end-to-end (driving metric gauges + errorRate), so it is independent
 * of any helper introduced by the refactor. Must stay green before AND after.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsPrismCore } from '../../src/core/MetricsPrismCore.js';

function setGauge(core: any, name: string, value: number) {
  core.metrics.gauges.set(name, { name, value });
}

describe('MetricsPrismCore._updateSystemHealth - characterization', () => {
  let core: any;

  beforeEach(() => {
    core = new MetricsPrismCore();
  });

  it('aucune anomalie => score 100, status healthy', async () => {
    setGauge(core, 'cpu_usage_percent', 10);
    setGauge(core, 'memory_usage_percent', 10);
    core.systemHealth.errorRate = 0;

    await core._updateSystemHealth();

    expect(core.systemHealth.score).toBe(100);
    expect(core.systemHealth.status).toBe('healthy');
    expect(core.systemHealth.criticalIssues).toEqual([]);
  });

  it('CPU élevé seul => score 80 (frontière), status degraded (80 non > 80)', async () => {
    setGauge(core, 'cpu_usage_percent', 95);
    setGauge(core, 'memory_usage_percent', 10);
    core.systemHealth.errorRate = 0;

    await core._updateSystemHealth();

    expect(core.systemHealth.score).toBe(80);
    expect(core.systemHealth.status).toBe('degraded');
    expect(core.systemHealth.criticalIssues).toEqual(['High CPU usage']);
  });

  it('error rate élevé seul => score 70, status degraded', async () => {
    setGauge(core, 'cpu_usage_percent', 10);
    setGauge(core, 'memory_usage_percent', 10);
    core.systemHealth.errorRate = 0.5;

    await core._updateSystemHealth();

    expect(core.systemHealth.score).toBe(70);
    expect(core.systemHealth.status).toBe('degraded');
    expect(core.systemHealth.criticalIssues).toEqual(['High error rate']);
  });

  it('CPU + mémoire élevés => score 60, status degraded (> 50)', async () => {
    setGauge(core, 'cpu_usage_percent', 95);
    setGauge(core, 'memory_usage_percent', 95);
    core.systemHealth.errorRate = 0;

    await core._updateSystemHealth();

    expect(core.systemHealth.score).toBe(60);
    expect(core.systemHealth.status).toBe('degraded');
    expect(core.systemHealth.criticalIssues).toEqual([
      'High CPU usage',
      'High memory usage',
    ]);
  });

  it('CPU + mémoire + error rate => score 30, status critical (50 non > 50)', async () => {
    setGauge(core, 'cpu_usage_percent', 95);
    setGauge(core, 'memory_usage_percent', 95);
    core.systemHealth.errorRate = 0.5;

    await core._updateSystemHealth();

    expect(core.systemHealth.score).toBe(30);
    expect(core.systemHealth.status).toBe('critical');
    expect(core.systemHealth.criticalIssues).toEqual([
      'High CPU usage',
      'High memory usage',
      'High error rate',
    ]);
  });
});

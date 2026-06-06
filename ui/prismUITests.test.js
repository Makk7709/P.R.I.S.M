import { jest } from '@jest/globals';
import { PrismUITestRunner } from './prismUITests.js';
import { PrismUI } from './prismUI.js';
import { config } from '../config.js';

// Mock dependencies
jest.mock('../utils/prismCompression.js', () => ({
  PrismCompression: jest.fn().mockImplementation(() => ({
    optimize: jest.fn().mockImplementation(data => ({
      data: data.slice(-1000),
      compressionRatio: data.length > 1000 ? data.length / 1000 : 1
    }))
  }))
}));

jest.mock('../utils/prismPurgeScheduler.js', () => ({
  PrismPurgeScheduler: jest.fn().mockImplementation(() => ({
    activateStrategy: jest.fn().mockImplementation((name, config) => {
      if (config.callback) {
        config.callback();
      }
      return Promise.resolve(true);
    }),
    deactivateStrategy: jest.fn(),
    getStrategy: jest.fn()
  }))
}));

describe('PRISM UI Tests', () => {
  let testRunner;
  let _ui;

  beforeEach(() => {
    testRunner = new PrismUITestRunner();
    _ui = new PrismUI(config.CONFIG.UI);
  });

  afterEach(() => {
    // Cleanup
    document.body.innerHTML = '';
  });

  test('Compression Historique', async () => {
    const result = await testRunner.testCompressionHistorique();
    expect(result.success).toBe(true);
    expect(result.alertCount).toBeLessThan(1200);
  });

  test('Purge Automatique', async () => {
    const result = await testRunner.testPurgeAutomatique();
    expect(result.success).toBe(true);
    expect(result.oldAlertsRemoved).toBe(true);
  });

  test('Tooltips Dynamiques', async () => {
    const result = await testRunner.testTooltipsDynamiques();
    expect(result.success).toBe(true);
    expect(result.details.every(t => t.working)).toBe(true);
  });

  test('Filtrage d\'Événements', async () => {
    const result = await testRunner.testFiltrageEvenements();
    expect(result.success).toBe(true);
    expect(result.filters.type).toBe(true);
    expect(result.filters.module).toBe(true);
    expect(result.filters.efficiency).toBe(true);
  });

  test('Monitoring de Performance', async () => {
    const result = await testRunner.testMonitoringPerformance();
    expect(result.success).toBe(true);
    expect(result.metrics.cpu.stable).toBe(true);
    expect(result.metrics.memory.stable).toBe(true);
    expect(result.metrics.fps.stable).toBe(true);
  });

  test('Alerte Seuils Critiques', async () => {
    const result = await testRunner.testAlerteSeuilsCritiques();
    expect(result.success).toBe(true);
    expect(result.alerts.cpu.working).toBe(true);
    expect(result.alerts.memory.working).toBe(true);
    expect(result.alerts.fps.working).toBe(true);
  });

  it('should initialize correctly', () => {
    // ... existing code ...
  });
}); 
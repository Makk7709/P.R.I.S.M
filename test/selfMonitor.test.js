import { SelfMonitor } from '../infrastructure/selfMonitor.js';

describe('SelfMonitor', () => {
  let selfMonitor;

  beforeEach(() => {
    selfMonitor = new SelfMonitor();
  });

  describe('Initialisation', () => {
    test('devrait être défini', () => {
      expect(selfMonitor).toBeDefined();
    });
  });

  describe('Surveillance des Ressources', () => {
    test('devrait surveiller la mémoire', () => {
      const memoryStats = selfMonitor.checkMemoryUsage();
      expect(memoryStats).toBeDefined();
      expect(memoryStats.total).toBeGreaterThan(0);
      expect(memoryStats.used).toBeGreaterThan(0);
    });

    test('devrait surveiller le CPU', () => {
      const cpuStats = selfMonitor.checkCPUUsage();
      expect(cpuStats).toBeDefined();
      expect(cpuStats.percentage).toBeGreaterThanOrEqual(0);
      expect(cpuStats.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('Gestion des Alertes', () => {
    test('devrait détecter les seuils critiques', () => {
      const alert = selfMonitor.checkResourceThresholds({
        memory: 90,
        cpu: 95
      });
      expect(alert.isCritical).toBe(true);
    });

    test('devrait gérer les seuils normaux', () => {
      const alert = selfMonitor.checkResourceThresholds({
        memory: 50,
        cpu: 60
      });
      expect(alert.isCritical).toBe(false);
    });
  });
}); 
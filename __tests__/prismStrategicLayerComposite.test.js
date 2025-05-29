/**
 * @fileoverview Tests pour la V2 des directives composites de PrismStrategicLayer
 */

import PrismStrategicLayer from '../regulation/prismStrategicLayer.js';
import kernelBus from '../core/KernelBus.js';

describe('PrismStrategicLayer V2 - Directives Composites', () => {
  let strategicLayer;
  let mockRisks;

  beforeEach(() => {
    strategicLayer = new PrismStrategicLayer();
    mockRisks = [
      { type: 'stability', severity: 0.9, description: 'Critical stability issue' },
      { type: 'performance', severity: 0.8, description: 'Performance degradation' },
      { type: 'memory', severity: 0.7, description: 'High memory usage' },
      { type: 'network', severity: 0.6, description: 'Network latency' }
    ];
  });

  test('should generate composite directives with correct structure', async () => {
    const composite = await strategicLayer.generateCompositeDirectives(mockRisks);
    
    expect(composite).toBeDefined();
    expect(composite.directives).toHaveLength(3);
    expect(composite.timestamp).toBeDefined();
    expect(composite.cooldownApplied).toBe(true);
  });

  test('should prioritize directives by severity', async () => {
    const composite = await strategicLayer.generateCompositeDirectives(mockRisks);
    
    expect(composite.directives[0].priority).toBe(1);
    expect(composite.directives[0].directive).toContain('stability');
    expect(composite.directives[1].priority).toBe(2);
    expect(composite.directives[2].priority).toBe(3);
  });

  test('should resolve conflicts between directives', async () => {
    const conflictingRisks = [
      { type: 'awareness', severity: 0.9, description: 'High awareness needed' },
      { type: 'recalibration', severity: 0.8, description: 'Recalibration needed' }
    ];

    const composite = await strategicLayer.generateCompositeDirectives(conflictingRisks);
    
    // Vérifier qu'une seule directive est émise pour le même module
    const moduleDirectives = new Set(composite.directives.map(d => d.directive.split('_')[0]));
    expect(moduleDirectives.size).toBe(1);
  });

  test('should respect cooldown period', async () => {
    // Première émission
    await strategicLayer.generateCompositeDirectives(mockRisks);
    
    // Deuxième émission immédiate
    const secondComposite = await strategicLayer.generateCompositeDirectives(mockRisks);
    expect(secondComposite).toBeNull();
  });

  test('should detect similar directives', async () => {
    // Première émission
    const firstComposite = await strategicLayer.generateCompositeDirectives(mockRisks);
    
    // Simuler le passage du temps
    jest.advanceTimersByTime(1000);
    
    // Deuxième émission avec directives similaires
    const secondComposite = await strategicLayer.generateCompositeDirectives(mockRisks);
    expect(secondComposite).toBeNull();
  });

  test('should emit correct event format', async () => {
    const eventSpy = jest.spyOn(prismBus, 'emit');
    
    await strategicLayer.generateCompositeDirectives(mockRisks);
    
    expect(eventSpy).toHaveBeenCalledWith('prism:strategy:compositeIssued', expect.objectContaining({
      directives: expect.arrayContaining([
        expect.objectContaining({
          directive: expect.any(String),
          priority: expect.any(Number),
          confidence: expect.any(Number)
        })
      ]),
      timestamp: expect.any(Number),
      cooldownApplied: expect.any(Boolean)
    }));
  });

  test('should handle empty risk array', async () => {
    const composite = await strategicLayer.generateCompositeDirectives([]);
    expect(composite).toBeNull();
  });

  test('should maintain performance requirements', async () => {
    const startTime = performance.now();
    
    // Générer 1000 risques
    const largeRiskSet = Array(1000).fill().map((_, i) => ({
      type: `risk_${i}`,
      severity: Math.random(),
      description: `Risk ${i}`
    }));
    
    await strategicLayer.generateCompositeDirectives(largeRiskSet);
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(300);
  });
}); 
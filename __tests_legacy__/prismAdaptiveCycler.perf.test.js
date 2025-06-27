/**
 * @fileoverview Tests de performance pour PrismAdaptiveCycler
 */

import { PrismAdaptiveCycler } from '../regulation/prismAdaptiveCycler.js';
import { jest } from '@jest/globals';

describe('PrismAdaptiveCycler Performance Tests', () => {
  let cycler;

  beforeEach(() => {
    cycler = new PrismAdaptiveCycler();
  });

  test('should handle 50,000 outcomes in less than 140ms', () => {
    const startTime = performance.now();
    
    // Simuler 50,000 outcomes
    for (let i = 0; i < 50000; i++) {
      cycler.handleDirectiveOutcome({ success: Math.random() > 0.5 });
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`Performance test duration: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(140);
  });

  test('should maintain O(1) complexity for push operations', () => {
    const measurements = [];
    const sampleSizes = [1000, 2000, 4000, 8000, 16000];
    
    for (const size of sampleSizes) {
      const startTime = performance.now();
      
      for (let i = 0; i < size; i++) {
        cycler.handleDirectiveOutcome({ success: Math.random() > 0.5 });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      measurements.push(duration / size);
    }
    
    // Vérifier que le temps par opération reste constant
    const maxDeviation = Math.max(...measurements) / Math.min(...measurements);
    expect(maxDeviation).toBeLessThan(2); // Max 2x variation
  });

  test('should maintain correct efficiency calculation under load', () => {
    // Remplir la fenêtre glissante
    for (let i = 0; i < 200; i++) {
      cycler.handleDirectiveOutcome({ success: true });
    }
    
    const initialEfficiency = cycler.getCurrentEfficiency();
    expect(initialEfficiency).toBe(1);
    
    // Ajouter 1000 outcomes supplémentaires
    for (let i = 0; i < 1000; i++) {
      cycler.handleDirectiveOutcome({ success: Math.random() > 0.5 });
    }
    
    const finalEfficiency = cycler.getCurrentEfficiency();
    expect(finalEfficiency).toBeGreaterThanOrEqual(0);
    expect(finalEfficiency).toBeLessThanOrEqual(1);
  });
}); 
/**
 * @fileoverview Tests pour le module PrismCodexAnalyzer
 */

import { PrismCodexAnalyzer } from '../prismCodexAnalyzer.js';
import kernelBus from '../core/KernelBus.js';

describe('PrismCodexAnalyzer', () => {
  let analyzer;
  let mockEmit;

  beforeEach(() => {
    analyzer = new PrismCodexAnalyzer();
    analyzer.isActive = true;
    
    // Mock pour prismBus.emit
    mockEmit = jest.spyOn(prismBus, 'emit');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default values', () => {
    expect(analyzer.confidenceHistory).toBeInstanceOf(Map);
    expect(analyzer.quarterlyReports).toEqual([]);
    expect(analyzer.isActive).toBe(true);
  });

  test('should handle successful directive outcome', async () => {
    const outcome = {
      directive: 'boost_dynamism',
      module: 'SovereignCycle',
      result: 'success',
      timestamp: Date.now()
    };

    await analyzer.handleDirectiveOutcome(outcome);

    const key = 'SovereignCycle:boost_dynamism';
    expect(analyzer.confidenceHistory.get(key)).toBe(0.55); // 0.5 + 0.05
    expect(mockEmit).toHaveBeenCalledWith('prism:codex:confidenceUpdated', expect.any(Object));
  });

  test('should handle failed directive outcome', async () => {
    const outcome = {
      directive: 'boost_dynamism',
      module: 'SovereignCycle',
      result: 'failure',
      timestamp: Date.now()
    };

    await analyzer.handleDirectiveOutcome(outcome);

    const key = 'SovereignCycle:boost_dynamism';
    expect(analyzer.confidenceHistory.get(key)).toBe(0.4); // 0.5 - 0.1
    expect(mockEmit).toHaveBeenCalledWith('prism:codex:confidenceUpdated', expect.any(Object));
  });

  test('should maintain confidence within bounds', async () => {
    const key = 'SovereignCycle:boost_dynamism';
    
    // Test upper bound
    analyzer.confidenceHistory.set(key, 0.98);
    await analyzer.handleDirectiveOutcome({
      directive: 'boost_dynamism',
      module: 'SovereignCycle',
      result: 'success',
      timestamp: Date.now()
    });
    expect(analyzer.confidenceHistory.get(key)).toBe(1);

    // Test lower bound
    analyzer.confidenceHistory.set(key, 0.05);
    await analyzer.handleDirectiveOutcome({
      directive: 'boost_dynamism',
      module: 'SovereignCycle',
      result: 'failure',
      timestamp: Date.now()
    });
    expect(analyzer.confidenceHistory.get(key)).toBe(0);
  });

  test('should update quarterly report', async () => {
    const outcome = {
      directive: 'boost_dynamism',
      module: 'SovereignCycle',
      result: 'success',
      confidence: 0.55,
      timestamp: Date.now()
    };

    await analyzer.handleDirectiveOutcome(outcome);

    const currentQuarter = analyzer.getCurrentQuarter();
    const report = analyzer.quarterlyReports.find(r => r.quarter === currentQuarter);
    
    expect(report).toBeDefined();
    expect(report.data).toHaveLength(1);
    expect(report.data[0]).toEqual(outcome);
  });

  test('should generate quarterly report', async () => {
    // Ajouter des données pour le trimestre actuel
    const currentQuarter = analyzer.getCurrentQuarter();
    analyzer.quarterlyReports.push({
      quarter: currentQuarter,
      data: [
        { directive: 'boost_dynamism', module: 'SovereignCycle', result: 'success', confidence: 0.55 },
        { directive: 'change_mode', module: 'ElysiumMode', result: 'failure', confidence: 0.4 }
      ]
    });

    analyzer.generateQuarterlyReport();

    expect(mockEmit).toHaveBeenCalledWith('prism:codex:quarterlyReport', expect.objectContaining({
      quarter: currentQuarter,
      totalDirectives: 2,
      successRate: 0.5,
      averageConfidence: 0.475
    }));
  });

  test('should calculate success rate correctly', () => {
    const data = [
      { result: 'success' },
      { result: 'success' },
      { result: 'failure' }
    ];

    const successRate = analyzer.calculateSuccessRate(data);
    expect(successRate).toBe(2/3);
  });

  test('should calculate average confidence correctly', () => {
    const data = [
      { confidence: 0.5 },
      { confidence: 0.7 },
      { confidence: 0.3 }
    ];

    const averageConfidence = analyzer.calculateAverageConfidence(data);
    expect(averageConfidence).toBe(0.5);
  });

  test('should analyze module performance correctly', () => {
    const data = [
      { module: 'SovereignCycle', result: 'success', confidence: 0.6 },
      { module: 'SovereignCycle', result: 'failure', confidence: 0.4 },
      { module: 'ElysiumMode', result: 'success', confidence: 0.8 }
    ];

    const performance = analyzer.analyzeModulePerformance(data);
    
    expect(performance.SovereignCycle).toEqual({
      total: 2,
      successes: 1,
      averageConfidence: 0.5
    });
    
    expect(performance.ElysiumMode).toEqual({
      total: 1,
      successes: 1,
      averageConfidence: 0.8
    });
  });
}); 
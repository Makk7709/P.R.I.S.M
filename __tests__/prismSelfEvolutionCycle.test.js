import { jest } from '@jest/globals';

// Mock des modules
jest.mock('../backend/selfOptimizer.js', () => ({
  generateSelfInstruction: jest.fn()
}));

jest.mock('../backend/decisionFirewall.js', () => ({
  evaluateSuggestion: jest.fn()
}));

jest.mock('../backend/selfApplicationEngine.js', () => ({
  executeSelfOptimizationCycle: jest.fn()
}));

jest.mock('../backend/memoryAnalyzer.js', () => ({
  analyzeMemoryPerformance: jest.fn()
}));

jest.mock('../backend/database.js', () => ({
  saveMemorySnapshot: jest.fn(),
  fetchLatestSnapshots: jest.fn()
}));

// Import des modules mockés
import { launchEvolutionCycle } from '../backend/launchSelfEvolutionCycle.js';
import { generateSelfInstruction } from '../backend/selfOptimizer.js';
import { evaluateSuggestion } from '../backend/decisionFirewall.js';
import { executeSelfOptimizationCycle } from '../backend/selfApplicationEngine.js';
import { analyzeMemoryPerformance } from '../backend/memoryAnalyzer.js';
import { saveMemorySnapshot, fetchLatestSnapshots } from '../backend/database.js';

describe('PRISM Self Evolution Cycle', () => {
  beforeEach(() => {
    // Reset des mocks avant chaque test
    jest.clearAllMocks();
    
    // Configuration des mocks par défaut
    generateSelfInstruction.mockResolvedValue({
      type: 'optimization',
      description: 'Test optimization suggestion',
      priority: 'high'
    });

    evaluateSuggestion.mockResolvedValue({
      approved: true,
      score: 0.85,
      feedback: 'Suggestion validée'
    });

    executeSelfOptimizationCycle.mockResolvedValue({
      success: true,
      changes: ['Test change 1', 'Test change 2']
    });

    analyzeMemoryPerformance.mockResolvedValue({
      performance: 0.92,
      metrics: {
        responseTime: 150,
        accuracy: 0.95
      }
    });

    saveMemorySnapshot.mockResolvedValue({
      id: 'test-snapshot-1',
      timestamp: new Date().toISOString()
    });

    fetchLatestSnapshots.mockResolvedValue([
      {
        id: 'test-snapshot-1',
        timestamp: new Date().toISOString(),
        suggestion: {
          type: 'optimization',
          description: 'Test optimization suggestion'
        }
      }
    ]);
  });

  test('should complete full evolution cycle successfully', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    await launchEvolutionCycle();

    // Vérification des appels
    expect(generateSelfInstruction).toHaveBeenCalled();
    expect(evaluateSuggestion).toHaveBeenCalled();
    expect(executeSelfOptimizationCycle).toHaveBeenCalled();
    expect(saveMemorySnapshot).toHaveBeenCalled();
    expect(analyzeMemoryPerformance).toHaveBeenCalledWith(30);
    expect(fetchLatestSnapshots).toHaveBeenCalledWith(5);

    // Vérification des logs
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Début du Cycle Auto-Évolution'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cycle Auto-Évolution terminé avec succès'));
  });

  test('should handle rejected suggestions', async () => {
    evaluateSuggestion.mockResolvedValue({
      approved: false,
      score: 0.3,
      feedback: 'Suggestion rejetée'
    });

    const consoleSpy = jest.spyOn(console, 'log');
    
    await launchEvolutionCycle();

    expect(generateSelfInstruction).toHaveBeenCalled();
    expect(evaluateSuggestion).toHaveBeenCalled();
    expect(executeSelfOptimizationCycle).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Suggestion rejetée par le Decision Firewall'));
  });

  test('should handle errors gracefully', async () => {
    generateSelfInstruction.mockRejectedValue(new Error('Test error'));

    const consoleSpy = jest.spyOn(console, 'error');
    
    await launchEvolutionCycle();

    // Vérification que le message d'erreur a été loggé
    expect(consoleSpy.mock.calls[0].join(' ')).toContain('Erreur durant le cycle');
    
    expect(saveMemorySnapshot).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(String),
      timestamp: expect.any(String)
    }));
  });

  test('should save memory snapshot with correct data', async () => {
    const testSuggestion = {
      type: 'optimization',
      description: 'Test optimization suggestion',
      priority: 'high'
    };

    generateSelfInstruction.mockResolvedValue(testSuggestion);

    await launchEvolutionCycle();

    expect(saveMemorySnapshot).toHaveBeenCalledWith(expect.objectContaining({
      suggestion: testSuggestion,
      evaluation: expect.any(Object),
      timestamp: expect.any(String)
    }));
  });
}); 
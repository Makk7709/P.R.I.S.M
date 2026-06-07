/**
 * @fileoverview Tests pour le module PrismStrategyExecutor
 */


describe('PrismStrategyExecutor', () => {
  let executor;
  let mockSovereignCycle;
  let mockElysiumMode;
  let mockSelfHeal;

  beforeEach(() => {
    // Créer des mocks pour les exécuteurs
    mockSovereignCycle = {
      constructor: { name: 'SovereignCycle' },
      adjustCycle: jest.fn().mockResolvedValue({ success: true }),
      forceRecalibration: jest.fn().mockResolvedValue({ success: true })
    };

    mockElysiumMode = {
      constructor: { name: 'ElysiumMode' },
      changeMode: jest.fn().mockResolvedValue({ success: true }),
      adjustParameters: jest.fn().mockResolvedValue({ success: true })
    };

    mockSelfHeal = {
      constructor: { name: 'SelfHeal' },
      attemptRecovery: jest.fn().mockResolvedValue({ success: true }),
      analyzeIssue: jest.fn().mockResolvedValue({ success: true })
    };

    // Créer l'instance du StrategyExecutor
    executor = new PrismStrategyExecutor();
    executor.executors.set('SovereignCycle', mockSovereignCycle);
    executor.executors.set('ElysiumMode', mockElysiumMode);
    executor.executors.set('SelfHeal', mockSelfHeal);
    executor.isActive = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should handle valid directive for SovereignCycle', async () => {
    const directive = {
      directive: 'boost_dynamism',
      target: 'SovereignCycle',
      parameters: { multiplier: 1.5 }
    };

    await executor.handleDirective(directive);

    expect(mockSovereignCycle.adjustCycle).toHaveBeenCalledWith({ multiplier: 1.5 });
    expect(executor.executionHistory).toHaveLength(1);
  });

  test('should handle valid directive for ElysiumMode', async () => {
    const directive = {
      directive: 'change_mode',
      target: 'ElysiumMode',
      parameters: { mode: 'balanced' }
    };

    await executor.handleDirective(directive);

    expect(mockElysiumMode.changeMode).toHaveBeenCalledWith({ mode: 'balanced' });
    expect(executor.executionHistory).toHaveLength(1);
  });

  test('should handle valid directive for SelfHeal', async () => {
    const directive = {
      directive: 'trigger_healing',
      target: 'SelfHeal',
      parameters: { type: 'routine' }
    };

    await executor.handleDirective(directive);

    expect(mockSelfHeal.attemptRecovery).toHaveBeenCalledWith({ type: 'routine' });
    expect(executor.executionHistory).toHaveLength(1);
  });

  test('should handle unknown directive', async () => {
    const directive = {
      directive: 'unknown_directive',
      target: 'SovereignCycle',
      parameters: {}
    };

    await expect(executor.handleDirective(directive)).rejects.toThrow();
    expect(executor.executionHistory).toHaveLength(0);
  });

  test('should handle unknown target', async () => {
    const directive = {
      directive: 'boost_dynamism',
      target: 'UnknownModule',
      parameters: {}
    };

    await executor.handleDirective(directive);
    expect(executor.executionHistory).toHaveLength(0);
  });

  test('should maintain execution history within max length', async () => {
    const directive = {
      directive: 'boost_dynamism',
      target: 'SovereignCycle',
      parameters: {}
    };

    // Exécuter plus de directives que la limite d'historique
    for (let i = 0; i < executor.maxHistoryLength + 10; i++) {
      await executor.handleDirective(directive);
    }

    expect(executor.executionHistory).toHaveLength(executor.maxHistoryLength);
  });

  test('should measure execution time', async () => {
    const directive = {
      directive: 'boost_dynamism',
      target: 'SovereignCycle',
      parameters: {}
    };

    await executor.handleDirective(directive);

    const execution = executor.executionHistory[0];
    expect(execution).toHaveProperty('executionTime');
    expect(typeof execution.executionTime).toBe('number');
  });
}); 
import { PrismBehavioralLearner } from '../monitoring/prismBehavioralLearner.js';
import kernelBus from '../core/KernelBus.js';

jest.mock('../prismBus.js', () => ({
  prismBus: {
    subscribe: jest.fn(),
    emit: jest.fn()
  }
}));

describe('PrismBehavioralLearner', () => {
  let learner;

  beforeEach(() => {
    jest.useFakeTimers();
    learner = new PrismBehavioralLearner();
  });

  afterEach(() => {
    jest.useRealTimers();
    learner.destroy();
    jest.clearAllMocks();
  });

  test('should initialize and subscribe to stress reports', () => {
    expect(prismBus.subscribe).toHaveBeenCalledWith(
      'prism:analytics:postStressReport',
      expect.any(Function)
    );
  });

  test('should process stress report and generate recommendations', () => {
    const mockReport = {
      modules: [
        { name: 'module1', status: 'failed' },
        { name: 'module1', status: 'failed' },
        { name: 'module1', status: 'failed' },
        { name: 'module2', status: 'ok' }
      ],
      reactions: [
        { delay: 15 },
        { delay: 12 },
        { delay: 8 }
      ],
      errors: [
        { type: 'energy_instability', frequency: 4, severity: 'high' },
        { type: 'heartbeat_loss', frequency: 2, severity: 'medium' }
      ]
    };

    // Simuler l'émission d'un rapport de stress
    const subscribeCallback = prismBus.subscribe.mock.calls[0][1];
    subscribeCallback(mockReport);

    // Vérifier que les recommandations ont été générées
    const adjustments = learner.getActiveAdjustments();
    expect(adjustments.size).toBeGreaterThan(0);

    // Vérifier les recommandations spécifiques
    expect(adjustments.get('module1')).toBeDefined();
    expect(adjustments.get('vital_signs')).toBeDefined();
    expect(adjustments.get('energy_instability')).toBeDefined();

    // Vérifier que l'événement d'ajustements a été émis
    expect(prismBus.emit).toHaveBeenCalledWith(
      'prism:learning:adjustmentsMade',
      expect.objectContaining({
        timestamp: expect.any(Number),
        adjustments: expect.arrayContaining([
          expect.objectContaining({
            type: 'module_vigilance',
            action: 'decrease_threshold',
            value: 0.05
          })
        ])
      })
    );
  });

  test('should cleanup expired adjustments', () => {
    const mockReport = {
      modules: [{ name: 'module1', status: 'failed' }],
      reactions: [{ delay: 15 }],
      errors: []
    };

    // Simuler l'émission d'un rapport et appliquer des ajustements
    const subscribeCallback = prismBus.subscribe.mock.calls[0][1];
    subscribeCallback(mockReport);

    // Vérifier qu'il y a des ajustements actifs
    expect(learner.getActiveAdjustments().size).toBeGreaterThan(0);

    // Simuler le passage du temps
    jest.advanceTimersByTime(301000); // 5 minutes + 1 seconde

    // Vérifier que les ajustements ont été nettoyés
    const adjustments = learner.getActiveAdjustments();
    expect(adjustments.size).toBe(0);

    // Vérifier que l'événement d'expiration a été émis
    expect(prismBus.emit).toHaveBeenCalledWith(
      'prism:learning:adjustmentsExpired',
      expect.objectContaining({
        timestamp: expect.any(Number),
        remainingAdjustments: []
      })
    );
  });

  test('should perform periodic cleanup', () => {
    const mockReport = {
      modules: [{ name: 'module1', status: 'failed' }],
      reactions: [{ delay: 15 }],
      errors: []
    };

    // Simuler l'émission d'un rapport et appliquer des ajustements
    const subscribeCallback = prismBus.subscribe.mock.calls[0][1];
    subscribeCallback(mockReport);

    // Vérifier qu'il y a des ajustements actifs
    expect(learner.getActiveAdjustments().size).toBeGreaterThan(0);

    // Simuler plusieurs intervalles de nettoyage
    for (let i = 0; i < 6; i++) {
      jest.advanceTimersByTime(60000); // 1 minute
    }

    // Vérifier que les ajustements ont été nettoyés après 6 minutes
    const adjustments = learner.getActiveAdjustments();
    expect(adjustments.size).toBe(0);
  });
}); 
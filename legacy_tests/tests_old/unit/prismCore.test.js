/**
 * @jest-environment jsdom
 */

const PRISM = require('../../prismCore.js');
const { PrismBus } = require('../../prismBus.js');
const { PrismVitals } = require('../../prismVitals.js');
const { PrismSelfHeal } = require('../../prismSelfHeal.js');
const { PrismEmergencyProtocol } = require('../../prismEmergencyProtocol.js');

describe('PRISM Core', () => {
  let bus;
  let vitals;
  let selfHeal;
  let emergency;

  beforeEach(() => {
    // Mock des dépendances
    bus = new PrismBus();
    vitals = new PrismVitals();
    selfHeal = new PrismSelfHeal();
    emergency = new PrismEmergencyProtocol();

    // Spy sur les méthodes
    jest.spyOn(bus, 'emit');
    jest.spyOn(vitals, 'startMonitoring');
    jest.spyOn(selfHeal, 'initializeSelfHeal');
    jest.spyOn(emergency, 'initialize');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize all core modules', async () => {
      await PRISM.activatePRISM();

      expect(vitals.startMonitoring).toHaveBeenCalled();
      expect(selfHeal.initializeSelfHeal).toHaveBeenCalled();
      expect(emergency.initialize).toHaveBeenCalled();
    });

    it('should emit initialization events', async () => {
      await PRISM.activatePRISM();

      expect(bus.emit).toHaveBeenCalledWith('prism:core:initialized', expect.any(Object));
    });

    it('should handle initialization errors gracefully', async () => {
      const error = new Error('Initialization failed');
      vitals.startMonitoring.mockRejectedValue(error);

      await expect(PRISM.activatePRISM()).rejects.toThrow('Initialization failed');
    });
  });

  describe('State Management', () => {
    beforeEach(async () => {
      await PRISM.activatePRISM();
    });

    it('should maintain system state', () => {
      expect(PRISM.getStatus()).toEqual(expect.objectContaining({
        isInitialized: true,
        isActive: true
      }));
    });

    it('should track module states', () => {
      const status = PRISM.getStatus();
      expect(status.modules).toContain('vitals');
      expect(status.modules).toContain('selfheal');
      expect(status.modules).toContain('emergency');
    });

    it('should handle state transitions', async () => {
      await PRISM.reset();
      expect(PRISM.getStatus().isActive).toBe(false);

      await PRISM.activatePRISM();
      expect(PRISM.getStatus().isActive).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle and recover from module errors', async () => {
      const error = new Error('Module error');
      vitals.startMonitoring.mockRejectedValue(error);

      await PRISM.activatePRISM();
      expect(selfHeal.initializeSelfHeal).toHaveBeenCalled();
      expect(bus.emit).toHaveBeenCalledWith('prism:error', expect.any(Object));
    });

    it('should trigger emergency protocol on critical errors', async () => {
      const criticalError = new Error('Critical error');
      criticalError.severity = 'critical';

      await expect(PRISM.handleError(criticalError)).rejects.toThrow('PRISM critical failure');
      expect(emergency.triggerEmergency).toHaveBeenCalled();
    });

    it('should log and report errors', async () => {
      const error = new Error('Test error');
      const spy = jest.spyOn(console, 'error');

      await PRISM.handleError(error);
      expect(spy).toHaveBeenCalled();
      expect(bus.emit).toHaveBeenCalledWith('prism:error', expect.objectContaining({
        error,
        count: expect.any(Number)
      }));
    });
  });

  describe('Performance Monitoring', () => {
    it('should track system metrics', async () => {
      await PRISM.activatePRISM();
      const status = PRISM.getStatus();

      expect(status).toHaveProperty('errorCount');
      expect(status).toHaveProperty('pulseCounters');
    });

    it('should detect performance degradation', async () => {
      const spy = jest.spyOn(selfHeal, 'handlePerformanceDegradation');
      
      // Simuler une dégradation des performances
      await PRISM.handleError(new Error('Performance degradation'));
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Module Communication', () => {
    it('should route events between modules', async () => {
      const testEvent = { type: 'test', data: { value: 42 } };
      await PRISM.activatePRISM();

      expect(bus.emit).toHaveBeenCalledWith(
        'prism:event:routed',
        expect.objectContaining(testEvent)
      );
    });

    it('should handle module communication errors', async () => {
      const error = new Error('Communication error');
      bus.emit.mockRejectedValue(error);

      await expect(PRISM.activatePRISM())
        .rejects.toThrow('Communication error');
    });
  });

  describe('System Recovery', () => {
    it('should attempt recovery on system failure', async () => {
      const spy = jest.spyOn(selfHeal, 'attemptRecovery');
      await PRISM.handleError(new Error('System failure'));

      expect(spy).toHaveBeenCalled();
    });

    it('should restore from last known good state', async () => {
      await PRISM.reset();
      await PRISM.activatePRISM();

      expect(PRISM.getStatus().isActive).toBe(true);
      expect(bus.emit).toHaveBeenCalledWith('prism:state:restored', expect.any(Object));
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on shutdown', async () => {
      await PRISM.activatePRISM();
      await PRISM.reset();

      expect(PRISM.getStatus().isActive).toBe(false);
      expect(bus.emit).toHaveBeenCalledWith('prism:core:shutdown', expect.any(Object));
    });

    it('should handle resource leaks', async () => {
      const spy = jest.spyOn(console, 'error');
      await PRISM.handleError(new Error('Resource leak'));

      expect(spy).toHaveBeenCalled();
    });
  });
}); 
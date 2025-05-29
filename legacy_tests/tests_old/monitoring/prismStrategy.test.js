import { jest } from '@jest/globals';
import PrismStrategy from '../../monitoring/prismStrategy.js';
import kernelBus from '../../core/KernelBus.js';

describe('PrismStrategy', () => {
  let strategy;
  let mockEmit;

  beforeEach(() => {
    mockEmit = jest.fn();
    kernelBus.emit = mockEmit;
    strategy = new PrismStrategy();
  });

  describe('synthesizeSignals', () => {
    it('should synthesize signals and emit context event', () => {
      const emotionHistory = [
        { emotion: 'happy', intensity: 0.8 },
        { emotion: 'calm', intensity: 0.6 }
      ];
      const adaptationHistory = [
        { score: 0.7 },
        { score: 0.8 }
      ];
      const regulationHistory = [
        { anomalyScore: 0.2 },
        { anomalyScore: 0.3 }
      ];

      const context = strategy.synthesizeSignals(
        emotionHistory,
        adaptationHistory,
        regulationHistory
      );

      expect(context).toHaveProperty('emotionalTrend');
      expect(context).toHaveProperty('adaptationScore');
      expect(context).toHaveProperty('regulationAnomalies');
      expect(context).toHaveProperty('timestamp');
      expect(mockEmit).toHaveBeenCalledWith('prism:strategy:contextSynthesized', expect.any(Object));
    });

    it('should throw error for invalid history inputs', () => {
      expect(() => strategy.synthesizeSignals(null, [], [])).toThrow();
      expect(() => strategy.synthesizeSignals([], null, [])).toThrow();
      expect(() => strategy.synthesizeSignals([], [], null)).toThrow();
      expect(() => strategy.synthesizeSignals([], [], [])).toThrow();
    });

    it('should trim history exceeding maximum length', () => {
      const longHistory = Array(600).fill({ emotion: 'happy', intensity: 0.8 });
      const shortHistory = [{ emotion: 'calm', intensity: 0.6 }];

      strategy.synthesizeSignals(longHistory, shortHistory, shortHistory);

      expect(mockEmit).toHaveBeenCalledWith('prism:strategy:historyTrimmed', expect.any(Object));
    });
  });

  describe('internal calculations', () => {
    describe('_calculateStability', () => {
      it('should return 0 for empty history', () => {
        expect(strategy._calculateStability([])).toBe(0);
      });

      it('should calculate stability based on calm phases', () => {
        const history = [
          { emotion: 'calm', intensity: 0.6 },
          { emotion: 'happy', intensity: 0.8 },
          { emotion: 'neutral', intensity: 0.5 },
          { emotion: 'calm', intensity: 0.7 }
        ];
        expect(strategy._calculateStability(history)).toBe(0.75);
      });
    });

    describe('_calculateVolatility', () => {
      it('should return 0 for empty or single-item history', () => {
        expect(strategy._calculateVolatility([])).toBe(0);
        expect(strategy._calculateVolatility([{ emotion: 'happy' }])).toBe(0);
      });

      it('should calculate volatility based on emotion changes', () => {
        const history = [
          { emotion: 'happy', intensity: 0.8 },
          { emotion: 'sad', intensity: 0.6 },
          { emotion: 'happy', intensity: 0.7 },
          { emotion: 'calm', intensity: 0.5 }
        ];
        expect(strategy._calculateVolatility(history)).toBe(1);
      });
    });

    describe('_findDominantEmotion', () => {
      it('should return neutral for empty history', () => {
        expect(strategy._findDominantEmotion([])).toBe('neutral');
      });

      it('should find the most frequent emotion', () => {
        const history = [
          { emotion: 'happy', intensity: 0.8 },
          { emotion: 'happy', intensity: 0.7 },
          { emotion: 'sad', intensity: 0.6 },
          { emotion: 'happy', intensity: 0.9 }
        ];
        expect(strategy._findDominantEmotion(history)).toBe('happy');
      });
    });
  });

  describe('defineStrategy', () => {
    it('should return reset strategy when regulation anomalies are present', () => {
      const context = {
        emotionalTrend: { volatility: 0.5, stability: 0.6 },
        adaptationScore: 0.8,
        regulationAnomalies: [{ anomalyScore: 0.9 }]
      };

      const strategyType = strategy.defineStrategy(context);
      expect(strategyType).toBe('reset');
    });

    it('should return reinforcement strategy when conditions are optimal', () => {
      const context = {
        emotionalTrend: { volatility: 0.3, stability: 0.7 },
        adaptationScore: 0.8,
        regulationAnomalies: []
      };

      const strategyType = strategy.defineStrategy(context);
      expect(strategyType).toBe('reinforcement');
    });

    it('should return exploration strategy by default', () => {
      const context = {
        emotionalTrend: { volatility: 0.4, stability: 0.5 },
        adaptationScore: 0.6,
        regulationAnomalies: []
      };

      const strategyType = strategy.defineStrategy(context);
      expect(strategyType).toBe('exploration');
    });
  });

  describe('planActions', () => {
    it('should generate exploration plan and emit event', () => {
      const plan = strategy.planActions('exploration');

      expect(plan).toHaveLength(3);
      expect(plan[0].module).toBe('emotion');
      expect(plan[0].action).toBe('expandEmotionalRange');
      expect(mockEmit).toHaveBeenCalledWith('prism:strategy:planGenerated', expect.any(Object));
    });

    it('should generate reinforcement plan and emit event', () => {
      const plan = strategy.planActions('reinforcement');

      expect(plan).toHaveLength(3);
      expect(plan[0].module).toBe('emotion');
      expect(plan[0].action).toBe('stabilizeEmotionalState');
      expect(mockEmit).toHaveBeenCalledWith('prism:strategy:planGenerated', expect.any(Object));
    });

    it('should generate reset plan and emit event', () => {
      const plan = strategy.planActions('reset');

      expect(plan).toHaveLength(3);
      expect(plan[0].module).toBe('emotion');
      expect(plan[0].action).toBe('resetEmotionalState');
      expect(mockEmit).toHaveBeenCalledWith('prism:strategy:planGenerated', expect.any(Object));
    });
  });

  describe('performance', () => {
    it('should handle 500 entries in less than 1 second', () => {
      const largeHistory = Array(500).fill({ emotion: 'happy', intensity: 0.8 });
      const startTime = Date.now();
      
      strategy.synthesizeSignals(largeHistory, largeHistory, largeHistory);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
}); 
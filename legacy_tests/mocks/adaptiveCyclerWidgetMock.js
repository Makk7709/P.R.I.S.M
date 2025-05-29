export const createAdaptiveCyclerWidgetMock = () => {
  let metrics = {};
  let container = document.createElement('div');
  container.style.display = 'none';

  const mock = {
    container,
    get metrics() {
      return metrics;
    },
    handleDirectiveOutcome: jest.fn().mockImplementation((outcome) => {
      return Promise.resolve({
        success: true,
        ...outcome
      });
    }),
    updateMetrics: jest.fn().mockImplementation((newMetrics) => {
      metrics = { ...newMetrics };
      return Promise.resolve(metrics);
    }),
    playDirectiveAudio: jest.fn().mockResolvedValue(true),
    toggleVisibility: jest.fn().mockImplementation(() => {
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }),
    destroy: jest.fn()
  };

  return mock;
}; 
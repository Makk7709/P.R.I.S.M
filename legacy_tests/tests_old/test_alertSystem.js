const AlertSystem = require('../monitoring/alertSystem');
const axios = require('axios');

jest.mock('axios');
jest.mock('../evolution/logSummary');

describe('AlertSystem', () => {
  let alertSystem;
  const mockConfig = {
    webhookUrl: 'http://test-webhook.com',
    alertThreshold: 0.8,
    retryAttempts: 2,
    retryDelay: 100
  };

  beforeEach(() => {
    alertSystem = new AlertSystem(mockConfig);
    axios.post.mockClear();
  });

  test('should send alert successfully', async () => {
    axios.post.mockResolvedValueOnce({ status: 200 });
    
    const alert = {
      level: 'WARNING',
      message: 'Test alert',
      context: { test: true }
    };

    await alertSystem.sendAlert(alert);
    
    expect(axios.post).toHaveBeenCalledWith(
      mockConfig.webhookUrl,
      expect.objectContaining({
        level: 'WARNING',
        message: 'Test alert'
      })
    );
  });

  test('should retry on failure', async () => {
    axios.post
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ status: 200 });
    
    const alert = {
      level: 'WARNING',
      message: 'Test alert'
    };

    await alertSystem.sendAlert(alert);
    
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  test('should handle critical error alert', async () => {
    axios.post.mockResolvedValueOnce({ status: 200 });
    
    const error = new Error('Critical error');
    const context = { source: 'test' };
    
    await alertSystem.alertCriticalError(error, context);
    
    expect(axios.post).toHaveBeenCalledWith(
      mockConfig.webhookUrl,
      expect.objectContaining({
        level: 'CRITICAL',
        message: expect.stringContaining('Critical error')
      })
    );
  });

  test('should handle performance issue alert', async () => {
    axios.post.mockResolvedValueOnce({ status: 200 });
    
    await alertSystem.alertPerformanceIssue('responseTime', 1000, 1500);
    
    expect(axios.post).toHaveBeenCalledWith(
      mockConfig.webhookUrl,
      expect.objectContaining({
        level: 'WARNING',
        message: expect.stringContaining('Performance issue')
      })
    );
  });

  test('should handle quality degradation alert', async () => {
    axios.post.mockResolvedValueOnce({ status: 200 });
    
    await alertSystem.alertQualityDegradation(0.5, 0.8);
    
    expect(axios.post).toHaveBeenCalledWith(
      mockConfig.webhookUrl,
      expect.objectContaining({
        level: 'WARNING',
        message: expect.stringContaining('Quality degradation')
      })
    );
  });

  test('should not send alert for performance below threshold', async () => {
    await alertSystem.alertPerformanceIssue('responseTime', 1000, 500);
    
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('should not send alert for quality above threshold', async () => {
    await alertSystem.alertQualityDegradation(0.9, 0.8);
    
    expect(axios.post).not.toHaveBeenCalled();
  });
}); 
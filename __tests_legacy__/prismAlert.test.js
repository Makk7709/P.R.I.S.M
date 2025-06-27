import { checkEfficiencyAlert, sendAlert } from '../telemetry/prismAlert.js';
import { metrics } from '../telemetry/prismMetrics.js';

// Mock fetch
global.fetch = jest.fn();

describe('PRISM Alert', () => {
  beforeEach(() => {
    // Reset metrics and mocks
    metrics.efficiency.reset();
    jest.clearAllMocks();
    process.env.PRISM_ALERT_URL = 'http://test-alert-url';
  });

  describe('Alert Threshold', () => {
    it('should trigger alert when efficiency below threshold', async () => {
      metrics.efficiency.set(40); // Below 50% threshold
      await checkEfficiencyAlert();
      expect(fetch).toHaveBeenCalledWith(
        'http://test-alert-url',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'critical',
            metric: 'efficiency',
            value: 40
          })
        })
      );
    });

    it('should not trigger alert when efficiency above threshold', async () => {
      metrics.efficiency.set(60); // Above 50% threshold
      await checkEfficiencyAlert();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('Alert Webhook', () => {
    it('should send alert with correct payload', async () => {
      await sendAlert(45);
      expect(fetch).toHaveBeenCalledWith(
        'http://test-alert-url',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'critical',
            metric: 'efficiency',
            value: 45
          })
        })
      );
    });

    it('should handle webhook failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      fetch.mockRejectedValueOnce(new Error('Network error'));
      await sendAlert(45);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send alert:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should log warning when alert URL not configured', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      delete process.env.PRISM_ALERT_URL;
      await sendAlert(45);
      expect(consoleSpy).toHaveBeenCalledWith(
        'PRISM_ALERT_URL not configured, skipping alert'
      );
      consoleSpy.mockRestore();
    });
  });
}); 
const { metrics } = require('./prismMetrics');

// Alert configuration
const ALERT_THRESHOLD = 50; // 50% efficiency threshold
const ALERT_WINDOW = 3 * 60 * 1000; // 3 minutes in milliseconds
const ALERT_URL = process.env.PRISM_ALERT_URL;

// Alert state
let lastAlertTime = 0;
let alertInProgress = false;

// Function to check efficiency and trigger alerts
async function checkEfficiencyAlert() {
  const currentEfficiency = metrics.efficiency.get();
  const now = Date.now();

  // Check if we're below threshold
  if (currentEfficiency < ALERT_THRESHOLD) {
    // If this is the first time we're below threshold or enough time has passed
    if (!alertInProgress || (now - lastAlertTime) >= ALERT_WINDOW) {
      await sendAlert(currentEfficiency);
      lastAlertTime = now;
      alertInProgress = true;
    }
  } else {
    alertInProgress = false;
  }
}

// Function to send alert
async function sendAlert(efficiencyValue) {
  if (!ALERT_URL) {
    console.warn('PRISM_ALERT_URL not configured, skipping alert');
    return;
  }

  try {
    const response = await fetch(ALERT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level: 'critical',
        metric: 'efficiency',
        value: efficiencyValue,
      }),
    });

    if (!response.ok) {
      throw new Error(`Alert webhook failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}

// Start monitoring
setInterval(checkEfficiencyAlert, 60000); // Check every minute

module.exports = {
  checkEfficiencyAlert,
  sendAlert,
}; 
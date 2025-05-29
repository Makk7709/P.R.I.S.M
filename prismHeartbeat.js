/**
 * PRISM Heartbeat System
 * Manages periodic heartbeat events for the PRISM cognitive framework
 */

class PrismHeartbeat {
  constructor() {
    this.interval = 5000; // Default 5 seconds
    this.timer = null;
    this.isActive = false;
    this.eventName = 'prismHeartbeatEvent';
  }

  startHeartbeat() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.timer = setInterval(() => {
      const event = new CustomEvent(this.eventName, {
        detail: {
          timestamp: Date.now(),
          interval: this.interval
        }
      });
      window.dispatchEvent(event);
    }, this.interval);
  }

  stopHeartbeat() {
    if (!this.isActive) return;
    
    clearInterval(this.timer);
    this.timer = null;
    this.isActive = false;
  }

  configureHeartbeat(intervalInSeconds) {
    if (intervalInSeconds < 1) {
      throw new Error('Heartbeat interval must be at least 1 second');
    }
    
    const wasActive = this.isActive;
    if (wasActive) {
      this.stopHeartbeat();
    }
    
    this.interval = intervalInSeconds * 1000;
    
    if (wasActive) {
      this.startHeartbeat();
    }
  }
}

// Inline tests
const runTests = () => {
  const heartbeat = new PrismHeartbeat();
  let eventCount = 0;
  let lastEventTime = 0;
  
  // Test event listener
  window.addEventListener('prismHeartbeatEvent', (e) => {
    eventCount++;
    lastEventTime = e.detail.timestamp;
  });

  // Test start/stop
  console.assert(!heartbeat.isActive, 'Heartbeat should be inactive initially');
  heartbeat.startHeartbeat();
  console.assert(heartbeat.isActive, 'Heartbeat should be active after start');
  heartbeat.stopHeartbeat();
  console.assert(!heartbeat.isActive, 'Heartbeat should be inactive after stop');

  // Test configuration
  heartbeat.configureHeartbeat(2);
  console.assert(heartbeat.interval === 2000, 'Interval should be 2000ms');
  
  // Test invalid configuration
  try {
    heartbeat.configureHeartbeat(0);
    console.error('Should have thrown error for invalid interval');
  } catch (e) {
    console.assert(e.message.includes('must be at least 1 second'), 'Should throw correct error message');
  }

  // Test event emission
  heartbeat.startHeartbeat();
  setTimeout(() => {
    console.assert(eventCount > 0, 'Should have received at least one event');
    console.assert(lastEventTime > 0, 'Event should have timestamp');
    heartbeat.stopHeartbeat();
  }, 3000);
};

// Run tests in development
if (process.env.NODE_ENV === 'development') {
  runTests();
}

export default PrismHeartbeat; 
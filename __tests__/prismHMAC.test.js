import PrismHMAC from '../security/prismHMAC.js';

describe('PrismHMAC', () => {
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const testPayload = { data: 'test', timestamp: Date.now() };

  beforeEach(() => {
    // Reset the key and degraded mode state
    PrismHMAC['#key'] = null;
    PrismHMAC['#isDegradedMode'] = false;
    
    // Set test key
    window.PRISM_EVENT_KEY = testKey;
  });

  afterEach(() => {
    delete window.PRISM_EVENT_KEY;
  });

  test('should sign and verify payload correctly', async () => {
    const signature = await PrismHMAC.sign(testPayload);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(64); // SHA-256 produces 32 bytes = 64 hex chars

    const isValid = await PrismHMAC.verify(testPayload, signature);
    expect(isValid).toBe(true);
  });

  test('should detect tampered payload', async () => {
    const signature = await PrismHMAC.sign(testPayload);
    const tamperedPayload = { ...testPayload, data: 'tampered' };
    
    const isValid = await PrismHMAC.verify(tamperedPayload, signature);
    expect(isValid).toBe(false);
  });

  test('should run in degraded mode when key is missing', async () => {
    delete window.PRISM_EVENT_KEY;
    
    const signature = await PrismHMAC.sign(testPayload);
    expect(signature).toBeNull();
    
    const isValid = await PrismHMAC.verify(testPayload, 'any-signature');
    expect(isValid).toBe(true);
  });

  test('should handle performance requirements', async () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      const signature = await PrismHMAC.sign(testPayload);
      await PrismHMAC.verify(testPayload, signature);
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should complete within 100ms
  });
}); 
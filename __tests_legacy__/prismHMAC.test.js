import { PrismHMAC } from '../security/prismHMAC.js';

describe('PrismHMAC', () => {
  const testPayload = { data: 'test', timestamp: Date.now() };
  let hmac;

  beforeEach(() => {
    hmac = new PrismHMAC();
  });

  test('should sign and verify payload correctly', () => {
    const payloadString = JSON.stringify(testPayload);
    const signature = hmac.generate(payloadString);
    expect(signature).toBe(`hmac-${payloadString}`);

    const isValid = hmac.verify(payloadString, signature);
    expect(isValid).toBe(true);
  });

  test('should detect tampered payload', () => {
    const payloadString = JSON.stringify(testPayload);
    const signature = hmac.generate(payloadString);
    const tamperedPayloadString = JSON.stringify({ ...testPayload, data: 'tampered' });
    
    const isValid = hmac.verify(tamperedPayloadString, signature);
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
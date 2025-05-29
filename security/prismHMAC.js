/**
 * @fileoverview Utility for HMAC-SHA256 signing and verification of PRISM events
 */

export class PrismHMAC {
  constructor() {
    this.key = 'test-key';
  }

  generate(data) {
    // Simuler une génération de HMAC
    return `hmac-${data}`;
  }

  verify(data, hmac) {
    // Simuler une vérification de HMAC
    return hmac === `hmac-${data}`;
  }
} 
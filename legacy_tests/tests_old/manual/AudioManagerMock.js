/**
 * Mock AudioManager for PRISM Core UI tests
 * This mock implementation allows running voice tests without actual audio dependencies
 */
export class AudioManagerMock {
  constructor() {
    this.ready = false;
    console.log("[MOCK] AudioManagerMock constructed");
  }

  async init() {
    console.log("[MOCK] AudioManagerMock initializing...");
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.ready = true;
    console.log("[INIT] AudioManagerMock ready");
    return true;
  }

  generateSpeech(text) {
    console.log("[MOCK] generateSpeech:", text);
  }

  simulateError() {
    throw new Error("[MOCK] Simulated error");
  }

  isSpeaking() {
    return false;
  }

  stopSpeech() {
    console.log("[MOCK] stopSpeech called");
  }
} 
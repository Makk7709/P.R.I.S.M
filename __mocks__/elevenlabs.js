export class Conversation {
  constructor() {
    this.messages = [];
  }

  addMessage(message) {
    this.messages.push(message);
    return Promise.resolve();
  }

  async generateAudio() {
    return new Uint8Array(32);
  }
} 
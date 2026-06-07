export const createAudioManagerMock = () => {
  let audioContext = {
    state: 'running',
    sampleRate: 44100
  };

  let voiceSettings = {
    voiceId: 'test-voice',
    speakingRate: 1
  };

  const mock = {
    init: jest.fn().mockResolvedValue(true),
    verifyApiKey: jest.fn().mockResolvedValue(true),
    cleanup: jest.fn(),
    updateVoiceSettings: jest.fn().mockImplementation((settings) => {
      voiceSettings = { ...voiceSettings, ...settings };
      return Promise.resolve(voiceSettings);
    }),
    generateAndPlaySpeech: jest.fn().mockResolvedValue(true),
    generateSpeech: jest.fn().mockImplementation(async (text) => {
      // Simulate agent API call
      if (Math.random() < 0.9) { // 90% success rate for agent API
        return Promise.resolve(true);
      } else {
        // Simulate fallback to standard TTS
        console.warn('Agent API failed, falling back to standard TTS...');
        return Promise.resolve(true);
      }
    }),
    generateStandardTTS: jest.fn().mockResolvedValue(true),
    getVoiceSettings: jest.fn().mockImplementation(() => Promise.resolve(voiceSettings)),
    handleError: jest.fn().mockImplementation((error) => {
      console.error('Mocked Audio error:', error);
      return Promise.resolve();
    }),
    get audioContext() {
      return audioContext;
    },
    get voiceSettings() {
      return voiceSettings;
    }
  };

  return mock;
}; 
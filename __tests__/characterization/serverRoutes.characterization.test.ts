/**
 * Characterization tests for server.js HTTP routes (S3776, items #27-29).
 *
 * server.js is the HTTP entrypoint. It is hard to test because it instantiates
 * several singletons at module top-level and (previously) called app.listen()
 * unconditionally at import. An import guard now gates app.listen so the module
 * can be imported by supertest without binding a port.
 *
 * Strategy: import the REAL Express app and mock every external/network
 * dependency (LLM orchestrators, voice enhancer, TrustContext, node-fetch /
 * ElevenLabs). The mocks return controlled values; we then assert the exact
 * observable behavior of each route (status code, payload, headers). These
 * assertions are written BEFORE the cognitive-complexity refactor and must keep
 * passing afterwards — proving the extraction is iso-behavior.
 *
 * Dependencies are mocked by module id (vitest dedups to the same absolute file
 * server.js imports), and the ElevenLabs API key is forced to a deterministic
 * placeholder before import (dotenv never overrides a value already in
 * process.env), so the audio branch is exercised without any real network call.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

const H = vi.hoisted(() => ({ state: {} as any }));

vi.mock('../../src/core/TaskTypeProcessor.js', () => ({
  TaskTypeProcessor: class {
    process(message: string, taskType: string, options: any) {
      return H.state.taskTypeProcessor.process(message, taskType, options);
    }
  },
}));

vi.mock('../../src/orchestrator/HybridOrchestrator.js', () => ({
  HybridOrchestrator: class {
    process(message: string, taskType: string, options: any) {
      return H.state.hybridOrchestrator.process(message, taskType, options);
    }
  },
  OrchestrationMode: { ROUTED: 'ROUTED', CONSENSUS: 'CONSENSUS' },
}));

vi.mock('../../backend/orchestrator.js', () => ({
  handleUserInstruction: (...args: any[]) => H.state.handleUserInstruction(...args),
}));

vi.mock('../../src/voice/ResponseModeManager.js', () => ({
  ResponseModeManager: class {
    voiceOptimizer = {
      cleanForSpeech: (t: string, o?: any) =>
        H.state.responseModeManager.voiceOptimizer.cleanForSpeech(t, o),
      truncateForVoice: (t: string, o?: any) =>
        H.state.responseModeManager.voiceOptimizer.truncateForVoice(t, o),
    };

    detectInputMode(args: any) {
      return H.state.responseModeManager.detectInputMode(args);
    }

    determineResponseMode(args: any) {
      return H.state.responseModeManager.determineResponseMode(args);
    }
  },
  InputMode: { TEXT: 'text', VOICE: 'voice', HYBRID: 'hybrid' },
  ResponseMode: {
    TEXT_ONLY: 'text_only',
    VOICE_ONLY: 'voice_only',
    VOICE_WITH_TEXT: 'voice_with_text',
    HYBRID: 'hybrid',
  },
}));

vi.mock('../../backend/voicePersonalityEnhancer.js', () => ({
  VoicePersonalityEnhancer: class {
    enhanceForVoice(content: any, taskType: string, meta: any) {
      return H.state.voiceEnhancer.enhanceForVoice(content, taskType, meta);
    }
  },
}));

vi.mock('../../src/infographic/ImageGenerator.js', () => ({
  ImageGenerator: class {
    isImageRequest() {
      return false;
    }
    async generateForChat() {
      return { success: false, error: 'mock' };
    }
  },
}));

vi.mock('../../src/export/PdfExportService.js', () => ({
  PdfExportService: class {
    calculateStats() {
      return {};
    }
    async generateForDownload() {
      return { success: false, error: 'mock' };
    }
  },
}));

vi.mock('../../src/core/TrustContext.js', () => ({
  getTrustContext: () => H.state.trustContext,
  CriticalityLevel: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' },
}));

vi.mock('node-fetch', () => ({
  default: (...args: any[]) => H.state.fetchImpl(...args),
}));

let app: any;
let serverModule: any;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.ELEVENLABS_API_KEY = 'test-eleven-key-placeholder';
  serverModule = await import('../../server.js');
  app = serverModule.app;
});

beforeEach(() => {
  H.state.taskTypeProcessor = {
    process: vi.fn(async () => ({
      content: 'PROCESSOR_CONTENT',
      metadata: {
        model: 'gpt-test',
        consensusUsed: false,
        persona: 'analyst',
        researchUsed: false,
        ethicalScore: 0.9,
      },
    })),
  };
  H.state.hybridOrchestrator = { process: vi.fn(async () => null) };
  H.state.handleUserInstruction = vi.fn(async () => ({
    data: { content: 'HUI_CONTENT' },
    metadata: { model: 'hui-model' },
  }));
  H.state.responseModeManager = {
    detectInputMode: vi.fn(() => 'text'),
    determineResponseMode: vi.fn(() => ({
      mode: 'text_only',
      generateAudio: false,
      formatOptions: { maxAudioLength: 4000 },
    })),
    voiceOptimizer: {
      cleanForSpeech: vi.fn((t: string) => t),
      truncateForVoice: vi.fn((t: string) => t),
    },
  };
  H.state.voiceEnhancer = {
    enhanceForVoice: vi.fn((content: any) => ({
      enhancedText: typeof content === 'string' ? `${content}_ENH` : content,
      voiceConfig: { name: 'Jean', provider: 'elevenlabs' },
      voiceMetadata: { mode: 'expressive', emotion: 'neutral', voice: 'jean' },
    })),
  };
  H.state.trustContext = {
    validateCriticalDecision: vi.fn(async () => ({ approved: true })),
  };
  H.state.fetchImpl = vi.fn(async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    text: async () => '',
  }));
});

describe('import guard + module exports', () => {
  it('exports app and startServer without binding a port on import', () => {
    expect(typeof serverModule.app).toBe('function');
    expect(typeof serverModule.startServer).toBe('function');
    expect(typeof serverModule.generateElevenLabsAudio).toBe('function');
  });
});

describe('POST /api/chat — validation + nominal', () => {
  it('returns 400 for an empty/whitespace message', async () => {
    const res = await request(app).post('/api/chat').send({ message: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Message vide ou manquant' });
  });

  it('returns 400 when message is missing', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, error: 'Message vide ou manquant' });
  });

  it('nominal text request: 200 with processor content + orchestration metadata, no audio', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'hello', taskType: 'general' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.content).toBe('PROCESSOR_CONTENT_ENH');
    expect(res.body.model).toBe('gpt-test');
    expect(res.body.audioUrl).toBeNull();
    expect(res.body.inputMode).toBe('text');
    expect(res.body.responseMode).toBe('text_only');
    expect(res.body.shouldPlayAudio).toBe(false);
    expect(res.body.fallbackToTTS).toBe(false);
    expect(res.body.metadata.orchestration.persona).toBe('analyst');
    expect(res.body.metadata.orchestration.consensusUsed).toBe(false);
    expect(res.body.metadata.orchestration.ethicalScore).toBe(0.9);
    expect(typeof res.body.responseTime).toBe('number');
  });
});

describe('POST /api/chat — TrustContext gate (critical requests)', () => {
  it('blocks an unapproved critical request with 403', async () => {
    H.state.trustContext.validateCriticalDecision = vi.fn(async () => ({
      approved: false,
      reason: 'needs supervisor',
    }));
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'please DELETE everything', taskType: 'general' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: 'Request requires human approval',
      approvalRequired: true,
      reason: 'needs supervisor',
    });
  });

  it('returns 500 when the TrustContext validation throws', async () => {
    H.state.trustContext.validateCriticalDecision = vi.fn(async () => {
      throw new Error('trust down');
    });
    const res = await request(app).post('/api/chat').send({ message: 'SHUTDOWN now' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Security validation failed');
    expect(res.body.details).toBeUndefined();
  });

  it('an approved critical request proceeds to a normal 200 response', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'DELETE old logs', taskType: 'critical' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.content).toBe('PROCESSOR_CONTENT_ENH');
  });
});

describe('POST /api/chat — orchestration fallback chain', () => {
  it('falls back to HybridOrchestrator when the processor throws', async () => {
    H.state.taskTypeProcessor.process = vi.fn(async () => {
      throw new Error('processor fail');
    });
    H.state.hybridOrchestrator.process = vi.fn(async () => ({
      content: 'HYBRID_CONTENT',
      model: 'hybrid-model',
      mode: 'ROUTED',
      consensusUsed: false,
    }));
    const res = await request(app).post('/api/chat').send({ message: 'hi', taskType: 'general' });
    expect(res.status).toBe(200);
    expect(res.body.content).toBe('HYBRID_CONTENT_ENH');
    expect(res.body.model).toBe('hybrid-model');
  });

  it('falls back to handleUserInstruction when hybrid returns no content', async () => {
    H.state.taskTypeProcessor.process = vi.fn(async () => {
      throw new Error('processor fail');
    });
    H.state.hybridOrchestrator.process = vi.fn(async () => null);
    H.state.handleUserInstruction = vi.fn(async () => ({
      data: { content: 'FINAL_FALLBACK' },
      metadata: { model: 'final-model' },
    }));
    const res = await request(app).post('/api/chat').send({ message: 'hi' });
    expect(res.status).toBe(200);
    expect(res.body.content).toBe('FINAL_FALLBACK_ENH');
    expect(res.body.model).toBe('final-model');
  });

  it('returns 500 when the final fallback yields an invalid orchestrator response', async () => {
    H.state.taskTypeProcessor.process = vi.fn(async () => {
      throw new Error('processor fail');
    });
    H.state.hybridOrchestrator.process = vi.fn(async () => null);
    H.state.handleUserInstruction = vi.fn(async () => ({}));
    const res = await request(app).post('/api/chat').send({ message: 'hi' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Réponse invalide de l'orchestrateur");
    expect(res.body.fallback).toBe(
      'Désolé, je rencontre un problème technique. Réessayez dans un moment.'
    );
  });
});

describe('POST /api/chat — audio generation branch', () => {
  it('generates an ElevenLabs data-URL when the response mode requests audio', async () => {
    H.state.responseModeManager.determineResponseMode = vi.fn(() => ({
      mode: 'voice_with_text',
      generateAudio: true,
      formatOptions: { maxAudioLength: 4000 },
    }));
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'hello', taskType: 'general', inputSource: 'voice' });
    expect(res.status).toBe(200);
    expect(typeof res.body.audioUrl).toBe('string');
    expect(res.body.audioUrl).toContain('data:audio/mpeg;base64,');
    expect(res.body.shouldPlayAudio).toBe(true);
    expect(res.body.fallbackToTTS).toBe(false);
    expect(res.body.metadata.elevenLabsError).toBeNull();
    expect(H.state.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('sets audioError + fallbackToTTS when the ElevenLabs call fails', async () => {
    H.state.responseModeManager.determineResponseMode = vi.fn(() => ({
      mode: 'voice_with_text',
      generateAudio: true,
      formatOptions: {},
    }));
    H.state.fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => 'bad request',
    }));
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'hello', inputSource: 'voice' });
    expect(res.status).toBe(200);
    expect(res.body.audioUrl).toBeNull();
    expect(res.body.shouldPlayAudio).toBe(false);
    expect(res.body.fallbackToTTS).toBe(true);
    expect(res.body.metadata.elevenLabsError).toBe('API Error: 400');
  });
});

describe('POST /api/chat — outer error handling', () => {
  it('returns 500 with fallback text when an unexpected error is thrown', async () => {
    H.state.responseModeManager.determineResponseMode = vi.fn(() => {
      throw new Error('mode boom');
    });
    const res = await request(app).post('/api/chat').send({ message: 'hello' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('mode boom');
    expect(res.body.fallback).toBe(
      'Désolé, je rencontre un problème technique. Réessayez dans un moment.'
    );
    expect(typeof res.body.responseTime).toBe('number');
  });
});

describe('GET /api/metrics — pure route (end-to-end app wiring)', () => {
  it('returns the static dashboard metrics payload', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.revenue.label).toBe('€2.3M');
    expect(res.body.data.users.label).toBe('12.5K');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('generateElevenLabsAudio — audio helper (smartTruncate + fetch)', () => {
  it('returns a base64 data URL for a normal short text', async () => {
    const url = await serverModule.generateElevenLabsAudio('Bonjour le monde', null, null);
    expect(url).toContain('data:audio/mpeg;base64,');
    expect(H.state.fetchImpl).toHaveBeenCalledTimes(1);
    const [endpoint] = H.state.fetchImpl.mock.calls[0];
    expect(endpoint).toContain('https://api.elevenlabs.io/v1/text-to-speech/');
  });

  it('throws when the cleaned text is shorter than 3 characters', async () => {
    await expect(serverModule.generateElevenLabsAudio('  *  ', null, null)).rejects.toThrow(
      'Texte trop court après nettoyage'
    );
  });

  it('uses the selected ElevenLabs voice id in the endpoint', async () => {
    await serverModule.generateElevenLabsAudio('Texte de test vocal', null, {
      provider: 'elevenlabs',
      id: 'pqHfZKP75CvOlQylNhV4',
      name: 'Bill',
    });
    const [endpoint] = H.state.fetchImpl.mock.calls[0];
    expect(endpoint).toContain('pqHfZKP75CvOlQylNhV4');
  });

  it('smart-truncates very long text below the voice limit before sending', async () => {
    const longText = `${'Phrase de test compréhensible. '.repeat(400)}`;
    await serverModule.generateElevenLabsAudio(longText, null, null);
    const [, options] = H.state.fetchImpl.mock.calls[0];
    const body = JSON.parse(options.body);
    // Default voice (Jean) limit is 4500 chars.
    expect(body.text.length).toBeLessThanOrEqual(4500);
    expect(body.text.length).toBeGreaterThan(0);
  });
});

/**
 * Controller for the POST /api/chat route, extracted from server.js to reduce
 * its cognitive complexity (S3776, item #80) and to make the handler testable
 * in isolation. All external dependencies are injected, so the same handler is
 * exercised by supertest with mocks and wired with real singletons in server.js.
 *
 * The observable behavior (status codes, payloads, headers, side effects and
 * log lines) is identical to the previous inline handler.
 *
 * @module backend/controllers/voiceChatController
 */

/**
 * Normalise le corps de requête en appliquant les valeurs par défaut.
 * @param {Object} body - req.body
 */
export function parseChatRequest(body) {
  const {
    message,
    taskType = 'general',
    model = 'auto-select',
    voiceConfig,
    // ✨ Paramètres pour la détection du mode d'entrée
    inputSource = 'keyboard', // 'keyboard', 'voice', 'paste'
    voiceConfidence = null, // Confiance de reconnaissance vocale
    hasAttachment = false, // Fichier attaché
  } = body;

  return { message, taskType, model, voiceConfig, inputSource, voiceConfidence, hasAttachment };
}

/**
 * Détecte si la requête est critique (validation TrustContext requise).
 * @param {string} message
 * @param {string} taskType
 * @returns {boolean}
 */
export function isCriticalRequest(message, taskType) {
  const messageUpper = message.toUpperCase();
  return (
    taskType === 'critical' ||
    messageUpper.includes('DELETE') ||
    messageUpper.includes('SHUTDOWN') ||
    messageUpper.includes('RESET') ||
    messageUpper.includes('DESTROY') ||
    messageUpper.includes('FORMAT')
  );
}

// Construit le payload de réponse final (pure, iso-comportement).
function buildChatResult({
  enhancedResponse,
  responseContent,
  orchestratorResponse,
  model,
  responseTime,
  audioUrl,
  audioError,
  inputMode,
  responseModeConfig,
  voiceConfig,
}) {
  return {
    success: true,
    content: enhancedResponse.enhancedText || responseContent,
    model: orchestratorResponse.metadata?.model || model,
    responseTime: responseTime,
    voiceConfig: enhancedResponse.voiceConfig,
    audioUrl: audioUrl,
    // ✨ Logique intelligente écrit/vocal
    inputMode: inputMode, // Mode d'entrée détecté (text, voice, hybrid)
    responseMode: responseModeConfig.mode, // Mode de réponse
    shouldPlayAudio: responseModeConfig.generateAudio && !!audioUrl, // Doit-on jouer l'audio?
    fallbackToTTS: responseModeConfig.generateAudio && !audioUrl, // TTS navigateur si échec
    metadata: {
      enhanced: !!enhancedResponse.voiceConfig,
      voiceMode: enhancedResponse.voiceMetadata?.mode,
      emotion: enhancedResponse.voiceMetadata?.emotion,
      voice: enhancedResponse.voiceMetadata?.voice,
      // ✨ Métadonnées d'orchestration hybride + TaskTypeProcessor
      orchestration: {
        mode: orchestratorResponse.metadata?.orchestrationMode || 'ROUTED',
        modeLabel: orchestratorResponse.metadata?.modeLabel || 'Router Simple',
        consensusUsed: orchestratorResponse.metadata?.consensusUsed || false,
        criticalityScore: orchestratorResponse.metadata?.criticalityScore || 0,
        consensusDetails: orchestratorResponse.metadata?.consensusDetails || null,
        // ✨ Métadonnées TaskTypeProcessor
        persona: orchestratorResponse.metadata?.persona || null,
        researchUsed: orchestratorResponse.metadata?.researchUsed || false,
        researchSources: orchestratorResponse.metadata?.researchSources || [],
        consensusStatus: orchestratorResponse.metadata?.consensusStatus || null,
        ethicalScore: orchestratorResponse.metadata?.ethicalScore || null,
        ethicalStatus: orchestratorResponse.metadata?.ethicalStatus || null,
      },
      cached: orchestratorResponse.metadata?.cached,
      fallback: orchestratorResponse.metadata?.fallback,
      elevenLabsError: audioError, // ✨ Détails de l'erreur pour debug
      selectedVoice: voiceConfig, // ✨ Retourner la voix utilisée
    },
  };
}

/**
 * Crée le contrôleur de chat vocal avec ses dépendances injectées.
 * @param {Object} deps
 * @returns {{ handleChat: (req: any, res: any) => Promise<void> }}
 */
export function createVoiceChatController(deps) {
  const {
    taskTypeProcessor,
    hybridOrchestrator,
    handleUserInstruction,
    responseModeManager,
    voiceEnhancer,
    config,
    generateAudio,
    getTrustContext,
    CriticalityLevel,
    pipelineLog,
  } = deps;

  // ✨ ÉTAPE 0: Validation TrustContext pour requêtes critiques.
  // Renvoie une décision { blocked, status?, payload? } plutôt que d'écrire la
  // réponse, pour que handleChat reste le seul à piloter res.
  async function runTrustContextGate(req, params) {
    try {
      const trustContext = getTrustContext();
      const approval = await trustContext.validateCriticalDecision({
        action: 'api_chat_request',
        message: params.message,
        taskType: params.taskType,
        criticality: CriticalityLevel.HIGH,
        metadata: {
          inputSource: req.body.inputSource,
          ip: req.ip || req.connection.remoteAddress,
          timestamp: new Date().toISOString(),
        },
      });

      if (!approval.approved) {
        return {
          blocked: true,
          status: 403,
          payload: {
            success: false,
            error: 'Request requires human approval',
            approvalRequired: true,
            reason: approval.reason || 'Critical operation requires supervisor approval',
          },
        };
      }

      return { blocked: false };
    } catch (error) {
      console.error('[server.js] TrustContext validation error:', error.message);
      return {
        blocked: true,
        status: 500,
        payload: {
          success: false,
          error: 'Security validation failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      };
    }
  }

  // Construit le résultat à partir d'une réponse TaskTypeProcessor.
  function buildProcessorResult(processorResponse) {
    const responseContent = processorResponse.content;
    const orchestratorResponse = {
      data: { content: responseContent },
      metadata: {
        model: processorResponse.metadata?.model || 'auto',
        orchestrationMode: processorResponse.metadata?.consensusUsed ? 'consensus' : 'routed',
        consensusUsed: processorResponse.metadata?.consensusUsed || false,
        persona: processorResponse.metadata?.persona,
        researchUsed: processorResponse.metadata?.researchUsed || false,
        ethicalScore: processorResponse.metadata?.ethicalScore,
        ...processorResponse.metadata,
      },
    };

    console.log(`[PRISM API] Persona activé: ${processorResponse.metadata?.persona}`);
    if (processorResponse.metadata?.consensusUsed) {
      console.log(
        `[PRISM API] Consensus utilisé - Statut: ${processorResponse.metadata?.consensusStatus}`
      );
    }
    if (processorResponse.metadata?.researchUsed) {
      console.log(
        `[PRISM API] Recherche temps réel utilisée - ${processorResponse.metadata?.researchSources?.length || 0} sources`
      );
    }

    return { responseContent, orchestratorResponse };
  }

  // Chaîne de repli: HybridOrchestrator puis orchestrateur classique.
  async function runFallbackOrchestration(params, req) {
    const hybridResponse = await hybridOrchestrator.process(params.message, params.taskType, {
      context: req.body.context,
    });

    if (hybridResponse && hybridResponse.content) {
      const responseContent =
        typeof hybridResponse.content === 'string'
          ? hybridResponse.content
          : hybridResponse.content?.content ||
            hybridResponse.content?.data ||
            String(hybridResponse.content);
      const orchestratorResponse = {
        data: { content: hybridResponse.content },
        metadata: {
          model: hybridResponse.model,
          orchestrationMode: hybridResponse.mode,
          consensusUsed: hybridResponse.consensusUsed,
          criticalityScore: hybridResponse.criticalityScore,
          ...hybridResponse.metadata,
        },
      };
      return { responseContent, orchestratorResponse };
    }

    // Fallback final vers orchestrateur classique
    const orchestratorResponse = await handleUserInstruction(params.message, params.taskType);
    if (!orchestratorResponse || !orchestratorResponse.data) {
      throw new Error("Réponse invalide de l'orchestrateur");
    }
    const responseContent =
      orchestratorResponse.data.enhancedContent ||
      orchestratorResponse.data.choices?.[0]?.message?.content ||
      orchestratorResponse.data.content ||
      'Réponse générée par PRISM';
    return { responseContent, orchestratorResponse };
  }

  // ✨ Orchestration AGI complète avec repli sur erreur du processor.
  async function runOrchestration(params, req) {
    try {
      const processorResponse = await taskTypeProcessor.process(params.message, params.taskType, {
        context: req.body.context,
        voiceConfig: params.voiceConfig,
      });
      return buildProcessorResult(processorResponse);
    } catch (processorError) {
      console.warn(
        `[PRISM API] TaskTypeProcessor error, fallback to HybridOrchestrator:`,
        processorError.message
      );
      return runFallbackOrchestration(params, req);
    }
  }

  // ✨ Génération audio intelligente selon le mode d'entrée.
  async function maybeGenerateAudio({
    responseModeConfig,
    enhancedResponse,
    responseContent,
    voiceConfig,
  }) {
    let audioUrl = null;
    let audioError = null;

    // ✨ Audio SEULEMENT si input vocal ou forceVoice
    const shouldGenerateAudio = responseModeConfig.generateAudio;

    console.log(
      `[PRISM API] 🔊 Génération audio: ${shouldGenerateAudio ? 'OUI' : 'NON'} (mode: ${responseModeConfig.mode})`
    );

    const apiKey = config.config.CONFIG.ELEVENLABS.API_KEY;
    if (shouldGenerateAudio && apiKey && apiKey !== 'ta_clef_api_ici') {
      try {
        // ✨ Nettoyer le texte pour la voix
        const textForVoice = responseModeManager.voiceOptimizer.cleanForSpeech(
          enhancedResponse.enhancedText || responseContent
        );
        const truncatedText = responseModeManager.voiceOptimizer.truncateForVoice(textForVoice, {
          maxLength: responseModeConfig.formatOptions?.maxAudioLength || 4000,
          addContinuationHint: textForVoice.length > 4000,
        });

        audioUrl = await generateAudio(
          truncatedText,
          enhancedResponse.voiceConfig,
          voiceConfig // Passer la voix sélectionnée
        );
        console.log('[PRISM API] ✅ Audio ElevenLabs généré avec succès');
      } catch (audioErrorCatch) {
        console.warn('[PRISM API] ⚠️ ElevenLabs indisponible:', audioErrorCatch.message);
        audioError = audioErrorCatch.message;
        // On continue sans audio - l'interface utilisera le TTS du navigateur si mode vocal
      }
    } else if (!shouldGenerateAudio) {
      console.log('[PRISM API] 📝 Mode texte - pas de génération audio (économie de ressources)');
    }

    return { audioUrl, audioError };
  }

  // Journalisation de la réception de requête (pipeline + console).
  function logRequestReceived(pipelineSessionId, params, inputMode, responseModeConfig) {
    pipelineLog('RECEIVE_REQUEST', {
      pipelineSessionId,
      message: params.message,
      taskType: params.taskType,
      voiceConfig: params.voiceConfig,
      inputMode,
      responseMode: responseModeConfig.mode,
    });

    console.log('[PRISM API] Nouvelle requête chat reçue');
    console.log(`[PRISM API] Message: "${params.message.substring(0, 50)}..."`);
    console.log(`[PRISM API] Type de tâche: ${params.taskType}`);
    console.log(
      `[PRISM API] 🎯 Mode d'entrée: ${inputMode} → Mode de réponse: ${responseModeConfig.mode}`
    );
    if (params.voiceConfig) {
      console.log(`[PRISM API] Voix demandée: ${params.voiceConfig.name} (${params.voiceConfig.provider})`);
    }
  }

  async function handleChat(req, res) {
    const startTime = Date.now();
    const pipelineSessionId = `${Math.random().toString(36).slice(2)}-${Date.now()}`;

    try {
      const params = parseChatRequest(req.body);

      if (!params.message || params.message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message vide ou manquant',
        });
      }

      if (isCriticalRequest(params.message, params.taskType)) {
        const gate = await runTrustContextGate(req, params);
        if (gate.blocked) {
          return res.status(gate.status).json(gate.payload);
        }
      }

      // ✨ Détecter le mode d'entrée et déterminer le mode de réponse
      const inputMode = responseModeManager.detectInputMode({
        message: params.message,
        source: params.inputSource,
        confidence: params.voiceConfidence,
        hasAttachment: params.hasAttachment,
      });

      const responseModeConfig = responseModeManager.determineResponseMode({
        inputMode,
        userPreferences: {
          forceVoice: params.voiceConfig?.forceVoice,
          forceText: params.voiceConfig?.forceText,
          disableAudio: params.voiceConfig?.disableAudio,
        },
        context: { hasFileAttachment: params.hasAttachment },
      });

      logRequestReceived(pipelineSessionId, params, inputMode, responseModeConfig);

      const { responseContent, orchestratorResponse } = await runOrchestration(params, req);

      // Améliorer la réponse pour la voix
      const enhancedResponse = voiceEnhancer.enhanceForVoice(responseContent, params.taskType, {
        timestamp: new Date().toISOString(),
        model: orchestratorResponse.metadata?.model,
        selectedVoice: params.voiceConfig, // ✨ Passer la voix sélectionnée
      });

      const responseTime = Date.now() - startTime;

      const logContent =
        typeof responseContent === 'string'
          ? responseContent.substring(0, 100)
          : JSON.stringify(responseContent).substring(0, 100);
      console.log('[PRISM] Réponse orchestrée:', `${logContent}...`);

      const { audioUrl, audioError } = await maybeGenerateAudio({
        responseModeConfig,
        enhancedResponse,
        responseContent,
        voiceConfig: params.voiceConfig,
      });

      const result = buildChatResult({
        enhancedResponse,
        responseContent,
        orchestratorResponse,
        model: params.model,
        responseTime,
        audioUrl,
        audioError,
        inputMode,
        responseModeConfig,
        voiceConfig: params.voiceConfig,
      });

      console.log(`[PRISM API] Réponse générée en ${responseTime}ms`);
      pipelineLog('ORCHESTRATOR_RESPONSE', {
        pipelineSessionId,
        model: orchestratorResponse.metadata?.model,
      });

      // ✨ GÉNÉRATION AUDIO ELEVENLABS OPTIMISÉE
      pipelineLog('AUDIO_GENERATION', { pipelineSessionId, voiceConfig: params.voiceConfig });
      pipelineLog('AUDIO_RESULT', { pipelineSessionId, audioUrl, audioError });

      pipelineLog('SEND_RESPONSE', { pipelineSessionId, responseTime });
      res.json(result);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('[PRISM API] Erreur:', error.message);
      pipelineLog('ERROR', { pipelineSessionId, error: error.message });

      res.status(500).json({
        success: false,
        error: error.message,
        responseTime: responseTime,
        fallback: 'Désolé, je rencontre un problème technique. Réessayez dans un moment.',
      });
    }
  }

  return { handleChat };
}

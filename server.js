// Sécurité : charger les variables d'environnement AVANT tout autre import
import 'dotenv/config';

// Ensuite seulement, charger la config et les autres modules
import * as config from './config.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { VoicePersonalityEnhancer } from './backend/voicePersonalityEnhancer.js';
import { handleUserInstruction } from './backend/orchestrator.js';
import { HybridOrchestrator } from './src/orchestrator/HybridOrchestrator.js';

// Initialiser l'orchestrateur hybride (routing + consensus)
const hybridOrchestrator = new HybridOrchestrator();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/ui', express.static(path.join(__dirname, 'ui')));

// Chargement dynamique pour éviter erreur si le module CommonJS/ESM mixte ne fournit pas l'export attendu
let enterpriseExportRouter = null;
try {
  const routeModule = await import('./backend/routes/enterpriseExport.js');
  enterpriseExportRouter = routeModule.enterpriseExportRouter ?? routeModule.default ?? null;
} catch (err) {
  console.warn('[INIT] Enterprise export route disabled:', err.message);
}

// Initialiser l'enhancer vocal
const voiceEnhancer = new VoicePersonalityEnhancer();

// DEBUG PIPELINE LOGGING (temporaire)
const DEBUG_LOG_PIPELINE = true;
function pipelineLog(...args) {
  if (DEBUG_LOG_PIPELINE) {
    const ts = Date.now();
    console.log(`[PIPELINE][${ts}]`, ...args);
  }
}

// API Route pour le chat PRISM avec ElevenLabs
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();

  try {
    const { message, taskType = 'general', model = 'auto-select', voiceConfig } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message vide ou manquant'
      });
    }

    const pipelineSessionId = Math.random().toString(36).slice(2) + '-' + Date.now();
    pipelineLog('RECEIVE_REQUEST', { pipelineSessionId, message, taskType, voiceConfig });

    console.log('[PRISM API] Nouvelle requête chat reçue');
    console.log(`[PRISM API] Message: "${message.substring(0, 50)}..."`);
    console.log(`[PRISM API] Type de tâche: ${taskType}`);
    if (voiceConfig) {
      console.log(`[PRISM API] Voix demandée: ${voiceConfig.name} (${voiceConfig.provider})`);
    }

    // ✨ NOUVEAU: Appeler l'orchestrateur HYBRIDE (routing + consensus intelligent)
    const hybridResponse = await hybridOrchestrator.process(message, taskType, {
      context: req.body.context // Passer le contexte si fourni
    });
    
    // Fallback vers l'ancien orchestrateur si nécessaire
    let orchestratorResponse;
    let responseContent;
    
    if (hybridResponse && hybridResponse.content) {
      // Utiliser la réponse de l'orchestrateur hybride
      responseContent = hybridResponse.content;
      orchestratorResponse = {
        data: { content: hybridResponse.content },
        metadata: {
          model: hybridResponse.model,
          orchestrationMode: hybridResponse.mode,
          consensusUsed: hybridResponse.consensusUsed,
          criticalityScore: hybridResponse.criticalityScore,
          ...hybridResponse.metadata
        }
      };
      console.log(`[PRISM API] Mode orchestration: ${hybridResponse.mode}`);
      if (hybridResponse.consensusUsed) {
        console.log(`[PRISM API] Consensus utilisé - Statut: ${hybridResponse.consensusStatus}`);
      }
    } else {
      // Fallback vers l'orchestrateur classique
      orchestratorResponse = await handleUserInstruction(message, taskType);
      if (!orchestratorResponse || !orchestratorResponse.data) {
        throw new Error('Réponse invalide de l\'orchestrateur');
      }
      responseContent = orchestratorResponse.data.enhancedContent || 
                       orchestratorResponse.data.choices?.[0]?.message?.content ||
                       orchestratorResponse.data.content ||
                       'Réponse générée par PRISM';
    }

    // Améliorer la réponse pour la voix
    const enhancedResponse = voiceEnhancer.enhanceForVoice(responseContent, taskType, {
      timestamp: new Date().toISOString(),
      model: orchestratorResponse.metadata?.model,
      selectedVoice: voiceConfig // ✨ Passer la voix sélectionnée
    });

    const responseTime = Date.now() - startTime;
    
    // Génération de réponse vocale enrichie (compatible ElevenLabs)
    console.log('[PRISM] Réponse orchestrée:', responseContent?.substring(0, 100) + '...');
    
    // ✨ GÉNÉRATION AUDIO ELEVENLABS OPTIMISÉE
    let audioUrl = null;
    let audioError = null;
    
    if (config.config.CONFIG.ELEVENLABS.API_KEY && 
        config.config.CONFIG.ELEVENLABS.API_KEY !== 'ta_clef_api_ici') {
      try {
        audioUrl = await generateElevenLabsAudio(
          enhancedResponse.enhancedText || responseContent,
          enhancedResponse.voiceConfig,
          voiceConfig // Passer la voix sélectionnée
        );
        console.log('[PRISM API] Audio ElevenLabs généré avec succès');
      } catch (audioErrorCatch) {
        console.warn('[PRISM API] ElevenLabs indisponible:', audioErrorCatch.message);
        audioError = audioErrorCatch.message;
        // On continue sans audio - l'interface utilisera le TTS du navigateur
      }
    }

    const result = {
      success: true,
      content: enhancedResponse.enhancedText || responseContent,
      model: orchestratorResponse.metadata?.model || model,
      responseTime: responseTime,
      voiceConfig: enhancedResponse.voiceConfig,
      audioUrl: audioUrl,
      fallbackToTTS: !audioUrl, // ✨ Nouveau flag pour indiquer à l'interface d'utiliser le TTS
      metadata: {
        enhanced: !!enhancedResponse.voiceConfig,
        voiceMode: enhancedResponse.voiceMetadata?.mode,
        emotion: enhancedResponse.voiceMetadata?.emotion,
        voice: enhancedResponse.voiceMetadata?.voice,
        // ✨ NOUVEAU: Métadonnées d'orchestration hybride
        orchestration: {
          mode: orchestratorResponse.metadata?.orchestrationMode || 'ROUTED',
          modeLabel: orchestratorResponse.metadata?.modeLabel || 'Router Simple',
          consensusUsed: orchestratorResponse.metadata?.consensusUsed || false,
          criticalityScore: orchestratorResponse.metadata?.criticalityScore || 0,
          consensusDetails: orchestratorResponse.metadata?.consensusDetails || null
        },
        cached: orchestratorResponse.metadata?.cached,
        fallback: orchestratorResponse.metadata?.fallback,
        elevenLabsError: audioError, // ✨ Détails de l'erreur pour debug
        selectedVoice: voiceConfig // ✨ Retourner la voix utilisée
      }
    };

    console.log(`[PRISM API] Réponse générée en ${responseTime}ms`);
    pipelineLog('ORCHESTRATOR_RESPONSE', { pipelineSessionId, model: orchestratorResponse.metadata?.model });
    
    // ✨ GÉNÉRATION AUDIO ELEVENLABS OPTIMISÉE
    pipelineLog('AUDIO_GENERATION', { pipelineSessionId, voiceConfig });
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
      fallback: 'Désolé, je rencontre un problème technique. Réessayez dans un moment.'
    });
  }
});

// Fonction optimisée pour générer l'audio avec ElevenLabs (approche simplifiée)
async function generateElevenLabsAudio(text, voiceConfig, selectedVoiceConfig) {
  const startTime = Date.now();
  const elevenlabs = config.config.CONFIG.ELEVENLABS;
  
  // ✅ NOUVEAU: Système de limite adaptative selon la voix - LIMITES MAXIMALES ELEVENLABS
  const getMaxLengthForVoice = (voiceId) => {
    // ✅ CORRECTION MAJEURE: Utiliser les vraies limites ElevenLabs (jusqu'à 5000 chars)
    // Jean (voix premium) - Limite maximale ElevenLabs
    if (voiceId === 'm5SBIR8kR76fbA5dP2rU') return 4500;
    // Autres voix ElevenLabs premium - Limite élevée
    if (['pqHfZKP75CvOlQylNhV4', 'nPczCjzI2devNBz1zQrb', '9BWtsMINqrJLrRacOk9x'].includes(voiceId)) return 4000;
    // Voix standard - Limite généreuse
    return 3500;
  };

  // ✅ NOUVEAU: Troncature ultra-intelligente préservant le sens
  const smartTruncate = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    
    console.log(`[ElevenLabs] 📏 Texte long détecté (${text.length} chars), troncature intelligente...`);
    
    // Priorité 1: Couper à la fin d'un paragraphe complet
    const paragraphs = text.split(/\n\s*\n/);
    let result = '';
    for (const paragraph of paragraphs) {
      if ((result + paragraph).length <= maxLength - 10) { // Marge de sécurité
        result += paragraph + '\n\n';
      } else {
        break;
      }
    }
    
    // Priorité 2: Si pas de paragraphe complet, couper à la fin d'une phrase
    if (result.length < maxLength * 0.3) { // Si moins de 30% conservé, essayer par phrases
      result = '';
      const sentences = text.split(/[.!?]+\s+/);
      for (const sentence of sentences) {
        if ((result + sentence).length <= maxLength - 20) { // Marge plus large
          result += sentence + '. ';
        } else {
          break;
        }
      }
    }
    
    // Priorité 3: Si toujours pas assez, couper à une virgule ou point-virgule
    if (result.length < maxLength * 0.2) {
      result = '';
      const clauses = text.split(/[,;]\s+/);
      for (const clause of clauses) {
        if ((result + clause).length <= maxLength - 10) {
          result += clause + ', ';
        } else {
          break;
        }
      }
    }
    
    // Priorité 4: En dernier recours, couper au mot complet le plus proche
    if (result.length < 100) {
      const words = text.split(' ');
      result = '';
      for (const word of words) {
        if ((result + word).length <= maxLength - 10) {
          result += word + ' ';
        } else {
          break;
        }
      }
    }
    
    result = result.trim();
    
    // Ajouter une fin naturelle si nécessaire
    if (!result.match(/[.!?]$/)) {
      if (result.length < maxLength - 3) {
        result += '...';
      } else {
        result = result.substring(0, result.lastIndexOf(' ')) + '...';
      }
    }
    
    console.log(`[ElevenLabs] ✂️ Texte intelligent tronqué: ${result.length} chars (préservation sémantique)`);
    return result;
  };
  
  // Nettoyage ultra-renforcé du texte SANS suppression des accents français
  let cleanText = text
    // Supprimer tous les émojis et caractères Unicode problématiques
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Supprimer les caractères de contrôle et spéciaux
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Nettoyer les marqueurs markdown
    .replace(/[#*]/g, '')
    // Normaliser les espaces et sauts de ligne
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    // ✅ CORRECTION CRITIQUE: Préserver les accents français
    // Supprimer uniquement les caractères vraiment problématiques, pas les accents
    .replace(/[^\x20-\x7E\u00C0-\u017F\u0152\u0153\u0178]/g, '') // Préserve tous les caractères français
    .trim();

  // Déterminer la voix à utiliser et sa limite
  let voiceId = elevenlabs.VOICE_ID; // Jean par défaut
  let voiceName = 'Jean (défaut)';
  
  // Si une voix ElevenLabs est sélectionnée, l'utiliser
  if (selectedVoiceConfig && 
      selectedVoiceConfig.provider === 'elevenlabs' && 
      selectedVoiceConfig.id) {
    voiceId = selectedVoiceConfig.id;
    voiceName = selectedVoiceConfig.name;
    console.log(`[ElevenLabs] 🎭 Voix personnalisée demandée: ${voiceName}`);
  }
  
  // ✅ NOUVEAU: Limite adaptative selon la voix
  const maxLength = getMaxLengthForVoice(voiceId);
  
  // ✅ NOUVEAU: Système de troncature intelligente
  if (cleanText.length > maxLength) {
    cleanText = smartTruncate(cleanText, maxLength);
  }

  if (cleanText.length < 3) {
    throw new Error('Texte trop court après nettoyage');
  }
  
  console.log(`[ElevenLabs] 🎤 Génération avec ${voiceName} - ${cleanText.length} chars (limite: ${maxLength})`);
  console.log(`[ElevenLabs] 📝 Texte nettoyé: "${cleanText.substring(0, 100)}..."`);

  try {
    // ✅ NOUVEAU: Timeout adaptatif selon la longueur du texte - AUGMENTÉ POUR TEXTES LONGS
    const adaptiveTimeout = Math.max(30000, cleanText.length * 50); // 50ms par caractère + 30s minimum
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabs.API_KEY
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.50,        // ✅ OPTIMISÉ: +0.15 pour clarté
          similarity_boost: 0.75, // ✅ OPTIMISÉ: -0.10 pour naturel
          style: 0.10,           // ✅ OPTIMISÉ: +0.10 pour expressivité
          use_speaker_boost: true
        }
      }),
      signal: AbortSignal.timeout(adaptiveTimeout) // ✅ Timeout adaptatif
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs] ❌ Erreur ${response.status}:`, errorText);
      
      // ✅ NOUVEAU: Retry intelligent avec réduction progressive - MOINS AGRESSIF
      if (response.status === 500 && cleanText.length > 2000) {
        console.log('[ElevenLabs] 🔄 Retry avec texte réduit de 20%...');
        const reducedLength = Math.floor(cleanText.length * 0.8); // Réduction moins agressive
        const reducedText = smartTruncate(cleanText, reducedLength);
        return await generateElevenLabsAudio(reducedText, voiceConfig, selectedVoiceConfig);
      }
      
      throw new Error(`API Error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const duration = Date.now() - startTime;
    console.log(`[ElevenLabs] ✅ Audio ${voiceName} généré en ${duration}ms (${cleanText.length} chars)`);
    
    return `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.warn(`[ElevenLabs] ⚠️ Erreur après ${duration}ms:`, error.message);
    
    // ✅ NOUVEAU: Système de fallback progressif - MOINS AGRESSIF
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('[ElevenLabs] ⏰ Timeout détecté, essai avec texte plus court...');
      
      if (cleanText.length > 1000) { // Seuil plus élevé
        const shortText = smartTruncate(cleanText, Math.floor(cleanText.length * 0.8)); // Réduction moins agressive
        try {
          return await generateElevenLabsAudio(shortText, voiceConfig, selectedVoiceConfig);
        } catch (secondError) {
          console.error('[ElevenLabs] ❌ Échec même avec texte réduit, abandon ElevenLabs');
          throw new Error('ElevenLabs indisponible - utiliser TTS navigateur');
        }
      }
    }
    
    throw error;
  }
}

// API Route pour tester une voix ElevenLabs
app.get('/api/test-voice', async (req, res) => {
  const { voiceId, voiceName } = req.query;
  
  try {
    console.log(`[Voice Test] Testing voice: ${voiceName} (${voiceId})`);
    
    if (!config.config.CONFIG.ELEVENLABS.API_KEY || 
        config.config.CONFIG.ELEVENLABS.API_KEY === 'ta_clef_api_ici') {
      return res.json({
        success: false,
        error: 'ElevenLabs API key not configured',
        fallbackToTTS: true
      });
    }
    
    // Test avec un message court
    const testText = "Hello! This is a voice test for PRISM.";
    
    const audioUrl = await generateElevenLabsAudio(testText, null, {
      id: voiceId,
      name: voiceName,
      provider: 'elevenlabs'
    });
    
    res.json({
      success: true,
      audioUrl: audioUrl,
      voice: {
        id: voiceId,
        name: voiceName
      }
    });
    
  } catch (error) {
    console.error('[Voice Test] Error:', error.message);
    res.json({
      success: false,
      error: error.message,
      fallbackToTTS: true
    });
  }
});

// Route pour lister les voix ElevenLabs disponibles
app.get('/api/voices', async (req, res) => {
  try {
    if (!config.config.CONFIG.ELEVENLABS.API_KEY || 
        config.config.CONFIG.ELEVENLABS.API_KEY === 'ta_clef_api_ici') {
      return res.json({
        success: false,
        error: 'ElevenLabs non configuré',
        voices: []
      });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': config.config.CONFIG.ELEVENLABS.API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filtrer et formater les voix pour l'interface
    const formattedVoices = data.voices
      .filter(voice => voice.available_for_tiers && voice.available_for_tiers.length === 0) // Voix disponibles
      .map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        language: voice.labels?.language || 'en',
        gender: voice.labels?.gender || 'unknown',
        accent: voice.labels?.accent || 'standard',
        descriptive: voice.labels?.descriptive || '',
        age: voice.labels?.age || '',
        use_case: voice.labels?.use_case || '',
        preview_url: voice.preview_url,
        category: voice.category || 'premade'
      }))
      .sort((a, b) => {
        // Prioriser les voix françaises
        if (a.language === 'fr' && b.language !== 'fr') return -1;
        if (a.language !== 'fr' && b.language === 'fr') return 1;
        // Puis trier par nom
        return a.name.localeCompare(b.name);
      });

    res.json({
      success: true,
      voices: formattedVoices,
      currentVoiceId: config.config.CONFIG.ELEVENLABS.VOICE_ID,
      totalAvailable: formattedVoices.length
    });

  } catch (error) {
    console.error('[PRISM API] ❌ Erreur récupération voix:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      voices: []
    });
  }
});

// Route pour changer la voix active
app.post('/api/set-voice', async (req, res) => {
  try {
    const { voiceId } = req.body;
    
    if (!voiceId) {
      return res.status(400).json({
        success: false,
        error: 'Voice ID requis'
      });
    }

    // Mettre à jour la configuration temporairement (pour cette session)
    config.config.CONFIG.ELEVENLABS.VOICE_ID = voiceId;
    
    res.json({
      success: true,
      message: 'Voix changée avec succès',
      newVoiceId: voiceId
    });

  } catch (error) {
    console.error('[PRISM API] ❌ Erreur changement voix:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route pour le dashboard investisseur
app.get('/investor', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo/investor-dashboard/index.html'));
});

// Route pour le dashboard corporate
app.get('/corporate', (req, res) => {
  res.sendFile(path.join(__dirname, 'index-corporate.html'));
});

// Route pour les demos
app.use('/demo', express.static(path.join(__dirname, 'demo')));

// Route pour les assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API pour les métriques du dashboard
app.get('/api/metrics', (req, res) => {
  const metrics = {
    revenue: { value: 2300000, label: '€2.3M', growth: 23.5 },
    users: { value: 12500, label: '12.5K', growth: 18.2 },
    uptime: { value: 99.97, label: '99.97%', growth: 0.1 },
    accuracy: { value: 99.8, label: '99.8%', growth: 2.3 },
    latency: { value: 47, label: '47ms', growth: -12.4 },
    security: { value: 100, label: 'Zero', growth: 0 }
  };
  
  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// API Export PDF Premium
// ============================================================================

import { PdfExportService } from './src/export/PdfExportService.js';

const pdfExportService = new PdfExportService();

// Endpoint d'export PDF des conversations
app.post('/api/export/pdf', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Liste de messages requise'
      });
    }
    
    console.log(`[PDF Export] Génération PDF pour ${messages.length} messages`);
    
    // Convertir les timestamps string en Date
    const formattedMessages = messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp || Date.now())
    }));
    
    // Générer le PDF
    const result = await pdfExportService.generateForDownload(formattedMessages, {
      title: options.title || 'Conversation PRISM',
      author: options.author || 'PRISM User',
      includeCoverPage: options.includeCoverPage !== false,
      includePageNumbers: options.includePageNumbers !== false,
      includeHeader: options.includeHeader !== false,
      includeFooter: options.includeFooter !== false,
      includeSummaryPage: options.includeSummaryPage || false
    });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
    console.log(`[PDF Export] ✅ PDF généré: ${result.fileSizeFormatted}`);
    
    // Envoyer le PDF en téléchargement
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
    
  } catch (error) {
    console.error('[PDF Export] ❌ Erreur:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint pour prévisualiser les stats avant export
app.post('/api/export/pdf/preview', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Liste de messages requise'
      });
    }
    
    const formattedMessages = messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp || Date.now())
    }));
    
    const stats = pdfExportService.calculateStats(formattedMessages);
    
    res.json({
      success: true,
      stats,
      estimatedPages: Math.ceil(messages.length / 10) + 2, // Estimation
      themes: ['prism-corporate', 'prism-light', 'prism-executive']
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Serveur PRISM avec ElevenLabs démarré');
  console.log(`✨ Interface disponible sur: http://localhost:${PORT}`);
  console.log(`🎤 API Chat: http://localhost:${PORT}/api/chat`);
  console.log(`🔊 Test vocal: http://localhost:${PORT}/api/test-voice`);
  console.log('🎯 PRISM Voice Chat V2 - Prêt !');
  
  // Vérifier la configuration ElevenLabs
  const elevenlabs = config.config.CONFIG.ELEVENLABS;
  if (elevenlabs.API_KEY && elevenlabs.API_KEY !== 'ta_clef_api_ici') {
    console.log('✅ ElevenLabs configuré - Synthèse vocale premium active');
  } else {
    console.log('⚠️ ElevenLabs non configuré - Fallback sur TTS navigateur');
    console.log('💡 Configurez ELEVENLABS_API_KEY pour activer la synthèse premium');
  }
}); 
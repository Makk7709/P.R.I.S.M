import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { config } from './config.js';
import { VoicePersonalityEnhancer } from './backend/voicePersonalityEnhancer.js';
import { handleUserInstruction } from './backend/orchestrator.js';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(__dirname));
app.use('/ui', express.static(path.join(__dirname, 'ui')));

// Initialiser l'enhancer vocal
const voiceEnhancer = new VoicePersonalityEnhancer();

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

    console.log('[PRISM API] 🎯 Nouvelle requête chat reçue');
    console.log(`[PRISM API] 📝 Message: "${message.substring(0, 50)}..."`);
    console.log(`[PRISM API] 🎯 Type de tâche: ${taskType}`);
    if (voiceConfig) {
      console.log(`[PRISM API] 🎤 Voix demandée: ${voiceConfig.name} (${voiceConfig.provider})`);
    }

    // Appeler l'orchestrateur PRISM
    const orchestratorResponse = await handleUserInstruction(message, taskType);
    
    if (!orchestratorResponse || !orchestratorResponse.data) {
      throw new Error('Réponse invalide de l\'orchestrateur');
    }

    // Extraire le contenu de la réponse
    const responseContent = orchestratorResponse.data.enhancedContent || 
                           orchestratorResponse.data.choices?.[0]?.message?.content ||
                           orchestratorResponse.data.content ||
                           'Réponse générée par PRISM';

    // Améliorer la réponse pour la voix
    const enhancedResponse = voiceEnhancer.enhanceForVoice(responseContent, taskType, {
      timestamp: new Date().toISOString(),
      model: orchestratorResponse.metadata?.model,
      selectedVoice: voiceConfig // ✨ Passer la voix sélectionnée
    });

    const responseTime = Date.now() - startTime;
    
    // Génération de réponse vocale enrichie (compatible ElevenLabs)
    console.log('[PRISM] ✅ Réponse orchestrée:', responseContent?.substring(0, 100) + '...');
    
    // ✨ GÉNÉRATION AUDIO ELEVENLABS OPTIMISÉE
    let audioUrl = null;
    let audioError = null;
    
    if (config.CONFIG.ELEVENLABS.API_KEY && 
        config.CONFIG.ELEVENLABS.API_KEY !== 'ta_clef_api_ici') {
      try {
        audioUrl = await generateElevenLabsAudio(
          enhancedResponse.enhancedText || responseContent,
          enhancedResponse.voiceConfig,
          voiceConfig // Passer la voix sélectionnée
        );
        console.log('[PRISM API] 🎤 Audio ElevenLabs généré avec succès');
      } catch (audioErrorCatch) {
        console.warn('[PRISM API] ⚠️ ElevenLabs indisponible:', audioErrorCatch.message);
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
        cached: orchestratorResponse.metadata?.cached,
        fallback: orchestratorResponse.metadata?.fallback,
        elevenLabsError: audioError, // ✨ Détails de l'erreur pour debug
        selectedVoice: voiceConfig // ✨ Retourner la voix utilisée
      }
    };

    console.log(`[PRISM API] ✅ Réponse générée en ${responseTime}ms`);
    res.json(result);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[PRISM API] ❌ Erreur:', error.message);
    
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
  const elevenlabs = config.CONFIG.ELEVENLABS;
  
  // Nettoyage ultra-renforcé du texte avec suppression Unicode
  const cleanText = text
    // Supprimer tous les émojis et caractères Unicode problématiques
    .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Supprimer les caractères de contrôle et spéciaux
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Nettoyer les marqueurs markdown
    .replace(/[#*]/g, '')
    // Normaliser les espaces et sauts de ligne
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    // Supprimer les caractères non-ASCII problématiques
    .replace(/[^\x20-\x7E\u00C0-\u017F]/g, '')
    .trim()
    .substring(0, 1000); // ✨ CORRECTION: Augmenté de 300 à 1000 caractères

  if (cleanText.length < 3) {
    throw new Error('Texte trop court après nettoyage');
  }

  // Déterminer la voix à utiliser
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
  
  console.log(`[ElevenLabs] 🎤 Génération avec ${voiceName} - ${cleanText.length} chars`);
  console.log(`[ElevenLabs] 📝 Texte nettoyé: "${cleanText}"`);

  try {
    // ✨ CORRECTION: Revenir aux paramètres qui fonctionnaient bien
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabs.API_KEY
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2', // ✨ CORRECTION: Revenir au modèle original
        // ✨ CORRECTION: Revenir aux paramètres optimisés pour Jean
        voice_settings: {
          stability: 0.35, // Paramètres originaux pour Jean
          similarity_boost: 0.85,
          style: 0.0, // Désactivé pour éviter la complexité
          use_speaker_boost: true
        }
      }),
      signal: AbortSignal.timeout(8000) // ✨ CORRECTION: Revenir au timeout original
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs] ❌ Erreur ${response.status}:`, errorText);
      
      // Retry avec texte encore plus simple en cas d'erreur
      if (response.status === 500 && cleanText.length > 100) {
        console.log('[ElevenLabs] 🔄 Retry avec texte raccourci...');
        return await generateElevenLabsAudio(cleanText.substring(0, 100) + "...", voiceConfig, selectedVoiceConfig);
      }
      
      throw new Error(`API Error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const duration = Date.now() - startTime;
    console.log(`[ElevenLabs] ✅ Audio ${voiceName} généré en ${duration}ms`);
    
    return `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.warn(`[ElevenLabs] ⚠️ Erreur après ${duration}ms:`, error.message);
    throw error;
  }
}

// Route pour tester ElevenLabs
app.get('/api/test-voice', async (req, res) => {
  try {
    const testText = "Test de la synthèse vocale PRISM avec ElevenLabs. Votre voix est maintenant plus expressive !";
    
    // Récupérer la voix demandée depuis les paramètres de requête
    const voiceId = req.query.voiceId;
    const voiceName = req.query.voiceName;
    
    let selectedVoiceConfig = null;
    if (voiceId && voiceName) {
      selectedVoiceConfig = {
        id: voiceId,
        provider: 'elevenlabs',
        name: voiceName
      };
    }
    
    const audioUrl = await generateElevenLabsAudio(testText, {
      context: { mode: 'FRIENDLY', emotion: 'excited' }
    }, selectedVoiceConfig);
    
    res.json({
      success: true,
      message: 'Test vocal réussi !',
      audioUrl: audioUrl,
      voiceUsed: selectedVoiceConfig?.name || 'Jean (défaut)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: 'ElevenLabs non configuré - utilisation du TTS navigateur'
    });
  }
});

// Route pour lister les voix ElevenLabs disponibles
app.get('/api/voices', async (req, res) => {
  try {
    if (!config.CONFIG.ELEVENLABS.API_KEY || 
        config.CONFIG.ELEVENLABS.API_KEY === 'ta_clef_api_ici') {
      return res.json({
        success: false,
        error: 'ElevenLabs non configuré',
        voices: []
      });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': config.CONFIG.ELEVENLABS.API_KEY
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
      currentVoiceId: config.CONFIG.ELEVENLABS.VOICE_ID,
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
    config.CONFIG.ELEVENLABS.VOICE_ID = voiceId;
    
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

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Serveur PRISM avec ElevenLabs démarré');
  console.log(`✨ Interface disponible sur: http://localhost:${PORT}`);
  console.log(`🎤 API Chat: http://localhost:${PORT}/api/chat`);
  console.log(`🔊 Test vocal: http://localhost:${PORT}/api/test-voice`);
  console.log('🎯 PRISM Voice Chat V2 - Prêt !');
  
  // Vérifier la configuration ElevenLabs
  const elevenlabs = config.CONFIG.ELEVENLABS;
  if (elevenlabs.API_KEY && elevenlabs.API_KEY !== 'ta_clef_api_ici') {
    console.log('✅ ElevenLabs configuré - Synthèse vocale premium active');
  } else {
    console.log('⚠️ ElevenLabs non configuré - Fallback sur TTS navigateur');
    console.log('💡 Configurez ELEVENLABS_API_KEY pour activer la synthèse premium');
  }
}); 
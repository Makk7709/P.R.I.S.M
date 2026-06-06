/**
 * ElevenLabs audio generation, extracted from server.js to reduce cognitive
 * complexity (S3776, items #356 generateElevenLabsAudio / #372 smartTruncate)
 * and to make the logic testable without a running HTTP server.
 *
 * The behavior is identical to the previous inline implementation: same text
 * cleaning, same adaptive voice limits, same smart truncation priorities, same
 * fetch request shape, same retry/fallback semantics, same log lines.
 *
 * @module backend/voice/elevenLabsAudio
 */

import nodeFetch from 'node-fetch';

/**
 * Limite de longueur adaptative selon la voix (limites maximales ElevenLabs).
 * @param {string} voiceId
 * @returns {number}
 */
export function getMaxLengthForVoice(voiceId) {
  // Jean (voix premium) - Limite maximale ElevenLabs
  if (voiceId === 'm5SBIR8kR76fbA5dP2rU') return 4500;
  // Autres voix ElevenLabs premium - Limite élevée
  if (['pqHfZKP75CvOlQylNhV4', 'nPczCjzI2devNBz1zQrb', '9BWtsMINqrJLrRacOk9x'].includes(voiceId))
    return 4000;
  // Voix standard - Limite généreuse
  return 3500;
}

// Priorité 1: couper à la fin d'un paragraphe complet.
function truncateByParagraph(text, maxLength) {
  const paragraphs = text.split(/\n\s*\n/);
  let result = '';
  for (const paragraph of paragraphs) {
    if ((result + paragraph).length <= maxLength - 10) {
      // Marge de sécurité
      result += `${paragraph}\n\n`;
    } else {
      break;
    }
  }
  return result;
}

// Priorité 2: couper à la fin d'une phrase.
function truncateBySentence(text, maxLength) {
  let result = '';
  const sentences = text.split(/[.!?]+\s+/);
  for (const sentence of sentences) {
    if ((result + sentence).length <= maxLength - 20) {
      // Marge plus large
      result += `${sentence}. `;
    } else {
      break;
    }
  }
  return result;
}

// Priorité 3: couper à une virgule ou point-virgule.
function truncateByClause(text, maxLength) {
  let result = '';
  const clauses = text.split(/[,;]\s+/);
  for (const clause of clauses) {
    if ((result + clause).length <= maxLength - 10) {
      result += `${clause}, `;
    } else {
      break;
    }
  }
  return result;
}

// Priorité 4: couper au mot complet le plus proche.
function truncateByWord(text, maxLength) {
  const words = text.split(' ');
  let result = '';
  for (const word of words) {
    if ((result + word).length <= maxLength - 10) {
      result += `${word} `;
    } else {
      break;
    }
  }
  return result;
}

// Ajoute une fin naturelle si le texte ne se termine pas par une ponctuation.
function addNaturalEnding(result, maxLength) {
  if (!result.match(/[.!?]$/)) {
    if (result.length < maxLength - 3) {
      result += '...';
    } else {
      result = `${result.substring(0, result.lastIndexOf(' '))}...`;
    }
  }
  return result;
}

/**
 * Troncature ultra-intelligente préservant le sens (cascade de priorités).
 * Iso-comportement de l'implémentation inline d'origine.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function smartTruncate(text, maxLength) {
  if (text.length <= maxLength) return text;

  console.log(
    `[ElevenLabs] 📏 Texte long détecté (${text.length} chars), troncature intelligente...`
  );

  let result = truncateByParagraph(text, maxLength);
  // Si moins de 30% conservé, essayer par phrases
  if (result.length < maxLength * 0.3) {
    result = truncateBySentence(text, maxLength);
  }
  // Si toujours pas assez, essayer par clauses
  if (result.length < maxLength * 0.2) {
    result = truncateByClause(text, maxLength);
  }
  // En dernier recours, couper au mot
  if (result.length < 100) {
    result = truncateByWord(text, maxLength);
  }

  result = addNaturalEnding(result.trim(), maxLength);

  console.log(
    `[ElevenLabs] ✂️ Texte intelligent tronqué: ${result.length} chars (préservation sémantique)`
  );
  return result;
}

/**
 * Nettoyage ultra-renforcé du texte SANS suppression des accents français.
 * @param {string} text
 * @returns {string}
 */
export function cleanTextForVoice(text) {
  return (
    text
      // Supprimer tous les émojis et caractères Unicode problématiques
      .replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        ''
      )
      // Supprimer les caractères de contrôle et spéciaux
      // eslint-disable-next-line no-control-regex -- intentional: strips C0/C1 control chars
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      // Nettoyer les marqueurs markdown
      .replace(/[#*]/g, '')
      // Normaliser les espaces et sauts de ligne
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      // ✅ Préserver les accents français, supprimer le reste
      .replace(/[^\x20-\x7E\u00C0-\u017F\u0152\u0153\u0178]/g, '')
      .trim()
  );
}

// Détermine la voix à utiliser et son nom d'affichage.
function resolveVoice(selectedVoiceConfig, elevenlabs) {
  let voiceId = elevenlabs.VOICE_ID; // Jean par défaut
  let voiceName = 'Jean (défaut)';

  if (
    selectedVoiceConfig &&
    selectedVoiceConfig.provider === 'elevenlabs' &&
    selectedVoiceConfig.id
  ) {
    voiceId = selectedVoiceConfig.id;
    voiceName = selectedVoiceConfig.name;
    console.log(`[ElevenLabs] 🎭 Voix personnalisée demandée: ${voiceName}`);
  }

  return { voiceId, voiceName };
}

/**
 * Crée le générateur audio ElevenLabs avec ses dépendances injectées.
 * @param {Object} deps
 * @param {Object} deps.config - Module de config (utilise config.config.CONFIG.ELEVENLABS)
 * @param {Function} [deps.fetch] - Implémentation fetch (défaut: node-fetch)
 * @returns {(text: string, voiceConfig: any, selectedVoiceConfig: any) => Promise<string>}
 */
export function createElevenLabsAudioGenerator({ config, fetch = nodeFetch }) {
  // Prépare le texte: nettoyage + troncature adaptative + garde longueur min.
  function prepareSpeechText(text, maxLength) {
    let cleanText = cleanTextForVoice(text);

    if (cleanText.length > maxLength) {
      cleanText = smartTruncate(cleanText, maxLength);
    }

    if (cleanText.length < 3) {
      throw new Error('Texte trop court après nettoyage');
    }

    return cleanText;
  }

  // Effectue l'appel HTTP ElevenLabs avec timeout adaptatif.
  function sendTtsRequest(cleanText, voiceId, apiKey) {
    // Timeout adaptatif selon la longueur du texte (50ms/char + 30s minimum)
    const adaptiveTimeout = Math.max(30000, cleanText.length * 50);

    return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.1,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(adaptiveTimeout),
    });
  }

  // Gère une réponse HTTP non-OK: retry réduit sur 500/texte long, sinon throw.
  async function handleTtsErrorResponse(response, cleanText, voiceConfig, selectedVoiceConfig) {
    const errorText = await response.text();
    console.error(`[ElevenLabs] ❌ Erreur ${response.status}:`, errorText);

    // Retry intelligent avec réduction progressive (moins agressif)
    if (response.status === 500 && cleanText.length > 2000) {
      console.log('[ElevenLabs] 🔄 Retry avec texte réduit de 20%...');
      const reducedLength = Math.floor(cleanText.length * 0.8);
      const reducedText = smartTruncate(cleanText, reducedLength);
      return generateElevenLabsAudio(reducedText, voiceConfig, selectedVoiceConfig);
    }

    throw new Error(`API Error: ${response.status}`);
  }

  // Encode la réponse audio en data-URL base64.
  async function encodeAudioResponse(response, voiceName, cleanText, startTime) {
    const audioBuffer = await response.arrayBuffer();
    const duration = Date.now() - startTime;
    console.log(
      `[ElevenLabs] ✅ Audio ${voiceName} généré en ${duration}ms (${cleanText.length} chars)`
    );

    return `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`;
  }

  // Gère une exception réseau: fallback progressif sur timeout/abort.
  async function handleTtsException(error, cleanText, voiceConfig, selectedVoiceConfig, startTime) {
    const duration = Date.now() - startTime;
    console.warn(`[ElevenLabs] ⚠️ Erreur après ${duration}ms:`, error.message);

    // Système de fallback progressif (moins agressif)
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('[ElevenLabs] ⏰ Timeout détecté, essai avec texte plus court...');

      if (cleanText.length > 1000) {
        const shortText = smartTruncate(cleanText, Math.floor(cleanText.length * 0.8));
        try {
          return await generateElevenLabsAudio(shortText, voiceConfig, selectedVoiceConfig);
        } catch (_secondError) {
          console.error('[ElevenLabs] ❌ Échec même avec texte réduit, abandon ElevenLabs');
          throw new Error('ElevenLabs indisponible - utiliser TTS navigateur');
        }
      }
    }

    throw error;
  }

  /**
   * Génère l'audio ElevenLabs (approche simplifiée, iso-comportement).
   * @param {string} text
   * @param {any} voiceConfig
   * @param {any} selectedVoiceConfig
   * @returns {Promise<string>} data-URL base64
   */
  async function generateElevenLabsAudio(text, voiceConfig, selectedVoiceConfig) {
    const startTime = Date.now();
    const elevenlabs = config.config.CONFIG.ELEVENLABS;

    const { voiceId, voiceName } = resolveVoice(selectedVoiceConfig, elevenlabs);
    const maxLength = getMaxLengthForVoice(voiceId);
    const cleanText = prepareSpeechText(text, maxLength);

    console.log(
      `[ElevenLabs] 🎤 Génération avec ${voiceName} - ${cleanText.length} chars (limite: ${maxLength})`
    );
    console.log(`[ElevenLabs] 📝 Texte nettoyé: "${cleanText.substring(0, 100)}..."`);

    try {
      const response = await sendTtsRequest(cleanText, voiceId, elevenlabs.API_KEY);

      if (!response.ok) {
        return await handleTtsErrorResponse(response, cleanText, voiceConfig, selectedVoiceConfig);
      }

      return await encodeAudioResponse(response, voiceName, cleanText, startTime);
    } catch (error) {
      return await handleTtsException(
        error,
        cleanText,
        voiceConfig,
        selectedVoiceConfig,
        startTime
      );
    }
  }

  return generateElevenLabsAudio;
}

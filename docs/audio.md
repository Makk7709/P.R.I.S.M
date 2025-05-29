# Audio - Système de Gestion Audio

## Vue d'ensemble

Le système Audio gère toute la partie audio de PRISM, de la capture du microphone au traitement en temps réel, en passant par la gestion des permissions et les retours sonores. Il utilise l'API Agent d'ElevenLabs pour la génération de voix intelligente avec fallback sur le TTS standard.

## Fonctionnalités principales

### 1. Capture audio

- **Capture du microphone** en temps réel
- **Gestion des permissions** audio
- **Traitement du signal** audio
- **Normalisation** automatique

### 2. Analyse audio

- **Analyse spectrale** en temps réel
- **Détection de niveau** sonore
- **Filtrage** intelligent
- **Compression** adaptative

### 3. Retours sonores

- **Sons d'interface** personnalisés
- **Feedback audio** pour les états
- **Transitions sonores** fluides
- **Mixage** dynamique

### 4. Gestion des erreurs

- **Détection des problèmes** audio
- **Récupération automatique**
- **Messages d'erreur** clairs
- **Suggestions de résolution**
- **Fallback TTS** en cas d'échec de l'agent

## API

### Initialisation

```javascript
const audio = new Audio({
  sampleRate: 44100,
  bufferSize: 2048,
  channels: 1
});
```

### Méthodes principales

#### startRecording()

```javascript
audio.startRecording(); // Démarre l'enregistrement audio
```

#### stopRecording()

```javascript
audio.stopRecording(); // Arrête l'enregistrement audio
```

#### playFeedback(type)

```javascript
audio.playFeedback('success'); // Joue un son de feedback
```

#### analyzeSpectrum()

```javascript
const spectrum = audio.analyzeSpectrum(); // Analyse le spectre audio
```

#### setProcessingConfig(config)

```javascript
audio.setProcessingConfig({
  noiseGate: { threshold: -50 },
  compression: { ratio: 4 }
}); // Configure le traitement audio
```

## Configuration

### Paramètres de base

```javascript
const config = {
  sampleRate: 44100,    // Taux d'échantillonnage
  bufferSize: 2048,     // Taille du buffer
  channels: 1,          // Nombre de canaux
  bitDepth: 16,         // Profondeur de bits
  fftSize: 2048         // Taille de la FFT pour l'analyse spectrale
};
```

### Configuration ElevenLabs

```javascript
const elevenLabsConfig = {
  API_KEY: 'your-api-key',
  AGENT_ID: 'your-agent-id',
  VOICE_ID: 'your-voice-id',
  MODEL_ID: 'eleven_monolingual_v1',
  STABILITY: 0.5,
  SIMILARITY_BOOST: 0.75,
  STYLE: 0.0,
  USE_SPEAKER_BOOST: true,
  SPEAKING_RATE: 1.0,
  PITCH: 0.0,
  RETRY_ATTEMPTS: 3,
  TIMEOUT: 8000,
  MAX_TEXT_LENGTH: 5000,
  FALLBACK_TO_TTS: true // Enable fallback to standard TTS if agent API fails
};
```

### Paramètres de traitement

```javascript
const processingConfig = {
  noiseGate: {
    threshold: -50,
    attack: 0.01,
    release: 0.1
  },
  compression: {
    threshold: -20,
    ratio: 4,
    attack: 0.003,
    release: 0.25
  },
  equalizer: {
    bands: [
      { frequency: 60, gain: 0 },
      { frequency: 170, gain: 0 },
      { frequency: 310, gain: 0 },
      { frequency: 600, gain: 0 },
      { frequency: 1000, gain: 0 },
      { frequency: 3000, gain: 0 },
      { frequency: 6000, gain: 0 },
      { frequency: 12000, gain: 0 },
      { frequency: 14000, gain: 0 },
      { frequency: 16000, gain: 0 }
    ]
  }
};
```

## Bonnes pratiques

1. **Gestion des permissions**
   - Demander les permissions au bon moment
   - Expliquer clairement l'utilisation
   - Gérer les refus gracieusement

2. **Performance**
   - Optimiser la taille des buffers
   - Gérer efficacement la mémoire
   - Éviter les traitements inutiles

3. **Qualité audio**
   - Maintenir une bonne qualité d'enregistrement
   - Éviter la distorsion
   - Assurer une latence minimale

4. **Gestion des erreurs**
   - Implémenter le fallback TTS
   - Gérer les timeouts
   - Logger les erreurs de manière détaillée

## Dépannage

### Problèmes courants

1. **Problèmes de permissions**
   - Vérifier les paramètres du navigateur
   - S'assurer que le microphone est disponible
   - Gérer les cas de refus

2. **Latence audio**
   - Ajuster la taille du buffer
   - Optimiser le traitement
   - Vérifier les performances système

3. **Qualité audio faible**
   - Vérifier les paramètres du microphone
   - Ajuster les niveaux
   - Optimiser le traitement du signal

4. **Erreurs API ElevenLabs**
   - Vérifier la clé API
   - Vérifier l'ID de l'agent
   - Vérifier les quotas
   - Utiliser le fallback TTS si nécessaire

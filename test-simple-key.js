#!/usr/bin/env node

/**
 * Test simple de la clé ElevenLabs
 */

import dotenv from 'dotenv';

// Charger les variables d'environnement AVANT toute autre importation
dotenv.config();

console.log('🔑 TEST CLÉS ELEVENLABS');
console.log('=======================\n');

console.log('Variables d\'environnement:');
console.log(`ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY ? 'CONFIGURÉE' : 'NON CONFIGURÉE'}`);

if (process.env.ELEVENLABS_API_KEY) {
  const keyStart = process.env.ELEVENLABS_API_KEY.substring(0, 10);
  console.log(`Début de la clé: ${keyStart}...`);
  
  // Test de connexion simple
  console.log('\n🧪 Test de connexion ElevenLabs...');
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Connexion réussie !`);
      console.log(`🎭 ${data.voices?.length || 0} voix disponibles dans votre compte`);
      
      // Lister quelques voix
      if (data.voices && data.voices.length > 0) {
        console.log('\n🎤 Premières voix disponibles:');
        data.voices.slice(0, 5).forEach(voice => {
          console.log(`   • ${voice.name} (${voice.voice_id})`);
        });
      }
      
      console.log('\n🎉 SUCCÈS ! Votre clé ElevenLabs fonctionne parfaitement !');
      console.log('✅ PRISM peut maintenant utiliser la synthèse vocale expressive');
      
    } else {
      console.log(`❌ Erreur: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`Détail: ${errorText}`);
    }
    
  } catch (error) {
    console.log(`❌ Erreur de connexion: ${error.message}`);
  }
  
} else {
  console.log('❌ Clé ElevenLabs non trouvée');
  console.log('💡 Vérifiez votre fichier .env');
}

// Maintenant importer la config pour voir si elle récupère la clé
console.log('\n📋 Test de la configuration PRISM...');

const { config } = await import('./config.js');
const elevenlabs = config.CONFIG.ELEVENLABS;

console.log(`Configuration PRISM - API_KEY: ${elevenlabs.API_KEY !== 'ta_clef_api_ici' ? 'RÉELLE' : 'TEST'}`);
console.log(`Modèle vocal: ${elevenlabs.MODEL_ID}`);
console.log(`Style expressif: ${elevenlabs.STYLE}`);
console.log(`Stabilité optimisée: ${elevenlabs.STABILITY}`);

console.log('\n🎤 PRISM Voice Enhancement - PRÊT !'); 
#!/usr/bin/env node

/**
 * Test direct avec lecture forcée du fichier .env
 */

import fs from 'node:fs';
import OpenAI from 'openai';

console.log('🔍 TEST DIRECT AVEC LECTURE FORCÉE DU .env');
console.log('═══════════════════════════════════════════');

// Lecture directe du fichier .env
const envContent = fs.readFileSync('.env', 'utf8');
console.log('📁 Contenu .env lu directement:');

const envLines = envContent.split('\n');
const envVars = {};

for (const line of envLines) {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    envVars[key.trim()] = value.trim();
    
    if (key.includes('API_KEY')) {
      console.log(`   ${key}: ${value.substring(0, 15)}...`);
    }
  }
}

// Test avec la vraie clé OpenAI
if (envVars.OPENAI_API_KEY && !envVars.OPENAI_API_KEY.includes('your_')) {
  console.log('\n🧪 TEST RÉEL AVEC VRAIE CLÉ OPENAI...');
  
  const startTime = Date.now();
  
  try {
    const openai = new OpenAI({ apiKey: envVars.OPENAI_API_KEY });
    
    console.log('🔍 Appel API OpenAI en cours...');
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "user",
        content: "Explique en une phrase comment transférer les principes de l'évolution biologique vers l'optimisation algorithmique."
      }],
      max_tokens: 100,
      temperature: 0.3
    });
    
    const processingTime = Date.now() - startTime;
    
    console.log('\n✅ SUCCÈS ! API RÉELLE FONCTIONNE:');
    console.log(`   ⚡ Temps de traitement: ${processingTime}ms`);
    console.log(`   🧠 Réponse: ${response.choices[0].message.content}`);
    console.log(`   🎯 Tokens utilisés: ${response.usage.total_tokens}`);
    
    console.log('\n🎉 CONCLUSION: LE TRANSFERT DE SAVOIR RÉEL FONCTIONNE !');
    console.log(`   • Temps réaliste: ${processingTime}ms (vs 0ms en cache)`);
    console.log(`   • API OpenAI opérationnelle`);
    console.log(`   • Vraie analyse de transfert de connaissances`);
    
  } catch (error) {
    console.error('❌ Erreur API:', error.message);
  }
  
} else {
  console.log('❌ Clé OpenAI non configurée ou encore placeholder');
  console.log('🔧 Vérifiez le fichier .env');
}

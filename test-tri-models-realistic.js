#!/usr/bin/env node

/**
 * Test Tri-Modèles Réaliste - Questions variées et spécifiques
 * Validation avec vraies questions business pour voir les différences de réponses
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_BASE = 'http://localhost:3000';
const API_CHAT = `${API_BASE}/api/chat`;

console.log(chalk.blue.bold('🎯 PRISM Test Tri-Modèles - Questions Réalistes\n'));

const responses = [];

async function testRealisticQuestions() {
  const realisticTests = [
    // Questions OpenAI (marketing, finance, email)
    {
      taskType: 'marketing',
      message: 'Je lance une startup d\'IA conversationnelle appelée PRISM. Crée-moi une stratégie marketing complète pour toucher les entreprises tech en 2025.',
      expectedModel: 'OpenAI'
    },
    {
      taskType: 'finance', 
      message: 'Mon entreprise PRISM a généré 250k€ de revenus mais a dépensé 400k€ en R&D cette année. Analyse ma situation financière et recommande des actions.',
      expectedModel: 'OpenAI'
    },
    {
      taskType: 'email',
      message: 'Rédige un email de prospection pour un CEO de Fortune 500 pour lui présenter notre solution IA PRISM. Ton: professionnel mais pas corporate.',
      expectedModel: 'OpenAI'
    },
    
    // Questions Claude (stratégie, analyse, éthique)
    {
      taskType: 'strategie',
      message: 'L\'IA générative transforme le monde du travail. Comment PRISM peut-il éthiquement naviguer entre automatisation et préservation de l\'emploi humain ?',
      expectedModel: 'Claude'
    },
    {
      taskType: 'ethique',
      message: 'Nos modèles IA peuvent influencer les décisions humaines. Quels garde-fous éthiques implémenter pour éviter la manipulation et préserver l\'autonomie ?',
      expectedModel: 'Claude'
    },
    
    // Questions Perplexity (recherche, actualités)
    {
      taskType: 'recherche',
      message: 'Quelles sont les dernières avancées en IA conversationnelle publiées ces 30 derniers jours ? Focus sur les startups européennes.',
      expectedModel: 'Perplexity'
    },
    {
      taskType: 'actualites',
      message: 'Résume-moi les actualités tech les plus importantes de janvier 2025, notamment autour de l\'IA et des levées de fonds.',
      expectedModel: 'Perplexity'
    },
    
    // Question générale pour comparaison
    {
      taskType: 'general',
      message: 'Explique-moi pourquoi les entreprises devraient adopter une solution d\'IA conversationnelle comme PRISM plutôt que ChatGPT classique.',
      expectedModel: 'OpenAI'
    }
  ];

  console.log(chalk.blue('📝 Envoi des questions réalistes...\n'));

  for (let i = 0; i < realisticTests.length; i++) {
    const test = realisticTests[i];
    console.log(chalk.yellow(`🤔 Question ${i+1}/${realisticTests.length}: ${test.taskType.toUpperCase()}`));
    console.log(chalk.gray(`   "${test.message.substring(0, 80)}..."`));
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(API_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: test.message,
          taskType: test.taskType
        })
      });

      const data = await response.json();
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const actualResponse = data.content || 
                             data.response?.choices?.[0]?.message?.content || 
                             data.response?.content?.[0]?.text || 
                             'Réponse non trouvée';
        
        responses.push({
          question: test.message,
          taskType: test.taskType,
          expectedModel: test.expectedModel,
          actualModel: data.metadata?.model || 'unknown',
          fallback: data.metadata?.fallback || false,
          originalModel: data.metadata?.originalModel,
          response: actualResponse,
          duration: duration,
          processingTime: data.metadata?.processingTime
        });
        
        const fallbackText = data.metadata?.fallback ? ` (fallback depuis ${data.metadata?.originalModel})` : '';
        console.log(chalk.green(`   ✅ Répondu en ${duration}ms (traitement: ${data.metadata?.processingTime}ms)`));
        console.log(chalk.cyan(`   🤖 Modèle: ${data.metadata?.model || 'unknown'}${fallbackText}`));
        console.log(chalk.gray(`   📝 Début réponse: "${actualResponse.substring(0, 120)}..."`));
      } else {
        console.log(chalk.red(`   ❌ Erreur: ${data.error}`));
      }
      
    } catch (error) {
      console.log(chalk.red(`   💥 Erreur réseau: ${error.message}`));
    }
    
    console.log(''); // Ligne vide pour lisibilité
    
    // Pause entre requêtes pour éviter rate limiting
    if (i < realisticTests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

function analyzeResponses() {
  console.log(chalk.blue.bold('\n📊 ANALYSE DES RÉPONSES:\n'));
  
  // Statistiques par modèle
  const modelStats = {};
  responses.forEach(r => {
    if (!modelStats[r.actualModel]) {
      modelStats[r.actualModel] = {
        count: 0,
        totalDuration: 0,
        totalProcessing: 0,
        avgLength: 0,
        questions: []
      };
    }
    modelStats[r.actualModel].count++;
    modelStats[r.actualModel].totalDuration += r.duration;
    modelStats[r.actualModel].totalProcessing += r.processingTime || 0;
    modelStats[r.actualModel].avgLength += r.response.length;
    modelStats[r.actualModel].questions.push(r.taskType);
  });
  
  for (const [model, stats] of Object.entries(modelStats)) {
    console.log(chalk.cyan(`🤖 ${model.toUpperCase()}:`));
    console.log(`   📊 Requêtes: ${stats.count}`);
    console.log(`   ⏱️  Durée moyenne: ${Math.round(stats.totalDuration / stats.count)}ms`);
    console.log(`   🔄 Traitement moyen: ${Math.round(stats.totalProcessing / stats.count)}ms`);
    console.log(`   📝 Longueur moyenne: ${Math.round(stats.avgLength / stats.count)} caractères`);
    console.log(`   🎯 Types: ${[...new Set(stats.questions)].join(', ')}`);
    console.log('');
  }
  
  // Vérification différentiation des réponses
  console.log(chalk.blue.bold('🔍 DIFFÉRENTIATION DES RÉPONSES:\n'));
  
  responses.forEach((r, i) => {
    console.log(chalk.yellow(`${i+1}. ${r.taskType} (${r.actualModel}):`));
    console.log(chalk.gray(`   Q: "${r.question.substring(0, 60)}..."`));
    console.log(chalk.green(`   R: "${r.response.substring(0, 150)}..."`));
    console.log('');
  });
  
  // Détection de réponses similaires (potentiel problème)
  const similarities = [];
  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      const r1 = responses[i].response.toLowerCase();
      const r2 = responses[j].response.toLowerCase();
      
      // Simple similarité par mots communs
      const words1 = r1.split(' ').filter(w => w.length > 3);
      const words2 = r2.split(' ').filter(w => w.length > 3);
      const commonWords = words1.filter(w => words2.includes(w));
      const similarity = commonWords.length / Math.max(words1.length, words2.length);
      
      if (similarity > 0.3) { // Plus de 30% de mots communs = suspect
        similarities.push({
          i, j, similarity: Math.round(similarity * 100),
          task1: responses[i].taskType,
          task2: responses[j].taskType
        });
      }
    }
  }
  
  if (similarities.length > 0) {
    console.log(chalk.red.bold('⚠️  RÉPONSES POTENTIELLEMENT TROP SIMILAIRES:'));
    similarities.forEach(s => {
      console.log(chalk.red(`   ${s.task1} vs ${s.task2}: ${s.similarity}% similarité`));
    });
  } else {
    console.log(chalk.green.bold('✅ RÉPONSES BIEN DIFFÉRENCIÉES - Aucune similarité excessive détectée'));
  }
}

// Exécution
async function runRealisticTests() {
  try {
    await testRealisticQuestions();
    analyzeResponses();
    
    console.log(chalk.blue.bold('\n🎯 CONCLUSION:'));
    console.log(chalk.green(`✅ ${responses.length} réponses collectées`));
    console.log(chalk.cyan(`🤖 Modèles utilisés: ${[...new Set(responses.map(r => r.actualModel))].join(', ')}`));
    console.log(chalk.yellow('📝 Analyse de différentiation terminée'));
    
  } catch (error) {
    console.log(chalk.red(`💥 Erreur: ${error.message}`));
  }
}

runRealisticTests().catch(console.error); 
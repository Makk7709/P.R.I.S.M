#!/usr/bin/env node

/**
 * 🎯 PRISM Phase 2 - Script de Démonstration
 * Interface Vocale avec API Tri-Modèles
 */

import { handleUserInstruction } from './backend/orchestrator.js';

// Configuration
const DEMO_SCENARIOS = [
    {
        name: 'Question Générale',
        message: 'Bonjour PRISM, comment ça va ?',
        taskType: 'general',
        expectedModel: 'openai'
    },
    {
        name: 'Stratégie Marketing',
        message: 'Créez une campagne marketing pour notre startup IA',
        taskType: 'marketing',
        expectedModel: 'openai'
    },
    {
        name: 'Analyse Stratégique',
        message: 'Quelle stratégie adopter pour notre expansion internationale ?',
        taskType: 'strategie',
        expectedModel: 'claude'
    },
    {
        name: 'Recherche d\'Actualités',
        message: 'Quelles sont les dernières actualités en intelligence artificielle ?',
        taskType: 'recherche',
        expectedModel: 'perplexity'
    }
];

class Phase2Demo {
    constructor() {
        this.results = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString().substring(11, 19);
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            warning: '\x1b[33m', // Yellow
            error: '\x1b[31m',   // Red
            reset: '\x1b[0m'     // Reset
        };
        
        const color = colors[type] || colors.info;
        console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
    }

    async runScenario(scenario) {
        this.log(`\n🎯 Test: ${scenario.name}`, 'info');
        this.log(`📝 Message: "${scenario.message}"`, 'info');
        this.log(`🎭 Type de tâche: ${scenario.taskType}`, 'info');
        this.log(`🤖 Modèle attendu: ${scenario.expectedModel}`, 'info');
        
        const startTime = Date.now();
        
        try {
            // Appel à l'orchestrateur (simulation API)
            const response = await handleUserInstruction(scenario.message, scenario.taskType);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Extraire le contenu selon le modèle
            let content = '';
            let actualModel = response.metadata?.model || 'unknown';
            
            if (actualModel === 'openai') {
                content = response.data?.choices?.[0]?.message?.content || 
                         response.data?.message?.content ||
                         'Réponse OpenAI reçue';
            } else if (actualModel === 'claude') {
                content = response.data?.content?.[0]?.text ||
                         response.data?.content ||
                         'Réponse Claude reçue';
            } else if (actualModel === 'perplexity') {
                content = response.data?.choices?.[0]?.message?.content ||
                         response.data?.message?.content ||
                         'Réponse Perplexity reçue';
            }
            
            this.log(`✅ Succès en ${duration}ms`, 'success');
            this.log(`🤖 Modèle utilisé: ${actualModel.toUpperCase()}`, 'success');
            
            if (response.metadata?.fallback) {
                this.log(`🔄 Fallback activé: ${response.metadata.originalModel} → ${actualModel}`, 'warning');
            }
            
            // Afficher un extrait de la réponse
            const excerpt = content.substring(0, 100) + (content.length > 100 ? '...' : '');
            this.log(`💬 Réponse: "${excerpt}"`, 'info');
            
            this.results.push({
                scenario: scenario.name,
                success: true,
                duration,
                expectedModel: scenario.expectedModel,
                actualModel,
                fallback: response.metadata?.fallback || false,
                contentLength: content.length
            });
            
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.log(`❌ Échec: ${error.message}`, 'error');
            
            this.results.push({
                scenario: scenario.name,
                success: false,
                duration,
                error: error.message,
                expectedModel: scenario.expectedModel,
                actualModel: null,
                fallback: false
            });
        }
    }

    generateReport() {
        this.log('\n' + '='.repeat(70), 'info');
        this.log('🎯 RAPPORT DE DÉMONSTRATION PHASE 2', 'info');
        this.log('='.repeat(70), 'info');
        
        const successful = this.results.filter(r => r.success).length;
        const total = this.results.length;
        const successRate = ((successful / total) * 100).toFixed(1);
        
        this.log(`📊 Scénarios testés: ${total}`, 'info');
        this.log(`✅ Succès: ${successful}`, 'success');
        this.log(`❌ Échecs: ${total - successful}`, 'error');
        this.log(`🎯 Taux de succès: ${successRate}%`, 'info');
        
        if (successful > 0) {
            const avgDuration = Math.round(
                this.results
                    .filter(r => r.success)
                    .reduce((sum, r) => sum + r.duration, 0) / successful
            );
            this.log(`⏱️  Temps moyen: ${avgDuration}ms`, 'info');
            
            // Statistiques des modèles
            const modelStats = {};
            this.results.filter(r => r.success).forEach(r => {
                modelStats[r.actualModel] = (modelStats[r.actualModel] || 0) + 1;
            });
            
            this.log(`🤖 Utilisation modèles:`, 'info');
            Object.entries(modelStats).forEach(([model, count]) => {
                this.log(`   - ${model.toUpperCase()}: ${count} fois`, 'info');
            });
            
            // Fallbacks
            const fallbacks = this.results.filter(r => r.fallback).length;
            if (fallbacks > 0) {
                this.log(`🔄 Fallbacks activés: ${fallbacks}`, 'warning');
            } else {
                this.log(`🔄 Aucun fallback nécessaire`, 'success');
            }
        }
        
        this.log('\n📋 DÉTAILS PAR SCÉNARIO:', 'info');
        this.results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            const model = result.actualModel ? result.actualModel.toUpperCase() : 'N/A';
            const fallbackText = result.fallback ? ' (Fallback)' : '';
            
            this.log(`${status} ${result.scenario}: ${result.duration}ms - ${model}${fallbackText}`, 
                    result.success ? 'success' : 'error');
            
            if (!result.success) {
                this.log(`   Erreur: ${result.error}`, 'error');
            }
        });
        
        this.log('\n🎉 STATUT PHASE 2:', 'info');
        if (successRate >= 75) {
            this.log(`🚀 Interface vocale avec API tri-modèles OPÉRATIONNELLE !`, 'success');
            this.log(`✅ Prêt pour Phase 3`, 'success');
        } else {
            this.log(`⚠️  Des ajustements sont nécessaires`, 'warning');
        }
        
        this.log('='.repeat(70), 'info');
    }

    async run() {
        console.log('\n🎯 PRISM PHASE 2 - DÉMONSTRATION');
        console.log('Interface Vocale avec API Tri-Modèles');
        console.log('=====================================\n');
        
        this.log('🚀 Démarrage de la démonstration...', 'info');
        this.log('🧪 Test de l\'intégration API tri-modèles', 'info');
        
        // Délai pour l'effet
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Exécuter tous les scénarios
        for (const scenario of DEMO_SCENARIOS) {
            await this.runScenario(scenario);
            
            // Pause entre les scénarios
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Générer le rapport
        this.generateReport();
        
        console.log('\n🎯 Démonstration terminée !');
        console.log('Pour tester l\'interface complète:');
        console.log('1. Démarrez le serveur: node simple-dashboard.js');
        console.log('2. Ouvrez: http://localhost:3000/ui/prismVoiceChatV2.html');
        console.log('3. Ou lancez les tests: ./launch-voice-integration-test.sh\n');
    }
}

// Fonction principale
async function main() {
    try {
        const demo = new Phase2Demo();
        await demo.run();
        
        // Exit avec code de succès si au moins 75% de réussite
        const successRate = (demo.results.filter(r => r.success).length / demo.results.length) * 100;
        process.exit(successRate >= 75 ? 0 : 1);
        
    } catch (error) {
        console.error('❌ Erreur fatale dans la démonstration:', error);
        process.exit(1);
    }
}

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { Phase2Demo }; 
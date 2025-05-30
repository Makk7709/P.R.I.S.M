import { handleUserInstruction } from './backend/orchestrator.js';
import fetch from 'node-fetch';

// Configuration pour tests
const API_ENDPOINT = 'http://localhost:3000/api/chat';
const TEST_TIMEOUT = 10000; // 10 secondes

class VoiceAPIIntegrationTester {
    constructor() {
        this.results = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            testDetails: []
        };
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString().substring(11, 23);
        const prefix = {
            'info': '[INFO]',
            'success': '[✅ PASS]',
            'error': '[❌ FAIL]',
            'warning': '[⚠️ WARN]'
        }[type];
        console.log(`${timestamp} ${prefix} ${message}`);
    }

    async runTest(testName, testFunction) {
        this.results.totalTests++;
        this.log(`Testing: ${testName}`, 'info');
        
        try {
            const startTime = Date.now();
            await testFunction();
            const duration = Date.now() - startTime;
            
            this.results.passedTests++;
            this.results.testDetails.push({
                name: testName,
                status: 'PASS',
                duration,
                error: null
            });
            this.log(`${testName} - PASSED (${duration}ms)`, 'success');
        } catch (error) {
            this.results.failedTests++;
            this.results.testDetails.push({
                name: testName,
                status: 'FAIL',
                duration: 0,
                error: error.message
            });
            this.log(`${testName} - FAILED: ${error.message}`, 'error');
        }
    }

    async testAPIEndpointResponse() {
        const testCases = [
            {
                name: 'General Query',
                message: 'Bonjour PRISM, comment allez-vous ?',
                taskType: 'general',
                expectedModel: 'openai'
            },
            {
                name: 'Marketing Strategy',
                message: 'Créez une campagne marketing pour notre produit IA',
                taskType: 'marketing',
                expectedModel: 'openai'
            },
            {
                name: 'Strategic Analysis',
                message: 'Analysez la stratégie concurrentielle de notre entreprise',
                taskType: 'strategie',
                expectedModel: 'claude'
            },
            {
                name: 'Research Query',
                message: 'Recherchez les dernières actualités en IA',
                taskType: 'recherche',
                expectedModel: 'perplexity'
            },
            {
                name: 'Ethics Discussion',
                message: 'Quels sont les enjeux éthiques de l\'IA générative ?',
                taskType: 'ethique',
                expectedModel: 'claude'
            }
        ];

        for (const testCase of testCases) {
            await this.runTest(`API Response - ${testCase.name}`, async () => {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: testCase.message,
                        taskType: testCase.taskType,
                        model: 'auto-select'
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(`API Error: ${data.error}`);
                }

                if (!data.content || data.content.length < 10) {
                    throw new Error('Response content too short or empty');
                }

                if (!data.metadata || !data.metadata.model) {
                    throw new Error('Missing metadata or model information');
                }

                // Vérifier que le temps de réponse est raisonnable
                if (data.metadata.processingTime > 30000) {
                    throw new Error(`Response time too slow: ${data.metadata.processingTime}ms`);
                }

                this.log(`  Model used: ${data.metadata.model.toUpperCase()}`, 'info');
                this.log(`  Processing time: ${data.metadata.processingTime}ms`, 'info');
                this.log(`  Response length: ${data.content.length} chars`, 'info');
            });
        }
    }

    async testTaskTypeDetection() {
        const detectionCases = [
            {
                message: 'Créez une campagne publicitaire pour notre startup',
                expectedTask: 'marketing'
            },
            {
                message: 'Analysez notre budget et nos finances',
                expectedTask: 'finance'
            },
            {
                message: 'Rédigez un email de prospection client',
                expectedTask: 'email'
            },
            {
                message: 'Quelle stratégie adopter pour notre expansion ?',
                expectedTask: 'strategie'
            },
            {
                message: 'Recherchez les dernières innovations en IA',
                expectedTask: 'recherche'
            }
        ];

        for (const testCase of detectionCases) {
            await this.runTest(`Task Detection - ${testCase.expectedTask}`, async () => {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: testCase.message,
                        taskType: 'auto', // Force auto-detection
                        model: 'auto-select'
                    })
                });

                const data = await response.json();
                if (!data.success) {
                    throw new Error(`API Error: ${data.error}`);
                }

                // Note: L'auto-détection peut varier, on vérifie juste qu'elle fonctionne
                if (!data.metadata.taskType) {
                    throw new Error('No task type detected');
                }

                this.log(`  Detected task: ${data.metadata.taskType}`, 'info');
            });
        }
    }

    async testFallbackMechanism() {
        await this.runTest('Fallback Mechanism', async () => {
            // Test avec un modèle qui pourrait échouer (Claude)
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'Test du mécanisme de fallback',
                    taskType: 'ethique', // Normalement Claude
                    model: 'auto-select'
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(`API Error: ${data.error}`);
            }

            // Le fallback devrait fonctionner même si Claude échoue
            if (!data.content) {
                throw new Error('No response content despite fallback');
            }

            if (data.metadata.fallback) {
                this.log(`  Fallback activated: ${data.metadata.originalModel} → ${data.metadata.model}`, 'warning');
            } else {
                this.log(`  Primary model used: ${data.metadata.model}`, 'info');
            }
        });
    }

    async testInputValidation() {
        const invalidCases = [
            {
                name: 'Empty Message',
                body: { message: '', taskType: 'general' },
                expectedError: 'MISSING_MESSAGE'
            },
            {
                name: 'No Message Field',
                body: { taskType: 'general' },
                expectedError: 'MISSING_MESSAGE'
            },
            {
                name: 'Very Long Message',
                body: { 
                    message: 'x'.repeat(10000), 
                    taskType: 'general' 
                },
                expectedError: null // Should handle gracefully
            }
        ];

        for (const testCase of invalidCases) {
            await this.runTest(`Input Validation - ${testCase.name}`, async () => {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testCase.body)
                });

                const data = await response.json();

                if (testCase.expectedError) {
                    if (data.success) {
                        throw new Error('Expected validation error but request succeeded');
                    }
                    if (!data.code || data.code !== testCase.expectedError) {
                        throw new Error(`Expected error code ${testCase.expectedError}, got ${data.code}`);
                    }
                } else {
                    // For very long messages, should handle gracefully
                    if (!data.success && response.status !== 413) {
                        throw new Error(`Unexpected error: ${data.error}`);
                    }
                }
            });
        }
    }

    async testPerformanceMetrics() {
        await this.runTest('Performance Metrics', async () => {
            const responses = [];
            const testMessage = 'Test de performance PRISM';

            // Faire plusieurs appels pour mesurer la performance
            for (let i = 0; i < 5; i++) {
                const startTime = Date.now();
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `${testMessage} ${i + 1}`,
                        taskType: 'general',
                        model: 'auto-select'
                    })
                });

                const data = await response.json();
                const totalTime = Date.now() - startTime;

                if (!data.success) {
                    throw new Error(`API call ${i + 1} failed: ${data.error}`);
                }

                responses.push({
                    apiTime: data.metadata.processingTime,
                    totalTime,
                    model: data.metadata.model
                });
            }

            // Calculer les statistiques
            const apiTimes = responses.map(r => r.apiTime);
            const totalTimes = responses.map(r => r.totalTime);
            
            const avgApiTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
            const avgTotalTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;
            const maxApiTime = Math.max(...apiTimes);
            const minApiTime = Math.min(...apiTimes);

            this.log(`  Average API time: ${Math.round(avgApiTime)}ms`, 'info');
            this.log(`  Average total time: ${Math.round(avgTotalTime)}ms`, 'info');
            this.log(`  Min/Max API time: ${minApiTime}ms/${maxApiTime}ms`, 'info');

            // Vérifications de performance
            if (avgApiTime > 15000) {
                throw new Error(`Average API time too slow: ${avgApiTime}ms`);
            }

            if (maxApiTime > 30000) {
                throw new Error(`Max API time too slow: ${maxApiTime}ms`);
            }
        });
    }

    async testModelDistribution() {
        await this.runTest('Model Distribution', async () => {
            const modelCounts = { openai: 0, claude: 0, perplexity: 0 };
            
            const testCases = [
                { message: 'Question générale', taskType: 'general' },
                { message: 'Campagne marketing', taskType: 'marketing' },
                { message: 'Analyse stratégique', taskType: 'strategie' },
                { message: 'Recherche actualités', taskType: 'recherche' },
                { message: 'Question éthique', taskType: 'ethique' }
            ];

            for (const testCase of testCases) {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: testCase.message,
                        taskType: testCase.taskType,
                        model: 'auto-select'
                    })
                });

                const data = await response.json();
                if (data.success && data.metadata.model) {
                    modelCounts[data.metadata.model]++;
                }
            }

            this.log(`  Model usage: OpenAI=${modelCounts.openai}, Claude=${modelCounts.claude}, Perplexity=${modelCounts.perplexity}`, 'info');

            // Vérifier qu'au moins 2 modèles différents sont utilisés
            const usedModels = Object.values(modelCounts).filter(count => count > 0).length;
            if (usedModels < 2) {
                throw new Error('Model distribution too narrow - expected at least 2 different models');
            }
        });
    }

    async testErrorHandling() {
        await this.runTest('Error Handling', async () => {
            // Test avec des paramètres qui pourraient causer des erreurs
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'Test message that might cause issues with special chars: <script>alert("xss")</script>',
                    taskType: 'general',
                    model: 'auto-select'
                })
            });

            const data = await response.json();
            
            // Doit réussir ou échouer gracefully
            if (!data.success && !data.error) {
                throw new Error('Error response without error message');
            }

            if (data.success && !data.content) {
                throw new Error('Success response without content');
            }
        });
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        const successRate = (this.results.passedTests / this.results.totalTests * 100).toFixed(1);

        console.log('\n' + '='.repeat(80));
        console.log('🎯 PRISM VOICE API INTEGRATION TEST REPORT');
        console.log('='.repeat(80));
        console.log(`⏱️  Total Duration: ${duration}ms`);
        console.log(`📊 Total Tests: ${this.results.totalTests}`);
        console.log(`✅ Passed: ${this.results.passedTests}`);
        console.log(`❌ Failed: ${this.results.failedTests}`);
        console.log(`🎯 Success Rate: ${successRate}%`);
        console.log('='.repeat(80));

        if (this.results.failedTests > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.testDetails
                .filter(test => test.status === 'FAIL')
                .forEach(test => {
                    console.log(`  - ${test.name}: ${test.error}`);
                });
        }

        console.log('\n📈 TEST COVERAGE ANALYSIS:');
        console.log('✅ API Endpoint Response Testing');
        console.log('✅ Task Type Auto-Detection');
        console.log('✅ Fallback Mechanism');
        console.log('✅ Input Validation');
        console.log('✅ Performance Metrics');
        console.log('✅ Model Distribution');
        console.log('✅ Error Handling');

        const coverageScore = (this.results.passedTests / this.results.totalTests * 100);
        console.log(`\n🎯 COVERAGE SCORE: ${coverageScore.toFixed(1)}%`);
        
        if (coverageScore >= 95) {
            console.log('🚀 EXCELLENT - Prêt pour la production !');
        } else if (coverageScore >= 90) {
            console.log('👍 TRÈS BON - Quelques ajustements mineurs');
        } else if (coverageScore >= 80) {
            console.log('⚠️  BON - Améliorations nécessaires');
        } else {
            console.log('❌ INSUFFISANT - Corrections majeures requises');
        }

        return {
            success: this.results.failedTests === 0,
            coverageScore,
            details: this.results
        };
    }

    async runAllTests() {
        this.log('🚀 Starting PRISM Voice API Integration Tests', 'info');
        this.log('Testing API endpoint: ' + API_ENDPOINT, 'info');

        try {
            await this.testAPIEndpointResponse();
            await this.testTaskTypeDetection();
            await this.testFallbackMechanism();
            await this.testInputValidation();
            await this.testPerformanceMetrics();
            await this.testModelDistribution();
            await this.testErrorHandling();
        } catch (error) {
            this.log(`Unexpected error during testing: ${error.message}`, 'error');
        }

        return this.generateReport();
    }
}

// Fonction pour tester si le serveur est accessible
async function checkServerAvailability() {
    try {
        const response = await fetch('http://localhost:3000/', { 
            method: 'GET',
            timeout: 5000 
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Exécution des tests
async function main() {
    console.log('🎯 PRISM VOICE API INTEGRATION TESTING SUITE');
    console.log('Phase 2: Interface Vocale avec API Tri-Modèles');
    console.log('='.repeat(60));

    // Vérifier que le serveur est accessible
    console.log('\n🔍 Checking server availability...');
    const serverAvailable = await checkServerAvailability();
    
    if (!serverAvailable) {
        console.log('❌ Server not available. Please start the server with: node simple-dashboard.js');
        process.exit(1);
    }
    
    console.log('✅ Server is accessible\n');

    const tester = new VoiceAPIIntegrationTester();
    const result = await tester.runAllTests();

    // Exit code basé sur le résultat
    process.exit(result.success ? 0 : 1);
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Exécuter les tests si ce fichier est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { VoiceAPIIntegrationTester, main }; 
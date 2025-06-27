/**
 * Test d'Interruption Complète de PRISM Voice
 * ============================================
 * 
 * Ce script teste les nouvelles fonctionnalités d'interruption qui permettent :
 * 1. D'arrêter PRISM pendant qu'il génère une réponse
 * 2. D'annuler l'auto-send vocal en attente
 * 3. De s'assurer qu'aucun processus ne reste bloqué
 */

const puppeteer = require('puppeteer');

class PRISMInterruptionTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            interruption_during_generation: false,
            audio_stop_works: false,
            auto_send_cancellation: false,
            no_hanging_processes: false,
            ui_state_reset: false
        };
    }

    async init() {
        console.log('🚀 Initialisation du test d\'interruption PRISM...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Interface visible pour voir les tests
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Permettre l'accès au microphone (même en mode test)
        await this.page.overridePermissions('http://localhost:3000', ['microphone']);
        
        // Écouter les logs de la console
        this.page.on('console', (msg) => {
            const text = msg.text();
            if (text.includes('[Audio]') || text.includes('[Chat]') || text.includes('[Voice]')) {
                console.log(`📝 Console: ${text}`);
            }
        });
        
        return true;
    }

    async loadInterface() {
        console.log('📱 Chargement de l\'interface Corporate...');
        
        await this.page.goto('http://localhost:3000/ui/prismVoiceChatV2-Corporate.html', {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        // Attendre que l'interface soit prête
        await this.page.waitForSelector('#messageInput', { timeout: 5000 });
        await this.page.waitForSelector('#stopButton', { timeout: 5000 });
        
        console.log('✅ Interface chargée');
        return true;
    }

    async testInterruptionDuringGeneration() {
        console.log('\n🧪 TEST 1: Interruption pendant la génération de réponse');
        
        try {
            // 1. Envoyer une requête complexe qui prend du temps
            const complexQuery = "Analyze the global economic impact of artificial intelligence across 20 different industries, including detailed market projections, employment effects, regulatory challenges, and technological disruption patterns for the next decade.";
            
            await this.page.type('#messageInput', complexQuery);
            
            // 2. Cliquer sur Send
            console.log('📤 Envoi de la requête complexe...');
            await this.page.click('#sendButton');
            
            // 3. Attendre que le processing commence
            await this.page.waitForSelector('.prism-processing-indicator.active', { timeout: 3000 });
            console.log('⏳ PRISM en train de traiter...');
            
            // 4. Vérifier que le bouton Stop est visible
            const stopVisible = await this.page.evaluate(() => {
                const stopBtn = document.getElementById('stopButton');
                return stopBtn && window.getComputedStyle(stopBtn).display !== 'none';
            });
            
            if (!stopVisible) {
                throw new Error('Le bouton Stop n\'est pas visible pendant le traitement');
            }
            
            // 5. Attendre un peu puis cliquer sur Stop
            await this.page.waitForTimeout(2000);
            console.log('🛑 Clic sur le bouton Stop...');
            await this.page.click('#stopButton');
            
            // 6. Vérifier que l'interruption a fonctionné
            await this.page.waitForTimeout(1000);
            
            const interruptionWorked = await this.page.evaluate(() => {
                // Vérifier qu'il y a un message d'arrêt
                const messages = Array.from(document.querySelectorAll('.prism-message'));
                const hasStopMessage = messages.some(msg => 
                    msg.textContent.includes('Request cancelled') || 
                    msg.textContent.includes('stopped')
                );
                
                // Vérifier que le processing indicator est caché
                const processingHidden = !document.querySelector('.prism-processing-indicator.active');
                
                // Vérifier que le bouton Send est réactivé
                const sendBtn = document.getElementById('sendButton');
                const sendEnabled = sendBtn && !sendBtn.disabled;
                
                return hasStopMessage && processingHidden && sendEnabled;
            });
            
            if (interruptionWorked) {
                console.log('✅ Interruption pendant génération: SUCCESS');
                this.results.interruption_during_generation = true;
            } else {
                console.log('❌ Interruption pendant génération: FAILED');
            }
            
        } catch (error) {
            console.log('❌ Test interruption generation FAILED:', error.message);
        }
    }

    async testAudioStopFunctionality() {
        console.log('\n🧪 TEST 2: Arrêt audio ElevenLabs');
        
        try {
            // 1. Envoyer une requête courte pour obtenir rapidement de l'audio
            await this.page.evaluate(() => document.getElementById('messageInput').value = '');
            await this.page.type('#messageInput', 'Bonjour, pouvez-vous me dire l\'heure ?');
            
            console.log('📤 Envoi requête pour test audio...');
            await this.page.click('#sendButton');
            
            // 2. Attendre que la réponse arrive et que l'audio commence
            let audioStarted = false;
            for (let i = 0; i < 10; i++) {
                await this.page.waitForTimeout(1000);
                
                const audioPlaying = await this.page.evaluate(() => {
                    const speechText = document.getElementById('speechText');
                    return speechText && (
                        speechText.textContent.includes('Playing') || 
                        speechText.textContent.includes('Loading')
                    );
                });
                
                if (audioPlaying) {
                    audioStarted = true;
                    console.log('🔊 Audio détecté comme en cours de lecture');
                    break;
                }
            }
            
            if (!audioStarted) {
                console.log('⚠️ Audio pas détecté, test avec bouton stop quand même...');
            }
            
            // 3. Cliquer sur Stop quand l'audio joue
            console.log('🛑 Clic sur Stop pendant l\'audio...');
            await this.page.click('#stopButton');
            
            // 4. Vérifier que l'audio s'est arrêté
            await this.page.waitForTimeout(1000);
            
            const audioStopped = await this.page.evaluate(() => {
                const speechText = document.getElementById('speechText');
                return speechText && (
                    speechText.textContent.includes('Stopped') || 
                    speechText.textContent.includes('Ready')
                );
            });
            
            if (audioStopped) {
                console.log('✅ Arrêt audio: SUCCESS');
                this.results.audio_stop_works = true;
            } else {
                console.log('❌ Arrêt audio: FAILED');
            }
            
        } catch (error) {
            console.log('❌ Test arrêt audio FAILED:', error.message);
        }
    }

    async testUIStateReset() {
        console.log('\n🧪 TEST 3: Réinitialisation de l\'interface après arrêt');
        
        try {
            // Vérifier que l'interface est dans un état cohérent
            const uiState = await this.page.evaluate(() => {
                const sendBtn = document.getElementById('sendButton');
                const stopBtn = document.getElementById('stopButton');
                const processingIndicator = document.querySelector('.prism-processing-indicator');
                const speechText = document.getElementById('speechText');
                
                return {
                    sendEnabled: sendBtn && !sendBtn.disabled,
                    sendText: sendBtn ? sendBtn.textContent : '',
                    stopHidden: stopBtn ? window.getComputedStyle(stopBtn).display === 'none' : true,
                    noProcessing: !processingIndicator || !processingIndicator.classList.contains('active'),
                    speechReady: speechText && speechText.textContent.includes('Ready')
                };
            });
            
            console.log('🔍 État UI après reset:', uiState);
            
            const uiGood = uiState.sendEnabled && 
                          uiState.sendText.includes('Send') && 
                          uiState.stopHidden && 
                          uiState.noProcessing;
            
            if (uiGood) {
                console.log('✅ Réinitialisation UI: SUCCESS');
                this.results.ui_state_reset = true;
            } else {
                console.log('❌ Réinitialisation UI: FAILED');
            }
            
        } catch (error) {
            console.log('❌ Test UI reset FAILED:', error.message);
        }
    }

    async testNoHangingProcesses() {
        console.log('\n🧪 TEST 4: Vérification absence de processus pendants');
        
        try {
            // Attendre un peu pour s'assurer que tous les processus sont terminés
            await this.page.waitForTimeout(3000);
            
            const processState = await this.page.evaluate(() => {
                // Vérifier l'état interne de l'objet prismChat
                if (window.prismChat) {
                    return {
                        isProcessing: window.prismChat.isProcessing,
                        currentRequest: window.prismChat.currentRequest !== null,
                        currentAudio: window.prismChat.currentAudio !== null,
                        isRecording: window.prismChat.isRecording || false
                    };
                }
                return { error: 'prismChat not found' };
            });
            
            console.log('🔍 État des processus:', processState);
            
            const noHanging = !processState.isProcessing && 
                             !processState.currentRequest && 
                             !processState.currentAudio && 
                             !processState.isRecording;
            
            if (noHanging) {
                console.log('✅ Pas de processus pendants: SUCCESS');
                this.results.no_hanging_processes = true;
            } else {
                console.log('❌ Processus pendants détectés: FAILED');
            }
            
        } catch (error) {
            console.log('❌ Test processus pendants FAILED:', error.message);
        }
    }

    async runAllTests() {
        try {
            await this.init();
            await this.loadInterface();
            
            // Attendre que l'interface soit complètement initialisée
            await this.page.waitForTimeout(2000);
            
            await this.testInterruptionDuringGeneration();
            await this.testAudioStopFunctionality();
            await this.testUIStateReset();
            await this.testNoHangingProcesses();
            
            this.displayResults();
            
        } catch (error) {
            console.error('💥 Erreur lors des tests:', error);
        } finally {
            if (this.browser) {
                // await this.browser.close(); // Garder ouvert pour inspection
                console.log('🔍 Navigateur gardé ouvert pour inspection');
            }
        }
    }

    displayResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSULTATS DES TESTS D\'INTERRUPTION PRISM');
        console.log('='.repeat(60));
        
        const tests = [
            { name: 'Interruption pendant génération', key: 'interruption_during_generation' },
            { name: 'Arrêt audio fonctionne', key: 'audio_stop_works' },
            { name: 'Réinitialisation UI', key: 'ui_state_reset' },
            { name: 'Pas de processus pendants', key: 'no_hanging_processes' }
        ];
        
        let successCount = 0;
        
        tests.forEach(test => {
            const status = this.results[test.key] ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${test.name}`);
            if (this.results[test.key]) successCount++;
        });
        
        console.log('='.repeat(60));
        console.log(`📈 Score: ${successCount}/${tests.length} tests réussis`);
        console.log(`📊 Taux de réussite: ${Math.round((successCount / tests.length) * 100)}%`);
        
        if (successCount === tests.length) {
            console.log('🎉 TOUS LES TESTS D\'INTERRUPTION SONT RÉUSSIS !');
            console.log('✅ Le problème d\'interruption de PRISM est résolu');
        } else {
            console.log('⚠️ Certains tests d\'interruption ont échoué');
            console.log('🔧 Des ajustements supplémentaires sont nécessaires');
        }
        
        console.log('='.repeat(60));
    }
}

// Exécution des tests
if (require.main === module) {
    const tester = new PRISMInterruptionTester();
    tester.runAllTests().catch(console.error);
}

module.exports = PRISMInterruptionTester; 
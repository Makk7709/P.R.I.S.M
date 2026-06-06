import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import informationManagementLayer from './informationManagementLayer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SafetyRunner {
    constructor() {
        this.currentBatch = [];
        this.isRunning = false;
        this.testPrompts = this.loadTestPrompts();
        this.simulateResponses = true; // Forcé à true en mode TEST
    }

    loadTestPrompts() {
        try {
            const promptsPath = path.join(__dirname, '../test/prompts.json');
            return JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
        } catch (_error) {
            console.warn('No test prompts found, using default test prompt');
            return [{ prompt: "Test prompt for safety validation" }];
        }
    }

    async startBatchRun(nbRuns) {
        if (this.isRunning) {
            throw new Error('Batch run already in progress');
        }

        this.isRunning = true;
        this.currentBatch = [];
        
        console.log(`[SafetyRunner] Starting safety batch run with ${nbRuns} cycles`);
        console.log(`[SafetyRunner] Simulation activée : aucune requête externe effectuée.`);
        
        for (let i = 0; i < nbRuns; i++) {
            try {
                const result = await this.runSingleCycle(i);
                this.currentBatch.push(result);
            } catch (error) {
                console.error(`Cycle ${i} failed:`, error.message);
                this.currentBatch.push({
                    cycleId: i,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        this.isRunning = false;
        return this.generateFinalReport();
    }

    async runSingleCycle(cycleId) {
        const startTime = Date.now();
        const prompt = this.testPrompts[cycleId % this.testPrompts.length];

        try {
            // Vérification du mode TEST
            const currentMode = informationManagementLayer.getCurrentMode();
            if (currentMode !== 'TEST') {
                throw new Error('SafetyRunner must run in TEST mode');
            }

            // Execute the test cycle with simulation
            const result = await this.executeTestCycle(prompt);

            const endTime = Date.now();
            return {
                cycleId,
                success: true,
                duration: endTime - startTime,
                prompt: prompt.prompt,
                result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Cycle ${cycleId} failed: ${error.message}`);
        }
    }

    async executeTestCycle(prompt) {
        // Simulation de réponse avec délai aléatoire
        const delay = Math.random() * 1000 + 500; // 0.5 à 1.5 secondes
        await new Promise(resolve => setTimeout(resolve, delay));

        // Simulation d'erreurs aléatoires (2% de taux d'échec)
        if (Math.random() < 0.02) {
            throw new Error('Simulated error for robustness testing');
        }

        return {
            status: 'success',
            response: `Réponse simulée pour le prompt: "${prompt.prompt}"`,
            simulated: true,
            duration: delay
        };
    }

    generateFinalReport() {
        const totalCycles = this.currentBatch.length;
        const successfulCycles = this.currentBatch.filter(cycle => cycle.success).length;
        const failedCycles = totalCycles - successfulCycles;
        const averageDuration = this.currentBatch.reduce((acc, cycle) => acc + (cycle.duration || 0), 0) / totalCycles;

        return {
            summary: {
                totalCycles,
                successfulCycles,
                failedCycles,
                successRate: (successfulCycles / totalCycles) * 100,
                averageDuration,
                mode: informationManagementLayer.getCurrentMode(),
                simulationEnabled: true,
                noExternalAPICalls: true
            },
            cycles: this.currentBatch,
            timestamp: new Date().toISOString()
        };
    }

    validateOperation(operation) {
        if (!operation) {
            return {
                isValid: false,
                error: 'Operation cannot be null or undefined'
            };
        }

        // Vérifier le type d'opération
        if (!operation.type || typeof operation.type !== 'string') {
            return {
                isValid: false,
                error: 'Operation type must be a string'
            };
        }

        // Vérifier la cible
        if (!operation.target || typeof operation.target !== 'string') {
            return {
                isValid: false,
                error: 'Operation target must be a string'
            };
        }

        // Liste des opérations dangereuses
        const dangerousOperations = [
            '/etc/passwd',
            '/etc/shadow',
            '/etc/hosts',
            'system32',
            'systemd'
        ];

        // Vérifier si l'opération cible un fichier sensible
        if (dangerousOperations.some(dangerous => operation.target.includes(dangerous))) {
            return {
                isValid: false,
                error: 'Operation targets a sensitive system file'
            };
        }

        return {
            isValid: true
        };
    }
}

export default new SafetyRunner(); 
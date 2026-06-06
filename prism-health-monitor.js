#!/usr/bin/env node

/**
 * 🔍 PRISM Health Monitor
 * Surveillance continue de l'état de l'application
 * Durée : Contrôle permanent | Risque : MINIMAL
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

class PrismHealthMonitor {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.results = {
            homepage: false,
            investor: false,
            api: false,
            voiceApi: false,
            metrics: false
        };
        this.startTime = Date.now();
    }

    async checkEndpoint(name, url, expectedStatus = 200) {
        try {
            const response = await fetch(url, { timeout: 5000 });
            const success = response.status === expectedStatus;
            
            console.log(success 
                ? chalk.green(`✅ ${name}: OK (${response.status})`)
                : chalk.red(`❌ ${name}: FAIL (${response.status})`)
            );
            
            return success;
        } catch (error) {
            console.log(chalk.red(`❌ ${name}: ERROR - ${error.message}`));
            return false;
        }
    }

    async checkJsonApi(name, url) {
        try {
            const response = await fetch(url, { timeout: 5000 });
            const data = await response.json();
            const success = data.success === true;
            
            console.log(success 
                ? chalk.green(`✅ ${name}: OK (JSON valid)`)
                : chalk.red(`❌ ${name}: FAIL (JSON invalid)`)
            );
            
            return success;
        } catch (error) {
            console.log(chalk.red(`❌ ${name}: ERROR - ${error.message}`));
            return false;
        }
    }

    async runFullCheck() {
        console.log(chalk.cyan(`\n🔍 PRISM HEALTH CHECK - ${  new Date().toLocaleTimeString()}`));
        console.log(chalk.cyan('=' .repeat(50)));

        // Vérifications critiques
        this.results.homepage = await this.checkEndpoint(
            'Page d\'accueil', 
            `${this.baseUrl}/`
        );
        
        this.results.investor = await this.checkEndpoint(
            'Dashboard Investisseur', 
            `${this.baseUrl}/investor`
        );
        
        this.results.metrics = await this.checkJsonApi(
            'API Métriques', 
            `${this.baseUrl}/api/metrics`
        );
        
        this.results.voiceApi = await this.checkEndpoint(
            'API Test Vocal', 
            `${this.baseUrl}/api/test-voice`
        );

        // Test API Chat (POST)
        try {
            const chatResponse = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'test health check' }),
                timeout: 10000
            });
            
            this.results.api = chatResponse.status === 200;
            console.log(this.results.api 
                ? chalk.green('✅ API Chat: OK')
                : chalk.red(`❌ API Chat: FAIL (${chatResponse.status})`)
            );
        } catch (error) {
            this.results.api = false;
            console.log(chalk.red(`❌ API Chat: ERROR - ${error.message}`));
        }

        // Résumé
        const totalChecks = Object.keys(this.results).length;
        const passedChecks = Object.values(this.results).filter(Boolean).length;
        const healthScore = Math.round((passedChecks / totalChecks) * 100);
        
        console.log(chalk.cyan('\n📊 RÉSUMÉ'));
        console.log(`Score de santé: ${healthScore >= 80 ? chalk.green(`${healthScore  }%`) : chalk.red(`${healthScore  }%`)}`);
        console.log(`Tests réussis: ${passedChecks}/${totalChecks}`);
        
        if (healthScore === 100) {
            console.log(chalk.green('\n🎉 SYSTÈME ENTIÈREMENT OPÉRATIONNEL'));
            console.log(chalk.green('✨ Toutes les fonctionnalités sont accessibles'));
        } else if (healthScore >= 80) {
            console.log(chalk.yellow('\n⚠️ SYSTÈME PARTIELLEMENT OPÉRATIONNEL'));
            console.log(chalk.yellow('🔧 Quelques problèmes mineurs détectés'));
        } else {
            console.log(chalk.red('\n🚨 SYSTÈME EN PANNE'));
            console.log(chalk.red('⚡ Intervention requise'));
        }

        console.log(chalk.cyan('\n🔗 LIENS RAPIDES:'));
        console.log(`📱 Page d'accueil: ${this.baseUrl}/`);
        console.log(`💼 Dashboard Investisseur: ${this.baseUrl}/investor`);
        console.log(`🎤 Interface Vocale V2: ${this.baseUrl}/ui/prismVoiceChatV2.html`);
        
        return healthScore;
    }

    async runContinuousMonitoring(intervalMinutes = 5) {
        console.log(chalk.blue(`🔄 Monitoring continu activé (${intervalMinutes} min)`));
        
        while (true) {
            await this.runFullCheck();
            console.log(chalk.gray(`⏰ Prochaine vérification dans ${intervalMinutes} minutes...\n`));
            await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
        }
    }
}

// Exécution
const monitor = new PrismHealthMonitor();

const args = process.argv.slice(2);
if (args.includes('--continuous')) {
    const interval = parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 5;
    monitor.runContinuousMonitoring(interval);
} else {
    monitor.runFullCheck().then(score => {
        process.exit(score === 100 ? 0 : 1);
    });
} 
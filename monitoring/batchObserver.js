import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import selfMonitor from './selfMonitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BatchObserver {
    constructor() {
        this.logDir = path.join(__dirname, '../logs/selfimprovement');
        this.ensureLogDirectory();
        this.currentBatch = null;
        this.batchStartTime = null;
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    startBatch(batchId) {
        this.currentBatch = {
            id: batchId,
            startTime: new Date().toISOString(),
            runs: [],
            metrics: {
                totalRuns: 0,
                successfulRuns: 0,
                failedRuns: 0,
                averageResponseTime: 0,
                errorTypes: {},
                criticalAnomalies: []
            }
        };
        this.batchStartTime = Date.now();
        
        // Clear previous results in selfMonitor
        selfMonitor.clearResults();
    }

    recordRun(runResult) {
        if (!this.currentBatch) {
            throw new Error('No active batch');
        }

        this.currentBatch.runs.push(runResult);
        this.updateMetrics(runResult);

        // Record errors in selfMonitor if the run failed
        if (!runResult.success) {
            selfMonitor.recordError('batch_run_error', {
                message: runResult.error,
                batchId: this.currentBatch.id,
                runIndex: runResult.index
            });
        }
    }

    updateMetrics(runResult) {
        const metrics = this.currentBatch.metrics;
        metrics.totalRuns++;
        
        if (runResult.success) {
            metrics.successfulRuns++;
        } else {
            metrics.failedRuns++;
            const errorType = runResult.error.split(':')[0] || 'Unknown';
            metrics.errorTypes[errorType] = (metrics.errorTypes[errorType] || 0) + 1;
        }

        // Update average response time
        const totalTime = metrics.averageResponseTime * (metrics.totalRuns - 1) + (runResult.responseTime || 0);
        metrics.averageResponseTime = totalTime / metrics.totalRuns;

        // Check for critical anomalies
        if (runResult.responseTime > 1000) { // 1 second threshold
            metrics.criticalAnomalies.push({
                type: 'duration_exceeded',
                runIndex: runResult.index,
                duration: runResult.responseTime
            });
        }
    }

    endBatch() {
        if (!this.currentBatch) {
            throw new Error('No active batch');
        }

        const batchDuration = Date.now() - this.batchStartTime;
        const finalMetrics = {
            ...this.currentBatch.metrics,
            batchDuration,
            endTime: new Date().toISOString(),
            successRate: (this.currentBatch.metrics.successfulRuns / this.currentBatch.metrics.totalRuns) * 100
        };

        this.saveBatchResults(finalMetrics);
        this.currentBatch = null;
        this.batchStartTime = null;

        return finalMetrics;
    }

    saveBatchResults(metrics) {
        const resultsFile = path.join(this.logDir, 'batch_results.json');
        let allResults = [];
        
        if (fs.existsSync(resultsFile)) {
            allResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        }
        
        allResults.push(metrics);
        fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
    }

    analyzeBatchPerformance(batchId) {
        const resultsFile = path.join(this.logDir, 'batch_results.json');
        if (!fs.existsSync(resultsFile)) {
            return null;
        }

        const allResults = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        const batchResults = allResults.find(b => b.id === batchId);
        
        if (!batchResults) {
            return null;
        }

        return {
            ...batchResults,
            analysis: {
                performanceScore: this.calculatePerformanceScore(batchResults),
                stabilityScore: this.calculateStabilityScore(batchResults),
                recommendations: this.generateRecommendations(batchResults)
            }
        };
    }

    calculatePerformanceScore(metrics) {
        const weights = {
            successRate: 0.4,
            averageResponseTime: 0.3,
            criticalAnomalies: 0.3
        };

        const successScore = metrics.successRate;
        const responseTimeScore = Math.max(0, 100 - (metrics.averageResponseTime / 10));
        const anomalyScore = Math.max(0, 100 - (metrics.criticalAnomalies.length * 10));

        return (
            successScore * weights.successRate +
            responseTimeScore * weights.averageResponseTime +
            anomalyScore * weights.criticalAnomalies
        );
    }

    calculateStabilityScore(metrics) {
        const errorRate = metrics.failedRuns / metrics.totalRuns;
        return Math.max(0, 100 - (errorRate * 100));
    }

    generateRecommendations(metrics) {
        const recommendations = [];

        if (metrics.successRate < 90) {
            recommendations.push({
                type: 'success_rate',
                priority: 'high',
                message: 'Improve error handling and recovery mechanisms'
            });
        }

        if (metrics.averageResponseTime > 500) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Optimize response time and reduce processing overhead'
            });
        }

        if (metrics.criticalAnomalies.length > 0) {
            recommendations.push({
                type: 'stability',
                priority: 'high',
                message: 'Address critical anomalies and implement better error boundaries'
            });
        }

        return recommendations;
    }
}

const batchObserver = new BatchObserver();
export default batchObserver; 
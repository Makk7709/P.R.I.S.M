import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SelfMonitor {
    constructor() {
        this.results = [];
        this.errors = [];
        this.logDir = path.join(__dirname, '../logs/selfmonitor');
        this.batchLogDir = path.join(__dirname, '../logs/selfimprovement');
        this.ensureLogDirectories();
    }

    ensureLogDirectories() {
        [this.logDir, this.batchLogDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    recordError(errorType, error) {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            type: errorType,
            message: error.message || error,
            stack: error.stack,
            errorType: error.name || 'UnknownError'
        };
        
        this.errors.push(errorRecord);
        this.logError(errorRecord);
        return errorRecord;
    }

    logError(errorRecord) {
        const logFile = path.join(this.logDir, `errors_${new Date().toISOString().split('T')[0]}.json`);
        let errors = [];
        
        try {
            if (fs.existsSync(logFile)) {
                errors = JSON.parse(fs.readFileSync(logFile, 'utf8'));
            }
            
            errors.push(errorRecord);
            fs.writeFileSync(logFile, JSON.stringify(errors, null, 2));
        } catch (err) {
            console.error('Failed to log error:', err);
            // Fallback to console logging if file operations fail
            console.error('Error record:', errorRecord);
        }
    }

    recordRunResult(result) {
        this.results.push(result);
        this.logResult(result);
    }

    logResult(result) {
        const logFile = path.join(this.batchLogDir, `batch_results.json`);
        let results = [];
        
        if (fs.existsSync(logFile)) {
            results = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        }
        
        results.push(result);
        fs.writeFileSync(logFile, JSON.stringify(results, null, 2));
    }

    analyzeBatch() {
        if (this.results.length === 0) {
            return {
                status: 'no_data',
                message: 'No results to analyze'
            };
        }

        const analysis = {
            totalRuns: this.results.length,
            successfulRuns: this.results.filter(r => r.success).length,
            failedRuns: this.results.filter(r => !r.success).length,
            averageDuration: this.calculateAverageDuration(),
            criticalAnomalies: this.detectCriticalAnomalies(),
            errorTypes: this.analyzeErrorTypes(),
            timestamp: new Date().toISOString()
        };

        this.generateReport(analysis);
        return analysis;
    }

    calculateAverageDuration() {
        const successfulRuns = this.results.filter(r => r.success);
        if (successfulRuns.length === 0) return 0;
        
        const totalDuration = successfulRuns.reduce((sum, run) => sum + (run.responseTime || 0), 0);
        return totalDuration / successfulRuns.length;
    }

    detectCriticalAnomalies() {
        const anomalies = [];
        const DURATION_THRESHOLD = 1000; // 1 second

        this.results.forEach(result => {
            if (result.responseTime > DURATION_THRESHOLD) {
                anomalies.push({
                    type: 'duration_exceeded',
                    index: result.index,
                    duration: result.responseTime,
                    threshold: DURATION_THRESHOLD
                });
            }

            if (!result.success) {
                anomalies.push({
                    type: 'failure',
                    index: result.index,
                    error: result.error
                });
            }
        });

        return anomalies;
    }

    analyzeErrorTypes() {
        const errorTypes = {};
        this.results.forEach(result => {
            if (!result.success) {
                const errorType = result.error.split(':')[0] || 'Unknown';
                errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
            }
        });
        return errorTypes;
    }

    generateReport(analysis) {
        const reportPath = path.join(this.batchLogDir, `batch_analysis_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
    }

    clearResults() {
        this.results = [];
        this.errors = [];
    }
}

export default SelfMonitor; 
const { LogSummary, LOG_LEVELS } = require('../evolution/logSummary');
const { validatePerplexityResponse, qualityCheckPerplexityResponse } = require('../prismValidator');
const { MetricsTimer } = require('../evolution/metricsTimer');

describe('PRISM End-to-End Integration Test', () => {
    let logSummary;
    let metricsTimer;

    beforeEach(() => {
        logSummary = new LogSummary();
        metricsTimer = new MetricsTimer();
    });

    it('should complete a full PRISM cycle with proper logging and metrics', async () => {
        // Simulate a prompt
        const testPrompt = {
            text: "What is the capital of France?",
            context: "Geography quiz",
            timestamp: new Date().toISOString()
        };

        // Start timing
        metricsTimer.startTimer();

        // Simulate response from Perplexity
        const mockResponse = {
            text: "The capital of France is Paris.",
            confidence: 0.95,
            sources: ["https://en.wikipedia.org/wiki/Paris"],
            timestamp: new Date().toISOString()
        };

        // Validate response
        const validationResult = await validatePerplexityResponse(mockResponse);
        expect(validationResult.isValid).toBe(true);

        // Quality check
        const qualityResult = await qualityCheckPerplexityResponse(mockResponse);
        expect(qualityResult.passed).toBe(true);

        // End timing
        const duration = metricsTimer.endTimer();
        expect(typeof duration).toBe('number');
        expect(duration).toBeGreaterThan(0);

        // Log the cycle with duration
        logSummary.logCycle({
            prompt: testPrompt,
            response: mockResponse,
            validation: validationResult,
            quality: qualityResult,
            duration: duration
        });

        // Verify log summary
        const summary = logSummary.getSummary();
        expect(summary).toHaveProperty('cycles');
        expect(summary.cycles).toHaveLength(1);
        expect(summary.cycles[0]).toHaveProperty('duration');
        expect(summary.cycles[0].duration).toBe(duration);
    });

    it('should handle invalid responses appropriately', async () => {
        const invalidResponse = {
            text: "",
            confidence: 0.1,
            sources: [],
            timestamp: new Date().toISOString()
        };

        const validationResult = await validatePerplexityResponse(invalidResponse);
        expect(validationResult.isValid).toBe(false);

        const qualityResult = await qualityCheckPerplexityResponse(invalidResponse);
        expect(qualityResult.passed).toBe(false);

        logSummary.logCycle({
            prompt: { text: "Test prompt" },
            response: invalidResponse,
            validation: validationResult,
            quality: qualityResult,
            duration: 0
        });

        const summary = logSummary.getSummary();
        expect(summary.cycles[0].validation.isValid).toBe(false);
    });

    it('should respect log levels', () => {
        // Test DEBUG level
        logSummary.setLogLevel('DEBUG');
        logSummary.logCycle({
            prompt: { text: "Debug test" },
            response: { text: "Debug response" },
            validation: { isValid: true },
            quality: { passed: true },
            duration: 100
        });

        // Test INFO level
        logSummary.setLogLevel('INFO');
        logSummary.logCycle({
            prompt: { text: "Info test" },
            response: { text: "Info response" },
            validation: { isValid: true },
            quality: { passed: true },
            duration: 200
        });

        // Test WARNING level
        logSummary.setLogLevel('WARNING');
        logSummary.logWarning("Test warning", { context: "test" });

        // Test ERROR level
        logSummary.setLogLevel('ERROR');
        logSummary.logError(new Error("Test error"), { context: "test" });

        const summary = logSummary.getSummary();
        expect(summary.cycles).toHaveLength(2); // Only DEBUG and INFO cycles should be logged
        expect(summary.logLevel).toBe('ERROR');
    });
}); 
import batchObserver from '../monitoring/batchObserver.js';
import selfMonitor from '../monitoring/selfMonitor.js';

async function simulateBatch() {
    const batchId = `batch_${Date.now()}`;
    console.log(`Starting batch ${batchId}`);
    
    batchObserver.startBatch(batchId);
    
    // Simulate 50 runs with controlled success/failure rates
    for (let i = 0; i < 50; i++) {
        const startTime = Date.now();
        
        try {
            // Simulate random success/failure
            const success = Math.random() > 0.2; // 80% success rate
            
            if (!success) {
                throw new Error(`Simulated error in run ${i}`);
            }
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, Math.random() * 800));
            
            const responseTime = Date.now() - startTime;
            
            const result = {
                index: i,
                success: true,
                responseTime,
                modelUsed: 'test_model',
                temperature: 0.7,
                selfMonitorStatus: 'Active',
                selfImprovementStatus: 'Active'
            };
            
            batchObserver.recordRun(result);
            selfMonitor.recordRunResult(result);
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            const result = {
                index: i,
                success: false,
                error: error.message,
                responseTime,
                modelUsed: 'test_model',
                temperature: 0.7,
                selfMonitorStatus: 'Active',
                selfImprovementStatus: 'Active'
            };
            
            batchObserver.recordRun(result);
            selfMonitor.recordRunResult(result);
            selfMonitor.recordError(error);
        }
    }
    
    const finalMetrics = batchObserver.endBatch();
    console.log('Batch completed with metrics:', finalMetrics);
    
    const analysis = batchObserver.analyzeBatchPerformance(batchId);
    console.log('Batch analysis:', analysis);
    
    return {
        batchId,
        metrics: finalMetrics,
        analysis
    };
}

// Run the test
simulateBatch().then(results => {
    console.log('Test completed successfully');
    console.log('Results available in /logs/selfimprovement/');
}).catch(error => {
    console.error('Test failed:', error);
}); 
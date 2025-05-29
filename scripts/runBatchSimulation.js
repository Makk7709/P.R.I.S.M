#!/usr/bin/env node

import PRISM from '../prismCore.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DELAY_BETWEEN_RUNS = 100; // ms
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Get number of runs from command line argument
const numRuns = parseInt(process.argv[2]) || 50;

// Ensure we're in TEST mode
if (process.env.PRISM_MODE !== 'TEST') {
  console.error('Error: This script must be run in TEST mode');
  console.error('Please set PRISM_MODE=TEST before running');
  process.exit(1);
}

// Initialize PRISM with proper error handling
console.log('🚀 Initializing PRISM in TEST mode...');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initializePRISM() {
  try {
    if (!PRISM || typeof PRISM.init !== 'function') {
      throw new Error('PRISM instance is not properly imported or initialized');
    }

    await PRISM.init();
    
    // Verify critical components are initialized
    if (!PRISM.state?.selfMonitor || !PRISM.state?.selfImprovementEngine) {
      throw new Error('Critical components (SelfMonitor, SelfImprovementEngine) not properly initialized');
    }
    
    // Verify processEvent is available
    if (typeof PRISM.processEvent !== 'function') {
      throw new Error('PRISM.processEvent is not available');
    }

    // Verify PRISM state is properly initialized
    if (!PRISM.state || typeof PRISM.state !== 'object') {
      throw new Error('PRISM state is not properly initialized');
    }

    // Verify SelfMonitor methods
    if (typeof PRISM.state.selfMonitor.recordError !== 'function') {
      throw new Error('SelfMonitor.recordError is not a function');
    }
    
    console.log('✅ PRISM Core initialized successfully');
    console.log('📊 SelfMonitor status:', PRISM.state.selfMonitor ? 'Active' : 'Inactive');
    console.log('🔄 SelfImprovementEngine status:', PRISM.state.selfImprovementEngine ? 'Active' : 'Inactive');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize PRISM:', error.message);
    if (PRISM.state?.selfMonitor?.recordError) {
      PRISM.state.selfMonitor.recordError('Initialization', error);
    }
    return false;
  }
}

// Generate test events with more realistic data
const generateTestEvent = (index) => ({
  type: 'test',
  content: `Test event ${index} - ${new Date().toISOString()}`,
  timestamp: new Date().toISOString(),
  metadata: {
    isSimulation: true,
    runIndex: index,
    testType: 'batch_simulation',
    environment: 'TEST',
    version: '2.1',
    batchId: `batch_${Date.now()}`
  }
});

// Run a single event with retries
async function runEventWithRetry(event, index) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 Running event ${index} (attempt ${attempt}/${MAX_RETRIES})...`);
      const startTime = Date.now();
      
      // Use the public API directly
      const result = await PRISM.processEvent(event);
      
      const processedResult = {
        index,
        success: true,
        responseTime: Date.now() - startTime,
        modelUsed: result?.modelUsed || 'unknown',
        temperature: result?.temperature || 0.7,
        error: null,
        selfMonitorStatus: PRISM.state?.selfMonitor ? 'Active' : 'Inactive',
        selfImprovementStatus: PRISM.state?.selfImprovementEngine ? 'Active' : 'Inactive',
        attempt
      };

      console.log(`✅ Event ${index} completed in ${processedResult.responseTime}ms`);
      return processedResult;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt}/${MAX_RETRIES} failed for run ${index}: ${error.message}`);
      
      // Record error in SelfMonitor if available
      if (PRISM.state?.selfMonitor?.recordError) {
        PRISM.state.selfMonitor.recordError('RunError', error);
      }
      
      if (attempt < MAX_RETRIES) {
        console.log(`⏳ Waiting ${RETRY_DELAY}ms before retry...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  console.error(`❌ All attempts failed for run ${index}`);
  return {
    index,
    success: false,
    error: lastError?.message || String(lastError),
    responseTime: 0,
    modelUsed: 'unknown',
    temperature: 0.7,
    selfMonitorStatus: PRISM.state?.selfMonitor ? 'Active' : 'Inactive',
    selfImprovementStatus: PRISM.state?.selfImprovementEngine ? 'Active' : 'Inactive',
    attempt: MAX_RETRIES
  };
}

// Run the batch simulation
async function runSimulation() {
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < numRuns; i++) {
    try {
      const event = generateTestEvent(i);
      const result = await runEventWithRetry(event, i);
      
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        // Error already recorded in runEventWithRetry
      }
      
      // Log progress
      if ((i + 1) % 10 === 0) {
        console.log(`📊 Progress: ${i + 1}/${numRuns} runs (${successCount} success, ${errorCount} errors)`);
      }
      
      // Add delay between runs
      if (i < numRuns - 1) {
        await sleep(DELAY_BETWEEN_RUNS);
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Fatal error in run ${i}:`, error);
      
      // Record error in SelfMonitor if available
      if (PRISM.state?.selfMonitor?.recordError) {
        PRISM.state.selfMonitor.recordError('FatalError', error);
      }
      
      results.push({
        index: i,
        success: false,
        error: error?.message || String(error),
        responseTime: 0,
        modelUsed: 'unknown',
        temperature: 0.7,
        selfMonitorStatus: PRISM.state?.selfMonitor ? 'Active' : 'Inactive',
        selfImprovementStatus: PRISM.state?.selfImprovementEngine ? 'Active' : 'Inactive',
        attempt: 1
      });
    }
  }
  
  return {
    results,
    summary: {
      totalRuns: numRuns,
      successCount,
      errorCount,
      successRate: (successCount / numRuns) * 100,
      averageResponseTime: results.reduce((acc, r) => acc + r.responseTime, 0) / results.length
    }
  };
}

// Main execution
async function main() {
  // Initialize PRISM first
  const initialized = await initializePRISM();
  if (!initialized) {
    process.exit(1);
  }
  
  console.log(`🔄 Running ${numRuns} simulated events...`);
  
  try {
    const { results, summary } = await runSimulation();
    
    // Create results directory if it doesn't exist
    const resultsDir = path.join(process.cwd(), 'logs', 'selfimprovement');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(resultsDir, `batch_results_${timestamp}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify({ results, summary }, null, 2));
    
    console.log('\n📊 Simulation Summary:');
    console.log(`Total Runs: ${summary.totalRuns}`);
    console.log(`Successful: ${summary.successCount}`);
    console.log(`Failed: ${summary.errorCount}`);
    console.log(`Success Rate: ${summary.successRate.toFixed(2)}%`);
    console.log(`Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms`);
    console.log('\n📊 Results saved to:', resultsFile);
    console.log('✅ Batch simulation completed');
  } catch (error) {
    console.error('❌ Fatal error during simulation:', error);
    if (PRISM.state?.selfMonitor?.recordError) {
      PRISM.state.selfMonitor.recordError('FatalError', error);
    }
    process.exit(1);
  }
}

// Execute main function
main(); 
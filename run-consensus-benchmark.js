#!/usr/bin/env node

/**
 * PRISM Consensus Benchmark Runner
 * Executes real-world latency benchmarks without mocks
 * 
 * Usage: node run-consensus-benchmark.js [options]
 * 
 * Options:
 *   --scenarios=N    Number of scenarios to run (default: all)
 *   --runs=N         Runs per scenario (default: 50)
 *   --timeout=N      Global timeout in ms (default: 300000)
 *   --dry-run        Show plan without executing
 *   --help           Show this help
 */

import { ConsensusBenchmark } from './perf/benchmark.js';
import { BENCHMARK_CONFIG } from './perf/benchmark.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    scenarios: null,
    runs: BENCHMARK_CONFIG.RUNS_PER_SCENARIO,
    timeout: 300000, // 5 minutes
    dryRun: false,
    help: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--scenarios=')) {
      options.scenarios = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--runs=')) {
      options.runs = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--timeout=')) {
      options.timeout = parseInt(arg.split('=')[1]);
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
PRISM Consensus Benchmark Runner

Usage: node run-consensus-benchmark.js [options]

Options:
  --scenarios=N    Number of scenarios to run (default: all 36)
  --runs=N         Runs per scenario (default: 50)
  --timeout=N      Global timeout in ms (default: 300000)
  --dry-run        Show plan without executing
  --help           Show this help

Examples:
  node run-consensus-benchmark.js
  node run-consensus-benchmark.js --scenarios=6 --runs=25
  node run-consensus-benchmark.js --dry-run
  node run-consensus-benchmark.js --timeout=600000

Environment Variables Required:
  OPENAI_API_KEY      OpenAI API key
  ANTHROPIC_API_KEY   Anthropic API key  
  PERPLEXITY_API_KEY  Perplexity API key

Output:
  Results saved to perf/results/
  Reports saved to perf/reports/
  CSV exports saved to perf/exports/
`);
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🎯 PRISM Consensus Benchmark Runner');
  console.log('=====================================\n');

  try {
    // Initialize benchmark
    const benchmark = new ConsensusBenchmark();
    await benchmark.initialize();

    if (options.dryRun) {
      console.log('📋 Dry run mode - showing benchmark plan:');
      console.log(`   Total scenarios: ${benchmark.testCaseGenerator.getTestCases().length}`);
      console.log(`   Runs per scenario: ${options.runs}`);
      console.log(`   Total runs: ${benchmark.testCaseGenerator.getTestCases().length * options.runs}`);
      console.log(`   Estimated duration: ${Math.ceil(benchmark.testCaseGenerator.getTestCases().length * options.runs / BENCHMARK_CONFIG.MAX_RPS / 60)} minutes`);
      console.log('\n✅ Dry run completed - no benchmarks executed');
      process.exit(0);
    }

    // Set global timeout
    const timeoutId = setTimeout(() => {
      console.log('\n⏰ Global timeout reached - stopping benchmark');
      process.exit(1);
    }, options.timeout);

    // Run benchmark
    console.log('🚀 Starting benchmark execution...');
    await benchmark.runBenchmark();

    // Clear timeout
    clearTimeout(timeoutId);

    console.log('\n🎉 Benchmark completed successfully!');
    console.log('\n📊 Results summary:');
    console.log(`   Total runs: ${benchmark.results.length}`);
    console.log(`   Successful runs: ${benchmark.results.filter(r => r.status === 'success').length}`);
    console.log(`   Success rate: ${((benchmark.results.filter(r => r.status === 'success').length / benchmark.results.length) * 100).toFixed(1)}%`);
    
    console.log('\n📁 Output files:');
    console.log('   - Raw results: perf/results/');
    console.log('   - CSV exports: perf/exports/');
    console.log('   - Analysis reports: perf/reports/');

  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run main function
main().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

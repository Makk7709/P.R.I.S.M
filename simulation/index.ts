#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from './types.js';
import { ScenarioRunner, runValidationScenarios } from './scenario.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// PRISM-IND SIMULATION CLI - Water Treatment System
// Command-line interface for running PRISM vs Baseline comparisons
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * CLI Arguments parser
 */
interface CLIArgs {
  scenario: 'baseline' | 'prism' | 'compare' | 'validate';
  duration?: number; // days
  output?: string; // output directory
  seed?: number;
  verbose?: boolean;
  help?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    scenario: 'compare',
    duration: 10,
    output: './out',
    seed: 42,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--scenario':
      case '-s':
        parsed.scenario = args[++i] as CLIArgs['scenario'];
        break;
      case '--duration':
      case '-d':
        parsed.duration = Number.parseInt(args[++i]);
        break;
      case '--output':
      case '-o':
        parsed.output = args[++i];
        break;
      case '--seed':
        parsed.seed = Number.parseInt(args[++i]);
        break;
      case '--verbose':
      case '-v':
        parsed.verbose = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return parsed;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
🎯 PRISM-IND Water Treatment Simulation

USAGE:
  pnpm sim:run [OPTIONS]

SCENARIOS:
  baseline    Run baseline scenario only (CIP every 48h)
  prism       Run PRISM scenario only (predictive consensus)
  compare     Run both scenarios and compare (default)
  validate    Run validation scenarios with different configurations

OPTIONS:
  -s, --scenario <type>    Scenario type (baseline|prism|compare|validate)
  -d, --duration <days>    Simulation duration in days (default: 10)
  -o, --output <dir>       Output directory (default: ./out)
  --seed <number>          Random seed for reproducibility (default: 42)
  -v, --verbose            Verbose output
  -h, --help               Show this help

EXAMPLES:
  pnpm sim:run                           # Run comparison
  pnpm sim:run -s prism -d 14            # Run PRISM for 14 days
  pnpm sim:run -s validate -v            # Run validation with verbose output
  pnpm sim:run -o ./results --seed 123   # Custom output and seed

OUTPUTS:
  - {output}/report.md                   # Markdown report
  - {output}/report.html                 # HTML report  
  - {output}/kpi.csv                     # Time series data
  - {output}/consensus_decisions.json    # Decision audit trail
  - {output}/economic_summary.json       # Economic analysis
`);
}

/**
 * Ensure output directory exists
 */
function ensureOutputDir(outputDir: string): void {
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (_error) {
    console.error(`❌ Failed to create output directory: ${outputDir}`);
    process.exit(1);
  }
}

/**
 * Write simulation results to files
 */
async function writeResults(
  outputDir: string, 
  results: any, 
  scenario: string
): Promise<void> {
  const _timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    // Write CSV data
    if (results.baseline || results.prism) {
      // Comparison results
      const runner = new ScenarioRunner();
      
      if (results.baseline) {
        const baselineCSV = runner.exportToCSV(results.baseline);
        writeFileSync(join(outputDir, 'baseline_kpi.csv'), baselineCSV);
      }
      
      if (results.prism) {
        const prismCSV = runner.exportToCSV(results.prism);
        writeFileSync(join(outputDir, 'prism_kpi.csv'), prismCSV);
      }
      
      if (results.comparison) {
        writeFileSync(
          join(outputDir, 'economic_summary.json'), 
          JSON.stringify(results.comparison, null, 2)
        );
      }
    } else {
      // Single scenario results
      const runner = new ScenarioRunner();
      const csv = runner.exportToCSV(results);
      writeFileSync(join(outputDir, `${scenario}_kpi.csv`), csv);
      
      writeFileSync(
        join(outputDir, `${scenario}_metrics.json`), 
        JSON.stringify(results.metrics, null, 2)
      );
    }
    
    // Write consensus decisions if available
    if (results.prism?.steps) {
      const consensusDecisions = results.prism.steps
        .filter((step: any) => step.consensusDecision)
        .map((step: any) => ({
          timestamp: step.timestamp,
          decision: step.consensusDecision.finalRecommendation,
          consensusType: step.consensusDecision.consensusType,
          votes: step.consensusDecision.votes.map((vote: any) => ({
            agent: vote.agentId,
            recommendation: vote.recommendation,
            score: vote.score,
            justification: vote.justification
          }))
        }));
      
      writeFileSync(
        join(outputDir, 'consensus_decisions.json'), 
        JSON.stringify(consensusDecisions, null, 2)
      );
    }
    
    console.log(`📁 Results written to: ${outputDir}`);
    
  } catch (error) {
    console.error(`❌ Failed to write results:`, error);
    process.exit(1);
  }
}

/**
 * Generate simple report
 */
function generateReport(results: any, scenario: string): string {
  const timestamp = new Date().toISOString();
  
  if (results.comparison) {
    // Comparison report
    return `# PRISM-IND Water Treatment Simulation Report

**Generated:** ${timestamp}
**Seed:** ${DEFAULT_CONFIG.seed}
**Duration:** ${DEFAULT_CONFIG.durationDays} days

## Executive Summary

${results.comparison.summary}

## Detailed Results

### Baseline Strategy (CIP every 48h)
- **CIP Count:** ${results.baseline.metrics.cipCount}
- **Total Downtime:** ${results.baseline.metrics.totalDowntime.toFixed(1)}h
- **OPEX:** ${results.baseline.metrics.totalOpex.toFixed(0)}€
- **Chemistry Costs:** ${results.baseline.metrics.chemistryCosts.toFixed(0)}€
- **Production Lost:** ${results.baseline.metrics.productionLost.toFixed(0)}€
- **Average MHI:** ${results.baseline.summary.avgMHI.toFixed(3)}
- **Min MHI:** ${results.baseline.summary.minMHI.toFixed(3)}

### PRISM Strategy (Consensus-based predictive)
- **CIP Count:** ${results.prism.metrics.cipCount}
- **Total Downtime:** ${results.prism.metrics.totalDowntime.toFixed(1)}h
- **OPEX:** ${results.prism.metrics.totalOpex.toFixed(0)}€
- **Chemistry Costs:** ${results.prism.metrics.chemistryCosts.toFixed(0)}€
- **Production Lost:** ${results.prism.metrics.productionLost.toFixed(0)}€
- **Average MHI:** ${results.prism.summary.avgMHI.toFixed(3)}
- **Min MHI:** ${results.prism.summary.minMHI.toFixed(3)}
- **Consensus Decisions:** ${results.prism.summary.consensusDecisions}

## Key Performance Indicators

| Metric | Baseline | PRISM | Improvement |
|--------|----------|-------|-------------|
| CIPs | ${results.baseline.metrics.cipCount} | ${results.prism.metrics.cipCount} | ${results.comparison.cipReduction} (-${((results.comparison.cipReduction/results.baseline.metrics.cipCount)*100).toFixed(1)}%) |
| Downtime (h) | ${results.baseline.metrics.totalDowntime.toFixed(1)} | ${results.prism.metrics.totalDowntime.toFixed(1)} | ${results.comparison.downtimeSaved.toFixed(1)} |
| OPEX (€) | ${results.baseline.metrics.totalOpex.toFixed(0)} | ${results.prism.metrics.totalOpex.toFixed(0)} | ${results.comparison.opexSavings.toFixed(0)} |
| ROI (€) | ${results.baseline.metrics.roi.toFixed(0)} | ${results.prism.metrics.roi.toFixed(0)} | ${results.comparison.netROI.toFixed(0)} |

## Configuration

- **Flow Rate:** 100 m³/h
- **Train Config:** 7 vessels × 6 elements
- **Time Step:** 5 minutes
- **NPF Trigger:** ≥${DEFAULT_CONFIG.triggers.npf_cip_pct}% decline
- **NDP Trigger:** ≥${DEFAULT_CONFIG.triggers.ndp_cip_pct}% increase
- **SDI Target:** <${DEFAULT_CONFIG.triggers.sdi_high_threshold}
- **MHI Critical:** <${DEFAULT_CONFIG.triggers.mhi_critical}

---
*Generated by PRISM-IND Simulation Engine*
`;
  } else {
    // Single scenario report
    return `# ${scenario.toUpperCase()} Strategy Report

**Generated:** ${timestamp}
**Strategy:** ${results.strategy}
**Duration:** ${results.config.durationDays} days

## Results Summary

- **CIP Count:** ${results.metrics.cipCount}
- **Total Downtime:** ${results.metrics.totalDowntime.toFixed(1)}h
- **OPEX:** ${results.metrics.totalOpex.toFixed(0)}€
- **Average MHI:** ${results.summary.avgMHI.toFixed(3)}
- **Min MHI:** ${results.summary.minMHI.toFixed(3)}
- **Max NPF Decline:** ${results.summary.maxNPFDecline.toFixed(1)}%
- **Max NDP Increase:** ${results.summary.maxNDPIncrease.toFixed(1)}%

## CIP Events

${results.cipEvents.map((cip: any, i: number) => 
  `${i+1}. ${cip.timestamp} - ${cip.reason} (${cip.duration}h)`
).join('\n')}

---
*Generated by PRISM-IND Simulation Engine*
`;
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🎯 PRISM-IND Water Treatment Simulation\n');
  
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    return;
  }
  
  // Validate arguments
  if (!['baseline', 'prism', 'compare', 'validate'].includes(args.scenario)) {
    console.error('❌ Invalid scenario. Use: baseline, prism, compare, or validate');
    process.exit(1);
  }
  
  if (args.duration && (args.duration < 1 || args.duration > 30)) {
    console.error('❌ Duration must be between 1 and 30 days');
    process.exit(1);
  }
  
  // Setup configuration
  const config = {
    ...DEFAULT_CONFIG,
    durationDays: args.duration || DEFAULT_CONFIG.durationDays,
    seed: args.seed || DEFAULT_CONFIG.seed
  };
  
  // Ensure output directory
  ensureOutputDir(args.output!);
  
  try {
    const startTime = Date.now();
    let results: any;
    
    // Run scenarios
    switch (args.scenario) {
      case 'baseline': {
        console.log('Running baseline scenario...');
        const runnerBaseline = new ScenarioRunner(config);
        results = await runnerBaseline.runBaselineScenario();
        break;
      }
        
      case 'prism': {
        console.log('Running PRISM scenario...');
        const runnerPrism = new ScenarioRunner(config);
        results = await runnerPrism.runPRISMScenario();
        break;
      }
        
      case 'compare': {
        console.log('Running comparative analysis...');
        const runnerCompare = new ScenarioRunner(config);
        results = await runnerCompare.runComparativeAnalysis();
        break;
      }
        
      case 'validate':
        console.log('Running validation scenarios...');
        await runValidationScenarios();
        return; // Exit early for validation
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Write results
    await writeResults(args.output!, results, args.scenario);
    
    // Generate and write report
    const report = generateReport(results, args.scenario);
    writeFileSync(join(args.output!, 'report.md'), report);
    
    console.log(`\n✅ Simulation completed in ${elapsed}s`);
    
    if (args.verbose) {
      console.log('\n📊 Summary:');
      console.log(report.split('\n').slice(7, 15).join('\n')); // Show just the summary
    }
    
  } catch (error) {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Simulation interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

// Run main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { main };

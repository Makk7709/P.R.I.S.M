#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// Configuration
const METRICS_PORT = 9100;
const ALERT_PORT = 3001;
const TIMEOUT = 180000; // 3 minutes
const COVERAGE_THRESHOLD = 0.90;
const _MUTATION_THRESHOLD = 0.90;
const _OVERHEAD_THRESHOLD = 0.02;

// Utility functions
function execCommand(command) {
  try {
    return execSync(command, { stdio: 'pipe' }).toString().trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function calculateScore(report) {
  const coverage = report.tests.coverage;
  const mutationRate = report.mutation.rate;
  const overhead = report.overhead;
  return (coverage + mutationRate + (1 - overhead)) / 3;
}

// Main audit function
async function runAudit() {
  const report = {
    lint: 'fail',
    tests: { pass: false, coverage: 0 },
    perf: { strategic: 0, cycler: 0, codex: 0 },
    mutation: { killed: 0, total: 0, rate: 0 },
    metrics: 'fail',
    alertWebhook: 'fail',
    snapshot: 'fail',
    overhead: 0
  };

  try {
    // 1. Clean install
    console.log('Running clean install...');
    process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
    process.env.HUSKY = '0'; // Skip husky installation
    process.env.CI = 'true'; // Run in CI mode
    
    try {
      execCommand('npm ci --no-audit --no-progress');
    } catch (_error) {
      console.log('npm ci failed, trying npm install...');
      execCommand('npm install --no-audit --no-progress');
    }

    // 2. Lint
    console.log('Running lint...');
    try {
      execCommand('npm run lint');
      report.lint = 'pass';
    } catch (error) {
      console.log('Lint failed:', error.message);
      report.lint = 'fail';
      // Continue with other checks
    }

    // 3. Tests and coverage
    console.log('Running tests...');
    const testOutput = execCommand('npm test --silent');
    const coverageMatch = testOutput.match(/All files\s+\|\s+(\d+\.\d+)%/);
    report.tests.coverage = parseFloat(coverageMatch[1]) / 100;
    report.tests.pass = report.tests.coverage >= COVERAGE_THRESHOLD;

    // Performance tests
    console.log('Running performance tests...');
    const perfOutput = execCommand('npm run perf');
    const perfMatch = perfOutput.match(/strategic:(\d+\.\d+).*cycler:(\d+\.\d+).*codex:(\d+\.\d+)/);
    report.perf = {
      strategic: parseFloat(perfMatch[1]),
      cycler: parseFloat(perfMatch[2]),
      codex: parseFloat(perfMatch[3])
    };

    // 4. Mutation testing
    console.log('Running mutation tests...');
    const mutationOutput = execCommand('npm run mutation');
    const mutationMatch = mutationOutput.match(/Killed: (\d+)\/(\d+)/);
    report.mutation = {
      killed: parseInt(mutationMatch[1]),
      total: parseInt(mutationMatch[2]),
      rate: parseInt(mutationMatch[1]) / parseInt(mutationMatch[2])
    };

    // 5. Metrics and alerting
    console.log('Starting metrics server...');
    const _metricsProcess = execCommand('node telemetry/prismMetrics.js', { stdio: 'inherit' });
    
    // Start mock server
    const _mockProcess = execCommand('npx http-echo 3001', { stdio: 'inherit' });
    
    // Wait for metrics to be available
    await sleep(2000);
    
    // Check metrics endpoint
    const metricsResponse = await new Promise((resolve) => {
      http.get(`http://localhost:${METRICS_PORT}/metrics`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      });
    });
    
    if (metricsResponse.includes('prism_efficiency_percent')) {
      report.metrics = 'ok';
    }

    // Test alert webhook
    process.env.PRISM_ALERT_URL = `http://localhost:${ALERT_PORT}/hook`;
    execCommand('node -e "require(\'./prismBus.js\').publish(\'prism:adaptiveCycler:cycleTuned\',{efficiency:45})"');
    
    // Wait for alert (max 3 minutes)
    const startTime = Date.now();
    while (Date.now() - startTime < TIMEOUT) {
      const alertResponse = await new Promise((resolve) => {
        http.get(`http://localhost:${ALERT_PORT}/hook`, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => resolve(data));
        });
      });
      
      if (alertResponse.includes('"level":"critical"')) {
        report.alertWebhook = 'ok';
        break;
      }
      await sleep(1000);
    }

    // 6. Self-heal snapshot and rollback
    console.log('Testing self-heal...');
    execCommand('npm run selfheal:snapshot');
    
    // Inject break
    const strategicLayerPath = path.join(__dirname, '../regulation/prismStrategicLayer.js');
    const strategicLayerContent = fs.readFileSync(strategicLayerPath, 'utf8');
    fs.writeFileSync(strategicLayerPath, `${strategicLayerContent  }\n//BREAK`);
    
    execCommand('npm run selfheal:hook');
    
    // Check for changes
    const diff = execCommand('git diff --exit-code');
    report.snapshot = diff === '' ? 'ok' : 'fail';

    // 7. Grafana dashboard lint
    console.log('Checking Grafana dashboard...');
    const dashboardTitle = execCommand('jq .title grafana/prism_dashboard.json');
    if (dashboardTitle === '"PRISM Health"') {
      report.grafana = 'ok';
    }

    // 8. Metrics overhead benchmark
    console.log('Running metrics overhead benchmark...');
    const overheadOutput = execCommand('npm run bench:metrics');
    const overheadMatch = overheadOutput.match(/overhead: (\d+\.\d+)/);
    report.overhead = parseFloat(overheadMatch[1]);

    // 9. Calculate final score
    const score = calculateScore(report);
    
    // 10. Publish result and exit
    const event = score >= 0.90 ? 'prism:audit:RC_passed' : 'prism:audit:RC_failed';
    execCommand(`node -e "require('./prismBus.js').publish('${event}', ${JSON.stringify(report)})"`);
    
    // Output final report
    console.log(JSON.stringify(report, null, 2));
    
    // Exit with appropriate code
    process.exit(score >= 0.90 ? 0 : 1);

  } catch (error) {
    console.error('Audit failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      execCommand('pkill -f "node telemetry/prismMetrics.js"');
      execCommand('pkill -f "http-echo"');
    } catch (_error) {
      // Ignore cleanup errors
    }
  }
}

// Run the audit
runAudit(); 
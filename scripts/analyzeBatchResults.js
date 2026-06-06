#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const _PRISM = require('../prismCore.js');

// Ensure we're in TEST mode
if (process.env.PRISM_MODE !== 'TEST') {
  console.error('Error: This script must be run in TEST mode');
  console.error('Please set PRISM_MODE=TEST before running');
  process.exit(1);
}

// Load batch results
const resultsFile = path.join(process.cwd(), 'logs', 'selfimprovement', 'batch_results.json');
if (!fs.existsSync(resultsFile)) {
  console.error('Error: Batch results file not found');
  process.exit(1);
}

let results;
try {
  results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Invalid results format or empty results');
  }
} catch (error) {
  console.error('Error reading or parsing results file:', error.message);
  process.exit(1);
}

// Calculate metrics
const metrics = {
  totalRuns: results.length,
  successfulRuns: results.filter(r => r.success).length,
  failedRuns: results.filter(r => !r.success).length,
  averageResponseTime: 0,
  modelDistribution: {},
  errorTypes: {}
};

// Calculate average response time (excluding failed runs)
const validResponseTimes = results
  .filter(r => r.success && typeof r.responseTime === 'number')
  .map(r => r.responseTime);

metrics.averageResponseTime = validResponseTimes.length > 0
  ? validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length
  : 0;

// Analyze model distribution
results.forEach(r => {
  if (r.modelUsed && typeof r.modelUsed === 'string') {
    metrics.modelDistribution[r.modelUsed] = (metrics.modelDistribution[r.modelUsed] || 0) + 1;
  }
});

// Analyze error types
results.forEach(r => {
  if (r.error && typeof r.error === 'string') {
    const errorType = r.error.split(':')[0].trim();
    if (errorType) {
      metrics.errorTypes[errorType] = (metrics.errorTypes[errorType] || 0) + 1;
    }
  }
});

// Generate analysis report
const report = {
  timestamp: new Date().toISOString(),
  metrics,
  recommendations: []
};

// Generate recommendations based on metrics
if (metrics.failedRuns > 0) {
  report.recommendations.push({
    type: 'error_handling',
    priority: 'high',
    description: `Improve error handling for ${metrics.failedRuns} failed runs`
  });
}

if (metrics.averageResponseTime > 5000) {
  report.recommendations.push({
    type: 'performance',
    priority: 'medium',
    description: 'Optimize response time'
  });
}

// Add model distribution recommendations
const modelEntries = Object.entries(metrics.modelDistribution);
if (modelEntries.length > 1) {
  const [primaryModel, ...otherModels] = modelEntries.sort((a, b) => b[1] - a[1]);
  if (otherModels.some(([_, count]) => count > primaryModel[1] * 0.3)) {
    report.recommendations.push({
      type: 'model_selection',
      priority: 'medium',
      description: 'Consider optimizing model selection strategy'
    });
  }
}

// Save analysis report
try {
  const reportFile = path.join(process.cwd(), 'logs', 'selfimprovement', 'batch_analysis.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log('📊 Batch Analysis Report:');
  console.log('------------------------');
  console.log(`Total Runs: ${metrics.totalRuns}`);
  console.log(`Successful Runs: ${metrics.successfulRuns}`);
  console.log(`Failed Runs: ${metrics.failedRuns}`);
  console.log(`Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
  
  console.log('\nModel Distribution:');
  Object.entries(metrics.modelDistribution).forEach(([model, count]) => {
    console.log(`- ${model}: ${count} runs`);
  });
  
  console.log('\nError Types:');
  Object.entries(metrics.errorTypes).forEach(([type, count]) => {
    console.log(`- ${type}: ${count} occurrences`);
  });
  
  console.log('\nRecommendations:');
  report.recommendations.forEach(rec => {
    console.log(`- [${rec.priority.toUpperCase()}] ${rec.description}`);
  });
  
  console.log('\n📝 Full report saved to:', reportFile);
} catch (error) {
  console.error('Error saving analysis report:', error.message);
  process.exit(1);
} 
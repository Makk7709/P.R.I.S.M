#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

async function runStressTest() {
  console.log('🚀 Starting PRISM Core Advanced Stress Test...');
  
  try {
    // Run the stress test
    console.log('📊 Running stress test...');
    const { _stdout, stderr } = await execAsync('npm test -- __tests__/prismCoreAdvancedStressTest.js');
    
    if (stderr) {
      console.error('❌ Test execution errors:', stderr);
    }
    
    // Parse test results
    console.log('📝 Parsing test results...');
    const results = JSON.parse(await readFile('prismCoreAdvancedStressResults.json', 'utf8'));
    
    // Generate report
    console.log('📊 Generating report...');
    const report = {
      timestamp: new Date().toISOString(),
      testSummary: {
        totalEvents: results.summary.totalEvents,
        totalDuration: `${(results.summary.totalDurationMs / 1000).toFixed(2)}s`,
        eventsPerSecond: Math.round(results.summary.eventsPerSecond),
        averageLatency: `${results.summary.averageLatencyMs.toFixed(2)}ms`,
        failures: results.summary.failures,
        overloads: results.summary.overloads,
        cpuUsage: `${results.summary.cpuUsage.toFixed(2)}%`,
        memoryUsage: `${(results.summary.memoryUsage / 1024 / 1024).toFixed(2)}MB`
      },
      performanceMetrics: {
        latencyDistribution: {
          min: Math.min(...results.details.eventLatencies),
          max: Math.max(...results.details.eventLatencies),
          p95: calculatePercentile(results.details.eventLatencies, 95),
          p99: calculatePercentile(results.details.eventLatencies, 99)
        },
        systemMetrics: results.details.systemMetrics.map(metric => ({
          timestamp: new Date(metric.timestamp).toISOString(),
          cpu: {
            usage: `${((metric.cpu.usage.user + metric.cpu.usage.system) / 1000000).toFixed(2)}%`,
            load: metric.cpu.load
          },
          memory: {
            used: `${(metric.memory.used / 1024 / 1024).toFixed(2)}MB`,
            free: `${(metric.memory.free / 1024 / 1024).toFixed(2)}MB`
          }
        })),
        alerts: results.details.alerts.map(alert => ({
          type: alert.type,
          value: alert.value,
          threshold: alert.threshold,
          timestamp: new Date(alert.timestamp).toISOString()
        }))
      },
      recommendations: generateRecommendations(results)
    };
    
    // Save report
    const reportPath = path.join('reports', `stress-test-report-${Date.now()}.json`);
    await writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('✅ Stress test completed successfully!');
    console.log(`📊 Report saved to: ${reportPath}`);
    
    // Print summary
    console.log('\n📋 Test Summary:');
    console.log(`Total Events: ${report.testSummary.totalEvents}`);
    console.log(`Duration: ${report.testSummary.totalDuration}`);
    console.log(`Events/Second: ${report.testSummary.eventsPerSecond}`);
    console.log(`Average Latency: ${report.testSummary.averageLatency}`);
    console.log(`Failures: ${report.testSummary.failures}`);
    console.log(`Overloads: ${report.testSummary.overloads}`);
    console.log(`CPU Usage: ${report.testSummary.cpuUsage}`);
    console.log(`Memory Usage: ${report.testSummary.memoryUsage}`);
    
  } catch (error) {
    console.error('❌ Error running stress test:', error);
    process.exit(1);
  }
}

function calculatePercentile(values, percentile) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

function generateRecommendations(results) {
  const recommendations = [];
  
  // Check latency
  if (results.summary.averageLatencyMs > 100) {
    recommendations.push({
      type: 'latency',
      severity: 'high',
      message: 'Average latency exceeds 100ms threshold. Consider optimizing event processing or increasing resources.'
    });
  }
  
  // Check CPU usage
  if (results.summary.cpuUsage > 80) {
    recommendations.push({
      type: 'cpu',
      severity: 'medium',
      message: 'High CPU usage detected. Consider scaling horizontally or optimizing CPU-intensive operations.'
    });
  }
  
  // Check memory usage
  if (results.summary.memoryUsage > 1024 * 1024 * 1024) { // 1GB
    recommendations.push({
      type: 'memory',
      severity: 'medium',
      message: 'High memory usage detected. Consider implementing memory optimization or increasing available memory.'
    });
  }
  
  // Check overloads
  if (results.summary.overloads > 0) {
    recommendations.push({
      type: 'overload',
      severity: 'high',
      message: 'System overloads detected. Consider implementing rate limiting or increasing system capacity.'
    });
  }
  
  return recommendations;
}

runStressTest(); 
# PRISM Consensus Latency Benchmark Report

## Executive Summary

- **Total Runs**: 380
- **Success Rate**: 94.7%
- **E2E Latency (p50/p95/p99)**: 507.0ms / 756.0ms / 787.1ms
- **Benchmark Duration**: Demo data

## Methodology

- **Environment**: Demo simulation data
- **Rate Limiting**: Simulated 3 RPS with 100-300ms delays
- **Test Matrix**: 36 scenarios
- **Runs per Scenario**: 10 (demo)

## Detailed Analysis

### Overall Performance
- **E2E Latency**: p50=507.0ms, p95=756.0ms, p99=787.1ms
- **Vote Processing**: p50=35.4ms, p95=48.5ms, p99=49.7ms
- **Audit Processing**: p50=0.0ms, p95=24.6ms, p99=33.1ms
- **Orchestration Overhead**: p50=48.4ms, p95=67.6ms, p99=69.6ms

### Performance by Agent Count
- **3 agents**: p50=514.5ms, success=85.7%
- **5 agents**: p50=497.8ms, success=100.0%
- **7 agents**: p50=507.0ms, success=100.0%

### Performance by Context Size
- **1000 tokens**: p50=368.4ms, success=85.7%
- **4000 tokens**: p50=507.0ms, success=100.0%
- **8000 tokens**: p50=697.0ms, success=100.0%

### Performance by Timeout
- **1000ms**: p50=505.3ms, success=90.0%
- **2000ms**: p50=508.8ms, success=100.0%

### Cold vs Warm Performance
- **Cold Start**: p50=534.5ms
- **Warm Start**: p50=481.1ms
- **Improvement**: 9.6%

### Provider Performance
- **gpt-4**: latency p50=442.0ms, ttft p50=206.3ms, success=100.0%
- **claude**: latency p50=451.8ms, ttft p50=203.8ms, success=100.0%
- **perplexity**: latency p50=453.2ms, ttft p50=206.7ms, success=100.0%

## Recommendations

- **timeout**: Use 2000ms timeout for optimal success rate (100.0%) (high impact)
- **agents**: Use 7 agents for optimal balance of success rate and performance (medium impact)
- **context**: Use 4000 tokens context size for best performance (medium impact)
- **warm_pools**: Enable warm connection pools for 9.6% performance improvement (high impact)

## Quality Assurance

- ✅ Demo data generated
- ✅ Statistical analysis completed
- ✅ Success rate: 94.7%
- ✅ Error rate: 5.3%

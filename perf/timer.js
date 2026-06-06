/**
 * Performance Timer Module
 * Centralized timing instrumentation for PRISM Consensus benchmarks
 * Provides high-precision timing with performance.now() and detailed metrics
 */

export class PerformanceTimer {
  constructor() {
    this.markers = new Map();
    this.startTime = performance.now();
    this.runId = this.generateRunId();
  }

  /**
   * Generate unique run ID for this benchmark session
   */
  generateRunId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `run_${timestamp}_${random}`;
  }

  /**
   * Mark a timing point
   * @param {string} name - Marker name
   * @param {Object} metadata - Optional metadata
   */
  mark(name, metadata = {}) {
    const timestamp = performance.now();
    this.markers.set(name, {
      timestamp,
      relativeTime: timestamp - this.startTime,
      metadata
    });
    return timestamp;
  }

  /**
   * Get elapsed time between two markers
   * @param {string} startMarker - Start marker name
   * @param {string} endMarker - End marker name
   * @returns {number} Elapsed time in milliseconds
   */
  getElapsed(startMarker, endMarker) {
    const start = this.markers.get(startMarker);
    const end = this.markers.get(endMarker);
    
    if (!start || !end) {
      throw new Error(`Marker not found: ${start ? endMarker : startMarker}`);
    }
    
    return end.timestamp - start.timestamp;
  }

  /**
   * Get all timing data
   * @returns {Object} Complete timing data
   */
  getTimingData() {
    const data = {
      runId: this.runId,
      startTime: this.startTime,
      endTime: performance.now(),
      totalDuration: performance.now() - this.startTime,
      markers: Object.fromEntries(this.markers)
    };
    
    return data;
  }

  /**
   * Calculate TTFT (Time To First Token)
   * @param {string} requestStartMarker - When request started
   * @param {string} firstTokenMarker - When first token received
   * @returns {number} TTFT in milliseconds
   */
  getTTFT(requestStartMarker = 'request_start', firstTokenMarker = 'first_token') {
    return this.getElapsed(requestStartMarker, firstTokenMarker);
  }

  /**
   * Calculate TTLB (Time To Last Byte)
   * @param {string} requestStartMarker - When request started
   * @param {string} lastByteMarker - When last byte received
   * @returns {number} TTLB in milliseconds
   */
  getTTLB(requestStartMarker = 'request_start', lastByteMarker = 'last_byte') {
    return this.getElapsed(requestStartMarker, lastByteMarker);
  }

  /**
   * Calculate orchestration overhead
   * @param {string} consensusStartMarker - When consensus started
   * @param {string} consensusEndMarker - When consensus ended
   * @param {number} maxProviderLatency - Maximum provider latency
   * @returns {number} Orchestration overhead in milliseconds
   */
  getOrchestrationOverhead(consensusStartMarker, consensusEndMarker, maxProviderLatency) {
    const totalConsensusTime = this.getElapsed(consensusStartMarker, consensusEndMarker);
    return Math.max(0, totalConsensusTime - maxProviderLatency);
  }

  /**
   * Reset timer for new measurement
   */
  reset() {
    this.markers.clear();
    this.startTime = performance.now();
    this.runId = this.generateRunId();
  }

  /**
   * Export timing data as JSON
   * @returns {string} JSON string
   */
  exportJSON() {
    return JSON.stringify(this.getTimingData(), null, 2);
  }
}

/**
 * Consensus-specific timing wrapper
 */
export class ConsensusTimer extends PerformanceTimer {
  constructor() {
    super();
    this.agentTimings = new Map();
    this.voteTimings = new Map();
  }

  /**
   * Mark consensus start
   */
  markConsensusStart(decisionHash, contextSize) {
    this.mark('consensus_start', { decisionHash, contextSize });
  }

  /**
   * Mark agent request start
   * @param {string} agentId - Agent identifier
   * @param {string} provider - Provider name
   */
  markAgentRequestStart(agentId, provider) {
    const marker = `agent_${agentId}_request_start`;
    this.mark(marker, { agentId, provider });
    this.agentTimings.set(agentId, { provider, startMarker: marker });
  }

  /**
   * Mark agent first token
   * @param {string} agentId - Agent identifier
   */
  markAgentFirstToken(agentId) {
    const marker = `agent_${agentId}_first_token`;
    this.mark(marker);
    const timing = this.agentTimings.get(agentId);
    if (timing) {
      timing.firstTokenMarker = marker;
    }
  }

  /**
   * Mark agent completion
   * @param {string} agentId - Agent identifier
   * @param {Object} result - Agent result
   */
  markAgentComplete(agentId, result) {
    const marker = `agent_${agentId}_complete`;
    this.mark(marker, result);
    const timing = this.agentTimings.get(agentId);
    if (timing) {
      timing.completeMarker = marker;
      timing.result = result;
    }
  }

  /**
   * Mark vote start
   */
  markVoteStart() {
    this.mark('vote_start');
  }

  /**
   * Mark vote end
   */
  markVoteEnd() {
    this.mark('vote_end');
  }

  /**
   * Mark audit start
   */
  markAuditStart() {
    this.mark('audit_start');
  }

  /**
   * Mark audit end
   */
  markAuditEnd() {
    this.mark('audit_end');
  }

  /**
   * Mark consensus end
   * @param {Object} result - Final consensus result
   */
  markConsensusEnd(result) {
    this.mark('consensus_end', result);
  }

  /**
   * Get agent latency
   * @param {string} agentId - Agent identifier
   * @returns {number} Agent latency in milliseconds
   */
  getAgentLatency(agentId) {
    const timing = this.agentTimings.get(agentId);
    if (!timing || !timing.startMarker || !timing.completeMarker) {
      return null;
    }
    return this.getElapsed(timing.startMarker, timing.completeMarker);
  }

  /**
   * Get agent TTFT
   * @param {string} agentId - Agent identifier
   * @returns {number} Agent TTFT in milliseconds
   */
  getAgentTTFT(agentId) {
    const timing = this.agentTimings.get(agentId);
    if (!timing || !timing.startMarker || !timing.firstTokenMarker) {
      return null;
    }
    return this.getElapsed(timing.startMarker, timing.firstTokenMarker);
  }

  /**
   * Get vote processing time
   * @returns {number} Vote processing time in milliseconds
   */
  getVoteTime() {
    try {
      return this.getElapsed('vote_start', 'vote_end');
    } catch (_error) {
      return 0; // No vote performed
    }
  }

  /**
   * Get audit processing time
   * @returns {number} Audit processing time in milliseconds
   */
  getAuditTime() {
    try {
      return this.getElapsed('audit_start', 'audit_end');
    } catch (_error) {
      return 0; // No audit performed
    }
  }

  /**
   * Get complete consensus metrics
   * @returns {Object} Complete consensus timing metrics
   */
  getConsensusMetrics() {
    const baseTiming = this.getTimingData();
    const agentMetrics = {};
    
    // Calculate agent metrics
    for (const [agentId, timing] of this.agentTimings) {
      agentMetrics[agentId] = {
        provider: timing.provider,
        latency: this.getAgentLatency(agentId),
        ttft: this.getAgentTTFT(agentId),
        result: timing.result
      };
    }

    // Calculate consensus metrics
    const consensusTime = this.getElapsed('consensus_start', 'consensus_end');
    const voteTime = this.getVoteTime();
    const auditTime = this.getAuditTime();
    
    // Find maximum provider latency
    const agentLatencies = Object.values(agentMetrics)
      .map(metric => metric.latency)
      .filter(latency => latency !== null);
    const maxProviderLatency = agentLatencies.length > 0 ? Math.max(...agentLatencies) : 0;
    
    const orchestrationOverhead = this.getOrchestrationOverhead(
      'consensus_start', 
      'consensus_end', 
      maxProviderLatency
    );

    return {
      ...baseTiming,
      consensus: {
        totalTime: consensusTime,
        voteTime,
        auditTime,
        orchestrationOverhead,
        maxProviderLatency
      },
      agents: agentMetrics,
      summary: {
        agentCount: Object.keys(agentMetrics).length,
        successfulAgents: Object.values(agentMetrics).filter(m => m.latency !== null).length,
        averageAgentLatency: agentLatencies.length > 0 ? 
          agentLatencies.reduce((a, b) => a + b, 0) / agentLatencies.length : 0,
        averageAgentTTFT: Object.values(agentMetrics)
          .map(m => m.ttft)
          .filter(ttft => ttft !== null)
          .reduce((a, b) => a + b, 0) / Object.values(agentMetrics).length || 0
      }
    };
  }
}

export default PerformanceTimer;

/**
 * @typedef {Object} RetryOptions
 * @property {number} [maxAttempts=3] - Maximum number of retry attempts
 * @property {number} [initialDelay=1000] - Initial delay in milliseconds
 * @property {number} [maxDelay=10000] - Maximum delay in milliseconds
 * @property {number} [backoffFactor=2] - Exponential backoff multiplier
 * @property {number} [timeout=30000] - Global timeout in milliseconds
 * @property {boolean} [jitter=true] - Whether to add random jitter to delays
 */

// Lock mechanism for preventing concurrent retries
const retryLocks = new Map();

/**
 * Adds random jitter to a delay value
 * @param {number} delay - Base delay in milliseconds
 * @returns {number} - Delay with jitter
 */
const addJitter = (delay) => {
  const jitter = Math.random() * 0.3 + 0.85; // Random factor between 0.85 and 1.15
  return Math.floor(delay * jitter);
};

/**
 * Creates a promise that rejects after specified timeout
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise<never>}
 */
const timeout = (ms) => new Promise((_, reject) => {
  setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
});

// Metrics tracking
const metrics = {
  totalAttempts: 0,
  totalRetries: 0,
  totalSuccesses: 0,
  totalFailures: 0,
  totalLockedAttempts: 0
};

/**
 * Get current retry metrics
 * @returns {Object} Current metrics state
 */
export const getRetryMetrics = () => ({ ...metrics });

/**
 * Acquires a lock for a specific operation
 * @param {string} operationId - Unique identifier for the operation
 * @returns {boolean} - Whether the lock was acquired
 */
const acquireLock = (operationId) => {
  if (retryLocks.has(operationId)) {
    metrics.totalLockedAttempts++;
    return false;
  }
  retryLocks.set(operationId, true);
  return true;
};

/**
 * Releases a lock for a specific operation
 * @param {string} operationId - Unique identifier for the operation
 */
const releaseLock = (operationId) => {
  retryLocks.delete(operationId);
};

/**
 * Generates a unique operation ID
 * @param {Function} fn - The function being retried
 * @param {any[]} args - The arguments passed to the function
 * @returns {string} - Unique operation ID
 */
const generateOperationId = (fn, args) => {
  return `${fn.name || 'anonymous'}_${JSON.stringify(args)}`;
};

/**
 * Executes a function with retry logic
 * @param {Function} fn - Async function to execute
 * @param {RetryOptions} [options={}] - Retry configuration options
 * @returns {Promise<any>} - Result of the function execution
 */
export const retry = async (fn, options = {}) => {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    timeout: globalTimeout = 30000,
    jitter = true
  } = options;

  const operationId = generateOperationId(fn, []);
  
  if (!acquireLock(operationId)) {
    throw new Error('Operation already in progress');
  }

  try {
    let lastError;
    let currentDelay = initialDelay;
    metrics.totalAttempts++;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await Promise.race([
          fn(),
          timeout(globalTimeout)
        ]);
        metrics.totalSuccesses++;
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          metrics.totalFailures++;
          const errorMessage = `Operation failed after ${maxAttempts} attempts. Last error: ${error.message}`;
          if (typeof prismNotify === 'function') {
            prismNotify('error', errorMessage);
          }
          throw new Error(errorMessage);
        }

        metrics.totalRetries++;
        const delay = jitter ? addJitter(currentDelay) : currentDelay;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        currentDelay = Math.min(currentDelay * backoffFactor, maxDelay);
      }
    }
  } finally {
    releaseLock(operationId);
  }
};

/**
 * Creates a retryable version of a function
 * @param {Function} fn - Async function to make retryable
 * @param {RetryOptions} [options={}] - Retry configuration options
 * @returns {Function} - Retryable version of the function
 */
export const makeRetryable = (fn, options = {}) => {
  return async (...args) => {
    const operationId = generateOperationId(fn, args);
    
    if (!acquireLock(operationId)) {
      throw new Error('Operation already in progress');
    }

    try {
      return await retry(() => fn(...args), options);
    } finally {
      releaseLock(operationId);
    }
  };
};

export function initializeRetry() {
  return {
    retry,
    makeRetryable,
    getRetryMetrics
  };
} 
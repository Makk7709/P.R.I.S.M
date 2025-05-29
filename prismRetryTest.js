import { retry } from './prismRetry.js';

// Test 1: Verify retry succeeds after one failure
const testRetrySuccess = async () => {
  let attempts = 0;
  const testFn = async () => {
    attempts++;
    if (attempts === 1) throw new Error('First attempt fails');
    return 'success';
  };

  try {
    const result = await retry(testFn, { maxAttempts: 2 });
    console.log('✅ Test 1 passed: retry succeeded after one failure');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
};

// Test 2: Verify retry emits error notification after max attempts
const testRetryMaxAttempts = async () => {
  let attempts = 0;
  const testFn = async () => {
    attempts++;
    throw new Error(`Attempt ${attempts} failed`);
  };

  try {
    await retry(testFn, { maxAttempts: 2 });
    console.error('❌ Test 2 failed: Should have thrown after max attempts');
  } catch (error) {
    console.log('✅ Test 2 passed: retry threw after max attempts');
    console.log('Error:', error.message);
  }
};

// Test 3: Verify global timeout stops blocked function
const testGlobalTimeout = async () => {
  const testFn = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return 'success';
  };

  try {
    await retry(testFn, { timeout: 1000 });
    console.error('❌ Test 3 failed: Should have timed out');
  } catch (error) {
    if (error.message.includes('timed out')) {
      console.log('✅ Test 3 passed: global timeout worked correctly');
    } else {
      console.error('❌ Test 3 failed with unexpected error:', error.message);
    }
  }
};

// Run all tests
const runTests = async () => {
  console.log('Starting PRISM retry tests...\n');
  await testRetrySuccess();
  await testRetryMaxAttempts();
  await testGlobalTimeout();
  console.log('\nAll tests completed');
};

runTests(); 
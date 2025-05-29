const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Constants
const SNAPSHOT_DIR = '.prism-snapshots';
const CURRENT_SNAPSHOT = path.join(SNAPSHOT_DIR, Date.now().toString());

// Ensure snapshot directory exists
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// Create snapshot
console.log('📸 Creating snapshot...');
execSync(`rsync -a --exclude ${SNAPSHOT_DIR} . ${CURRENT_SNAPSHOT}`);
console.log('✅ Snapshot created at:', CURRENT_SNAPSHOT);

// Run validation steps
try {
  console.log('🔍 Running linting...');
  execSync('npm run lint', { stdio: 'inherit' });

  console.log('🧪 Running tests...');
  execSync('npm test --silent', { stdio: 'inherit' });

  console.log('⚡ Running performance tests...');
  execSync('npm run perf', { stdio: 'inherit' });

  // If we get here, all tests passed
  console.log('✅ All checks passed!');
  
  // Clean up snapshot
  console.log('🧹 Cleaning up snapshot...');
  fs.rmSync(CURRENT_SNAPSHOT, { recursive: true, force: true });
  
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error.message);
  
  // Rollback
  console.log('🔄 Rolling back to snapshot...');
  execSync(`rsync -a --delete ${CURRENT_SNAPSHOT}/ .`);
  
  // Emit failure event
  console.log('📢 Emitting build failure event...');
  // Note: In a real implementation, this would emit to your event system
  // For now, we'll just log it
  console.log('Event: prism:selfHeal:buildFailed');
  
  process.exit(1);
} 
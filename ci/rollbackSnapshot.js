const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Constants
const SNAPSHOT_DIR = '.prism-snapshots';

// Get the most recent snapshot
const snapshots = fs.readdirSync(SNAPSHOT_DIR)
  .filter(dir => fs.statSync(path.join(SNAPSHOT_DIR, dir)).isDirectory())
  .sort((a, b) => parseInt(b) - parseInt(a));

if (snapshots.length === 0) {
  console.error('❌ No snapshots found to rollback to');
  process.exit(1);
}

const latestSnapshot = snapshots[0];
const snapshotPath = path.join(SNAPSHOT_DIR, latestSnapshot);

// Read metadata
const metadataPath = path.join(snapshotPath, '.prism-snapshot-meta.json');
let metadata = {};
try {
  metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
} catch (error) {
  console.warn('⚠️ Could not read snapshot metadata');
}

console.log('🔄 Rolling back to snapshot:', latestSnapshot);
console.log('📅 Created:', metadata.created || 'Unknown');
console.log('📝 Description:', metadata.description || 'No description');

// Perform rollback
try {
  execSync(`rsync -a --delete ${snapshotPath}/ .`);
  console.log('✅ Rollback completed successfully');
} catch (error) {
  console.error('❌ Rollback failed:', error.message);
  process.exit(1);
} 
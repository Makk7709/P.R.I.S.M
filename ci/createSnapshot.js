const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Constants
const SNAPSHOT_DIR = '.prism-snapshots';
const timestamp = Date.now();
const snapshotPath = path.join(SNAPSHOT_DIR, timestamp.toString());

// Ensure snapshot directory exists
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// Create snapshot
console.log('📸 Creating snapshot...');
execSync(`rsync -a --exclude ${SNAPSHOT_DIR} . ${snapshotPath}`);
console.log('✅ Snapshot created at:', snapshotPath);

// Create metadata file
const metadata = {
  timestamp,
  created: new Date().toISOString(),
  description: 'Pre-deployment snapshot'
};

fs.writeFileSync(
  path.join(snapshotPath, '.prism-snapshot-meta.json'),
  JSON.stringify(metadata, null, 2)
);

console.log('🗄️ Snapshot metadata saved'); 
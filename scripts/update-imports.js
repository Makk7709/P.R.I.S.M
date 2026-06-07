import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Liste des fichiers à mettre à jour
const _filesToUpdate = [
  'prismGuardian.js',
  'prismStorage.js',
  'prismCleanup.js',
  'prismCore.js',
  'prismStrategyExecutor.js',
  'prismCodexAnalyzer.js',
  'prismSentinel.js',
  'prismSelfHeal.js',
  'prismStrategicLayer.js',
  'security/prismEventGuard.js',
  'memory/prismCodex.js',
  'memory/prismCodexAnalyzer.js',
  'ui/InsightCenter.js',
  'ui/InsightCenter.test.js',
  'monitoring/prismSentientPulse.js',
  'monitoring/prismAuroraConsciousness.js',
  'monitoring/prismBehavioralLearner.js',
  'monitoring/prismSystemMonitor.js',
  'monitoring/prismPostStressAnalyzer.js',
  'monitoring/prismBehaviorMap.js',
  'monitoring/prismReflection.js',
  'monitoring/prismMemento.js',
  'monitoring/prismSovereignCycle.js',
  'regulation/prismElysiumMode.js',
  'regulation/prismAdaptiveCycler.js',
  'regulation/prismStrategicLayer.js',
  '__tests__/prismBehavioralLearner.test.js',
  '__tests__/prismAdaptiveCycler.edge.test.js',
  '__tests__/prismCodexAnalyzer.metrics.test.js',
  '__tests__/prismStrategicLayer.test.js',
  '__tests__/prismElysiumMode.test.js',
  '__tests__/prismAdaptiveCycler.persist.test.js',
  '__tests__/prismStrategicLayerComposite.test.js',
  '__tests__/prismAdaptiveCycler.test.js',
  'tests/prismCodexAnalyzer.test.js',
  'tests/prismStrategyExecutor.test.js',
  'tests/loadTests.js',
  'tests/regulation/prismStrategicLayer.test.js',
  'index.html'
];

async function updateImports(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, '../core')).replaceAll(/\\/g, '/');
    const updatedContent = content.replaceAll(
      /import\s+(\w+)\s+from\s+['"]@core\/KernelBus\.js['"]/g,
      `import $1 from '${relativePath}/KernelBus.js'`
    );
    await fs.writeFile(filePath, updatedContent);
    console.log(`Updated imports in ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

async function findJsFiles(dir) {
  const files = await fs.readdir(dir);
  const jsFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      jsFiles.push(...(await findJsFiles(filePath)));
    } else if (file.endsWith('.js')) {
      jsFiles.push(filePath);
    }
  }

  return jsFiles;
}

async function main() {
  try {
    const rootDir = path.join(__dirname, '..');
    const jsFiles = await findJsFiles(rootDir);
    
    for (const file of jsFiles) {
      await updateImports(file);
    }
    
    console.log('All imports updated successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 
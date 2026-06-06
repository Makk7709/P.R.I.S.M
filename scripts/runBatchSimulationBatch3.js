import prism from '../prismCore.js';
import { sleep } from '../utils/sleep.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadPrompts() {
  try {
    const promptsPath = path.join(__dirname, '..', 'test', 'prompts.json');
    const data = await fs.readFile(promptsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading prompts:', error);
    return [];
  }
}

async function runBatch3(nbRuns = 50) {
  console.log(`🚀 Initializing PRISM for Batch 3 (Adaptive Test)`);
  await prism.init();

  const prompts = await loadPrompts();
  if (prompts.length === 0) {
    console.warn('⚠️ No prompts loaded, using fallback prompt');
  }

  let successCount = 0;
  let failureCount = 0;
  let totalResponseTime = 0;
  const results = [];

  for (let i = 0; i < nbRuns; i++) {
    let randomPrompt;
    try {
      randomPrompt = prompts.length > 0 
        ? prompts[Math.floor(Math.random() * prompts.length)]
        : { prompt: "Simulated complex prompt" };
      
      console.log(`🔄 Running event ${i + 1}/${nbRuns} (attempt 1/3)...`);

      const startTime = Date.now();
      const _result = await prism.processEvent(randomPrompt.prompt);
      const responseTime = Date.now() - startTime;
      totalResponseTime += responseTime;

      results.push({
        eventId: i + 1,
        prompt: randomPrompt.prompt,
        success: true,
        responseTime,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Event ${i + 1} completed successfully (${responseTime}ms)`);
      successCount++;

      await sleep(200); // Pause légère pour simuler une charge plus naturelle
    } catch (error) {
      console.error(`❌ Error in event ${i + 1}:`, error?.message || error);
      failureCount++;
      
      results.push({
        eventId: i + 1,
        prompt: randomPrompt?.prompt || "Unknown prompt",
        success: false,
        error: error?.message || String(error),
        timestamp: new Date().toISOString()
      });
    }
  }

  const averageResponseTime = totalResponseTime / nbRuns;
  console.log(`\n📊 Batch 3 Results:`);
  console.log(`Total Runs: ${nbRuns}`);
  console.log(`Successes: ${successCount}`);
  console.log(`Failures: ${failureCount}`);
  console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);

  // Save results to archive
  const archiveDir = path.join(process.cwd(), 'archives');
  await fs.mkdir(archiveDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(archiveDir, `observation_batch3_adaptive_${timestamp}.json`);
  
  await fs.writeFile(resultsFile, JSON.stringify({
    timestamp,
    totalRuns: nbRuns,
    successCount,
    failureCount,
    averageResponseTime,
    results
  }, null, 2));

  console.log(`\n📝 Results archived to: ${resultsFile}`);
}

// Run the batch if this file is executed directly
if (process.argv[1] === import.meta.url) {
  runBatch3(50).catch(console.error);
}

export default runBatch3; 
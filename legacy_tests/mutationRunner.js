const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const EventEmitter = require('node:events');

class MutationRunner extends EventEmitter {
  constructor() {
    super();
    console.log('🔧 Initializing MutationRunner...');
    this.config = JSON.parse(fs.readFileSync('mutation.config.json', 'utf8'));
    this.mutantDir = '.mutant';
    this.results = new Map();
    
    // Ensure mutant directory exists
    console.log(`📁 Creating mutant directory: ${this.mutantDir}`);
    fs.mkdirSync(this.mutantDir, { recursive: true });
  }

  async run() {
    console.log('🧬 Starting mutation testing...');
    const startTime = Date.now();

    for (const module of this.config.targetModules) {
      try {
        await this.testModule(module);
      } catch (error) {
        console.error(`❌ Error testing module ${module.path}:`, error);
      }
    }

    const endTime = Date.now();
    this.printReport(endTime - startTime);
    this.emitReport();

    console.log('🧹 Cleaning up mutant directory...');
    fs.rmSync(this.mutantDir, { recursive: true, force: true });

    const failedModules = Array.from(this.results.entries())
      .filter(([_, result]) => {
        return result.killRate < this.config.killThreshold || 
               result.total < result.module.minMutants;
      });

    if (failedModules.length > 0) {
      console.error('❌ Some modules are below the kill threshold or minimum mutants');
      process.exit(1);
    }
  }

  async testModule(module) {
    console.log(`\n📦 Testing module: ${module.path}`);
    const sourcePath = path.join(process.cwd(), module.path);
    
    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source file not found: ${sourcePath}`);
      return;
    }

    console.log(`📄 Reading source file: ${sourcePath}`);
    const sourceCode = fs.readFileSync(sourcePath, 'utf8');
    console.log(`📝 Source file size: ${sourceCode.length} bytes`);

    const mutants = this.generateMutants(sourceCode, module);
    console.log(`🔍 Generated ${mutants.length} mutants`);
    
    if (mutants.length === 0) {
      console.log(`🔎 0 mutation candidates for ${module.path}`);
      if (this.config.debug) {
        // Log 50 characters around each target function
        for (const functionName of module.targetFunctions) {
          const functionPattern = new RegExp(`\\b${functionName}\\b`);
          const match = functionPattern.exec(sourceCode);
          if (match) {
            const start = Math.max(0, match.index - 25);
            const end = Math.min(sourceCode.length, match.index + match[0].length + 25);
            console.log(`🔍 Context around ${functionName}: ${sourceCode.substring(start, end)}`);
          }
        }
      }
      return;
    }

    let killed = 0;
    let total = 0;

    for (const mutant of mutants) {
      total++;
      const mutantPath = path.join(this.mutantDir, path.basename(module.path));
      
      console.log(`\n🔄 Testing mutant ${total}/${mutants.length}`);
      console.log(`📝 Writing mutant to: ${mutantPath}`);
      console.log(`🔧 Mutation type: ${mutant.type} at position ${mutant.location}`);

      try {
        fs.writeFileSync(mutantPath, mutant.code, 'utf8');
        console.log('✅ Mutant file written successfully');

        console.log('🧪 Running tests...');
        execSync('npm test --silent', { stdio: 'ignore' });
        console.log(`❌ Mutant ${total} survived`);
      } catch (error) {
        killed++;
        console.log(`✅ Mutant ${total} killed`);
      }

      console.log('📝 Restoring original file...');
      fs.writeFileSync(mutantPath, sourceCode, 'utf8');
    }

    const killRate = (killed / total) * 100;
    this.results.set(module.path, {
      total,
      killed,
      killRate,
      module
    });

    console.log(`\n📊 Module results: ${killed}/${total} mutants killed (${killRate.toFixed(1)}%)`);
  }

  generateMutants(sourceCode, module) {
    const mutants = [];
    let mutationCount = 0;

    console.log(`🔍 Analyzing module for mutations...`);
    console.log(`📋 Target functions: ${module.targetFunctions.join(', ')}`);

    // Remove comments and strings to avoid mutating them
    const codeWithoutComments = sourceCode.replace(/\/\/.*|\/\*[^]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, ' ');

    // First try targeted function mutations
    let foundFunctions = false;
    for (const functionName of module.targetFunctions) {
      console.log(`\n🔎 Looking for function: ${functionName}`);
      
      const functionPattern = new RegExp(`\\b${functionName}\\b`);
      if (!functionPattern.test(codeWithoutComments)) {
        console.warn(`⚠️ Function ${functionName} not found in ${module.path}`);
        continue;
      }

      foundFunctions = true;
      console.log(`✅ Function ${functionName} found`);

      for (const mutator of this.config.mutators) {
        console.log(`\n🔄 Applying mutator: ${mutator.find} → ${mutator.replace}`);
        const regex = new RegExp(mutator.find, 'g');
        let match;
        
        while ((match = regex.exec(codeWithoutComments)) !== null && mutationCount < module.maxMutations) {
          console.log(`📌 Found mutation candidate at position ${match.index}`);
          const mutatedCode = sourceCode.substring(0, match.index) +
                            mutator.replace +
                            sourceCode.substring(match.index + mutator.find.length);
          
          mutants.push({
            code: mutatedCode,
            type: mutator.find,
            location: match.index
          });
          
          mutationCount++;
        }
      }
    }

    // If no functions found or no mutations generated, try global mutations
    if (!foundFunctions || mutants.length === 0) {
      console.log(`\n🔍 No targeted mutations found, trying global mutations...`);
      
      for (const mutator of this.config.mutators) {
        console.log(`\n🔄 Applying global mutator: ${mutator.find} → ${mutator.replace}`);
        const regex = new RegExp(mutator.find, 'g');
        let match;
        
        while ((match = regex.exec(codeWithoutComments)) !== null && mutationCount < module.maxMutations) {
          console.log(`📌 Found global mutation candidate at position ${match.index}`);
          const mutatedCode = sourceCode.substring(0, match.index) +
                            mutator.replace +
                            sourceCode.substring(match.index + mutator.find.length);
          
          mutants.push({
            code: mutatedCode,
            type: `global_${mutator.find}`,
            location: match.index
          });
          
          mutationCount++;
        }
      }
    }

    console.log(`\n📊 Generated ${mutants.length} total mutants`);
    return mutants;
  }

  printReport(duration) {
    console.log('\n📊 Mutation Testing Report');
    console.log('========================');
    console.log(`Duration: ${duration}ms\n`);

    console.log('| Module | Mutants | Killed | Kill Rate | Status |');
    console.log('|--------|---------|--------|-----------|--------|');

    for (const [module, result] of this.results.entries()) {
      const status = result.killRate < this.config.killThreshold ? '❌' :
                    result.total < result.module.minMutants ? '⚠️' : '✅';
      console.log(
        `| ${path.basename(module)} | ${result.total} | ${result.killed} | ${result.killRate.toFixed(1)}% | ${status} |`
      );
    }
  }

  emitReport() {
    this.emit('prism:mutation:report', {
      results: Object.fromEntries(this.results),
      timestamp: new Date().toISOString()
    });
  }
}

if (require.main === module) {
  const runner = new MutationRunner();
  runner.run().catch(error => {
    console.error('❌ Failed to run mutation tests:', error);
    process.exit(1);
  });
}

module.exports = MutationRunner; 
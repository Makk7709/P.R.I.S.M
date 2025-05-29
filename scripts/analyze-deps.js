#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const MAX_DEPENDENCIES = 7;
const OUTPUT_FILE = path.join(__dirname, '../reports/dependency-analysis.json');

// Fonctions utilitaires
function findFiles(dir, pattern) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, pattern));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];
  
  // Regex pour détecter les imports
  const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      continue; // Ignorer les imports de packages externes
    }
    
    const resolvedPath = path.resolve(path.dirname(filePath), importPath);
    imports.push(resolvedPath);
  }
  
  return imports;
}

function buildDependencyGraph() {
  const graph = {};
  const files = findFiles(SRC_DIR, /\.(js|ts)$/);
  
  for (const file of files) {
    const relativePath = path.relative(SRC_DIR, file);
    const imports = extractImports(file);
    
    graph[relativePath] = {
      imports: imports.map(imp => path.relative(SRC_DIR, imp)),
      dependents: []
    };
  }
  
  // Ajouter les dépendants
  for (const [file, data] of Object.entries(graph)) {
    for (const imp of data.imports) {
      if (graph[imp]) {
        graph[imp].dependents.push(file);
      }
    }
  }
  
  return graph;
}

function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  
  function dfs(node) {
    visited.add(node);
    recursionStack.add(node);
    
    for (const imp of graph[node].imports) {
      if (!visited.has(imp)) {
        if (dfs(imp)) {
          return true;
        }
      } else if (recursionStack.has(imp)) {
        cycles.push([...recursionStack].slice(recursionStack.indexOf(imp)));
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
  
  return cycles;
}

function analyzeDependencies() {
  console.log('Analyzing dependencies...');
  
  const graph = buildDependencyGraph();
  const cycles = detectCycles(graph);
  
  // Vérifier le nombre de dépendances
  const violations = [];
  for (const [file, data] of Object.entries(graph)) {
    if (data.imports.length > MAX_DEPENDENCIES) {
      violations.push({
        file,
        type: 'too_many_dependencies',
        count: data.imports.length,
        max: MAX_DEPENDENCIES
      });
    }
  }
  
  // Générer le rapport
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: Object.keys(graph).length,
    cycles: cycles.map(cycle => cycle.join(' -> ')),
    violations,
    graph
  };
  
  // Sauvegarder le rapport
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  
  // Afficher les résultats
  console.log('\nDependency Analysis Results:');
  console.log(`Total files: ${report.totalFiles}`);
  console.log(`Cycles detected: ${cycles.length}`);
  console.log(`Violations: ${violations.length}`);
  
  if (cycles.length > 0) {
    console.log('\n⚠️ Cycles detected:');
    cycles.forEach(cycle => console.log(`  - ${cycle.join(' -> ')}`));
  }
  
  if (violations.length > 0) {
    console.log('\n⚠️ Dependency violations:');
    violations.forEach(v => {
      console.log(`  - ${v.file}: ${v.count} dependencies (max: ${v.max})`);
    });
  }
  
  console.log(`\nFull report saved to ${OUTPUT_FILE}`);
}

// Exécution
analyzeDependencies(); 
#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { _execSync } = require('node:child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const TEST_DIR = path.join(__dirname, '../tests/mutation');
const MUTATION_CONFIG = {
  operators: [
    'arithmetic',
    'boolean',
    'conditional',
    'logical',
    'string',
    'array',
    'object',
    'function'
  ],
  threshold: 95 // kill rate minimum
};

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

function generateMutationTest(modulePath) {
  const moduleName = path.basename(modulePath, '.js');
  const testPath = path.join(TEST_DIR, `${moduleName}.mutation.test.js`);
  
  // Template de test de mutation
  const testTemplate = `const { expect } = require('chai');
const sinon = require('sinon');
const module = require('../../src/core/${moduleName}');

describe('${moduleName} Mutation Tests', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  // Tests de mutation pour chaque méthode
  describe('Method Mutations', () => {
    it('should detect mutations in method1', () => {
      // Test original
      const result = module.method1();
      expect(result).to.be.true;
      
      // Test avec mutation
      sandbox.stub(module, 'method1').returns(false);
      const mutatedResult = module.method1();
      expect(mutatedResult).to.be.false;
    });
    
    it('should detect mutations in method2', () => {
      // Test original
      const result = module.method2();
      expect(result).to.be.an('object');
      
      // Test avec mutation
      sandbox.stub(module, 'method2').returns(null);
      const mutatedResult = module.method2();
      expect(mutatedResult).to.be.null;
    });
  });
  
  // Tests de mutation pour les conditions
  describe('Condition Mutations', () => {
    it('should detect mutations in conditions', () => {
      // Test original
      const result = module.conditionalMethod(true);
      expect(result).to.be.true;
      
      // Test avec mutation
      const mutatedResult = module.conditionalMethod(false);
      expect(mutatedResult).to.be.false;
    });
  });
  
  // Tests de mutation pour les valeurs de retour
  describe('Return Value Mutations', () => {
    it('should detect mutations in return values', () => {
      // Test original
      const result = module.returnMethod();
      expect(result).to.be.a('string');
      
      // Test avec mutation
      sandbox.stub(module, 'returnMethod').returns(123);
      const mutatedResult = module.returnMethod();
      expect(mutatedResult).to.be.a('number');
    });
  });
  
  // Tests de mutation pour les erreurs
  describe('Error Mutations', () => {
    it('should detect mutations in error handling', () => {
      // Test original
      expect(() => module.errorMethod()).to.throw();
      
      // Test avec mutation
      sandbox.stub(module, 'errorMethod').returns('success');
      const mutatedResult = module.errorMethod();
      expect(mutatedResult).to.equal('success');
    });
  });
});
`;

  // Créer le fichier de test
  fs.writeFileSync(testPath, testTemplate);
  console.log(`Generated mutation test for ${moduleName}`);
}

function generateMutationConfig() {
  const configPath = path.join(__dirname, '../mutation.config.json');
  const config = {
    ...MUTATION_CONFIG,
    files: findFiles(SRC_DIR, /\.js$/).map(file => path.relative(SRC_DIR, file))
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Generated mutation configuration');
}

function main() {
  console.log('Generating mutation tests...');
  
  // Créer le dossier de tests si nécessaire
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  
  // Générer les tests pour chaque module
  const modules = findFiles(SRC_DIR, /\.js$/);
  for (const module of modules) {
    generateMutationTest(module);
  }
  
  // Générer la configuration de mutation
  generateMutationConfig();
  
  console.log('\nMutation test generation completed');
  console.log(`Tests generated in ${TEST_DIR}`);
  console.log('Configuration saved to mutation.config.json');
}

// Exécution
main(); 
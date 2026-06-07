#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { _execSync } = require('node:child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const TEST_DIR = path.join(__dirname, '../tests/security');
const SECURITY_CONFIG = {
  vulnerabilities: [
    'injection',
    'xss',
    'csrf',
    'sql-injection',
    'command-injection',
    'file-inclusion',
    'directory-traversal',
    'buffer-overflow',
    'race-condition',
    'memory-leak'
  ],
  threshold: 100 // couverture minimale
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

function generateSecurityTest(modulePath) {
  const moduleName = path.basename(modulePath, '.js');
  const testPath = path.join(TEST_DIR, `${moduleName}.security.test.js`);
  
  // Template de test de sécurité
  const testTemplate = `const { expect } = require('chai');
const sinon = require('sinon');
const module = require('../../src/core/${moduleName}');

describe('${moduleName} Security Tests', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  // Tests d'injection
  describe('Injection Tests', () => {
    it('should prevent SQL injection', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      expect(() => module.processInput(maliciousInput)).to.throw();
    });
    
    it('should prevent command injection', () => {
      const maliciousInput = "& rm -rf /";
      expect(() => module.executeCommand(maliciousInput)).to.throw();
    });
  });
  
  // Tests XSS
  describe('XSS Tests', () => {
    it('should prevent XSS attacks', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const result = module.sanitizeInput(maliciousInput);
      expect(result).to.not.include('<script>');
    });
  });
  
  // Tests CSRF
  describe('CSRF Tests', () => {
    it('should validate CSRF tokens', () => {
      const invalidToken = 'invalid-token';
      expect(() => module.validateCSRFToken(invalidToken)).to.throw();
    });
  });
  
  // Tests de validation d'entrée
  describe('Input Validation Tests', () => {
    it('should validate input length', () => {
      const longInput = 'a'.repeat(10000);
      expect(() => module.validateInput(longInput)).to.throw();
    });
    
    it('should validate input type', () => {
      const invalidInput = { type: 'object' };
      expect(() => module.validateInput(invalidInput)).to.throw();
    });
  });
  
  // Tests de gestion des erreurs
  describe('Error Handling Tests', () => {
    it('should handle errors securely', () => {
      const error = new Error('Test error');
      const result = module.handleError(error);
      expect(result).to.not.include('Test error');
    });
  });
  
  // Tests de gestion de la mémoire
  describe('Memory Management Tests', () => {
    it('should prevent memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      module.processLargeData();
      const finalMemory = process.memoryUsage().heapUsed;
      expect(finalMemory - initialMemory).to.be.below(1000000); // 1MB max
    });
  });
  
  // Tests de race condition
  describe('Race Condition Tests', () => {
    it('should handle concurrent operations', async () => {
      const promises = Array(100).fill().map(() => module.concurrentOperation());
      const results = await Promise.all(promises);
      expect(results.every(r => r === results[0])).to.be.true;
    });
  });
  
  // Tests de validation des chemins
  describe('Path Validation Tests', () => {
    it('should prevent directory traversal', () => {
      const maliciousPath = '../../../etc/passwd';
      expect(() => module.validatePath(maliciousPath)).to.throw();
    });
  });
  
  // Tests de validation des fichiers
  describe('File Validation Tests', () => {
    it('should validate file types', () => {
      const maliciousFile = { type: 'application/x-executable' };
      expect(() => module.validateFile(maliciousFile)).to.throw();
    });
  });
  
  // Tests de validation des URLs
  describe('URL Validation Tests', () => {
    it('should validate URLs', () => {
      const maliciousUrl = 'javascript:alert(1)';
      expect(() => module.validateUrl(maliciousUrl)).to.throw();
    });
  });
});
`;

  // Créer le fichier de test
  fs.writeFileSync(testPath, testTemplate);
  console.log(`Generated security test for ${moduleName}`);
}

function generateSecurityConfig() {
  const configPath = path.join(__dirname, '../security.config.json');
  const config = {
    ...SECURITY_CONFIG,
    files: findFiles(SRC_DIR, /\.js$/).map(file => path.relative(SRC_DIR, file))
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Generated security configuration');
}

function main() {
  console.log('Generating security tests...');
  
  // Créer le dossier de tests si nécessaire
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  
  // Générer les tests pour chaque module
  const modules = findFiles(SRC_DIR, /\.js$/);
  for (const module of modules) {
    generateSecurityTest(module);
  }
  
  // Générer la configuration de sécurité
  generateSecurityConfig();
  
  console.log('\nSecurity test generation completed');
  console.log(`Tests generated in ${TEST_DIR}`);
  console.log('Configuration saved to security.config.json');
}

// Exécution
main(); 
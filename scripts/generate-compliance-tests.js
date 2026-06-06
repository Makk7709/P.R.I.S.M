#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { _execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const TEST_DIR = path.join(__dirname, '../tests/compliance');
const COMPLIANCE_CONFIG = {
  standards: {
    rgpd: {
      version: '2016/679',
      requirements: [
        'data_minimization',
        'purpose_limitation',
        'storage_limitation',
        'accuracy',
        'integrity_confidentiality',
        'lawfulness_fairness_transparency',
        'accountability'
      ]
    },
    soc2: {
      version: '2017',
      requirements: [
        'security',
        'availability',
        'processing_integrity',
        'confidentiality',
        'privacy'
      ]
    },
    iso27001: {
      version: '2013',
      requirements: [
        'information_security_policies',
        'organization_of_information_security',
        'human_resource_security',
        'asset_management',
        'access_control',
        'cryptography',
        'physical_security',
        'operations_security',
        'communications_security',
        'system_acquisition',
        'supplier_relationships',
        'incident_management',
        'business_continuity',
        'compliance'
      ]
    },
    owasp: {
      version: '2021',
      requirements: [
        'broken_access_control',
        'cryptographic_failures',
        'injection',
        'insecure_design',
        'security_misconfiguration',
        'vulnerable_components',
        'identification_authentication_failures',
        'software_data_integrity_failures',
        'security_logging_monitoring_failures',
        'server_side_request_forgery'
      ]
    }
  }
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

function generateComplianceTest(modulePath) {
  const moduleName = path.basename(modulePath, '.js');
  const testPath = path.join(TEST_DIR, `${moduleName}.compliance.test.js`);
  
  // Template de test de conformité
  const testTemplate = `const { expect } = require('chai');
const sinon = require('sinon');
const module = require('../../src/core/${moduleName}');

describe('${moduleName} Compliance Tests', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  // Tests RGPD
  describe('GDPR Compliance Tests', () => {
    it('should implement data minimization', () => {
      const data = module.collectData();
      expect(data).to.have.property('purpose');
      expect(data.fields).to.have.lengthOf.at.most(10);
    });
    
    it('should implement purpose limitation', () => {
      const purpose = module.getDataPurpose();
      expect(purpose).to.be.a('string');
      expect(purpose).to.not.be.empty;
    });
    
    it('should implement storage limitation', () => {
      const retention = module.getRetentionPeriod();
      expect(retention).to.be.a('number');
      expect(retention).to.be.finite;
    });
    
    it('should ensure data accuracy', () => {
      const data = module.getData();
      expect(data).to.have.property('lastValidated');
      expect(data.lastValidated).to.be.a('date');
    });
    
    it('should ensure integrity and confidentiality', () => {
      expect(module.isEncrypted()).to.be.true;
      expect(module.getEncryptionMethod()).to.equal('AES-256-GCM');
    });
  });
  
  // Tests SOC2
  describe('SOC2 Compliance Tests', () => {
    it('should implement security controls', () => {
      expect(module.getSecurityControls()).to.include.all.keys([
        'access_control',
        'encryption',
        'monitoring',
        'incident_response'
      ]);
    });
    
    it('should ensure availability', () => {
      expect(module.getAvailabilityMetrics()).to.include.all.keys([
        'uptime',
        'mttr',
        'backup_frequency'
      ]);
    });
    
    it('should maintain processing integrity', () => {
      expect(module.getProcessingControls()).to.include.all.keys([
        'validation',
        'reconciliation',
        'error_handling'
      ]);
    });
    
    it('should protect confidentiality', () => {
      expect(module.getConfidentialityControls()).to.include.all.keys([
        'data_classification',
        'access_restrictions',
        'data_disposal'
      ]);
    });
  });
  
  // Tests ISO 27001
  describe('ISO 27001 Compliance Tests', () => {
    it('should implement information security policies', () => {
      expect(module.getSecurityPolicies()).to.be.an('array').that.is.not.empty;
    });
    
    it('should implement access control', () => {
      expect(module.getAccessControls()).to.include.all.keys([
        'authentication',
        'authorization',
        'audit'
      ]);
    });
    
    it('should implement cryptography', () => {
      expect(module.getCryptographyControls()).to.include.all.keys([
        'key_management',
        'algorithm_selection',
        'encryption_usage'
      ]);
    });
    
    it('should implement incident management', () => {
      expect(module.getIncidentManagement()).to.include.all.keys([
        'detection',
        'response',
        'recovery'
      ]);
    });
  });
  
  // Tests OWASP Top 10
  describe('OWASP Top 10 Compliance Tests', () => {
    it('should prevent broken access control', () => {
      const unauthorizedAccess = () => module.accessResource('admin', 'user_token');
      expect(unauthorizedAccess).to.throw();
    });
    
    it('should prevent cryptographic failures', () => {
      expect(module.getCryptoConfig()).to.include.all.keys([
        'algorithm',
        'key_size',
        'mode'
      ]);
    });
    
    it('should prevent injection', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      expect(() => module.processInput(maliciousInput)).to.throw();
    });
    
    it('should implement secure design', () => {
      expect(module.getSecurityDesign()).to.include.all.keys([
        'threat_modeling',
        'security_requirements',
        'security_testing'
      ]);
    });
  });
  
  // Tests de documentation
  describe('Documentation Tests', () => {
    it('should have required documentation', () => {
      expect(module.getDocumentation()).to.include.all.keys([
        'privacy_policy',
        'security_policy',
        'incident_response_plan',
        'data_retention_policy'
      ]);
    });
  });
  
  // Tests d'audit
  describe('Audit Tests', () => {
    it('should maintain audit logs', () => {
      const logs = module.getAuditLogs();
      expect(logs).to.be.an('array');
      expect(logs[0]).to.include.all.keys([
        'timestamp',
        'action',
        'user',
        'resource',
        'outcome'
      ]);
    });
  });
  
  // Tests de formation
  describe('Training Tests', () => {
    it('should require security training', () => {
      expect(module.getTrainingRequirements()).to.include.all.keys([
        'security_awareness',
        'privacy_training',
        'incident_response',
        'compliance_training'
      ]);
    });
  });
});
`;

  // Créer le fichier de test
  fs.writeFileSync(testPath, testTemplate);
  console.log(`Generated compliance test for ${moduleName}`);
}

function generateComplianceConfig() {
  const configPath = path.join(__dirname, '../compliance.config.json');
  const config = {
    ...COMPLIANCE_CONFIG,
    files: findFiles(SRC_DIR, /\.js$/).map(file => path.relative(SRC_DIR, file))
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Generated compliance configuration');
}

function main() {
  console.log('Generating compliance tests...');
  
  // Créer le dossier de tests si nécessaire
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  
  // Générer les tests pour chaque module
  const modules = findFiles(SRC_DIR, /\.js$/);
  for (const module of modules) {
    generateComplianceTest(module);
  }
  
  // Générer la configuration de conformité
  generateComplianceConfig();
  
  console.log('\nCompliance test generation completed');
  console.log(`Tests generated in ${TEST_DIR}`);
  console.log('Configuration saved to compliance.config.json');
}

// Exécution
main(); 
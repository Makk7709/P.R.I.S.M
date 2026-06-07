/**
 * Tests de validation - Schema Enterprise Export API
 * Micro-étape 0.2 - Définition du contrat API
 * 
 * Couverture: Success, Error, Edge cases
 * Méthodologie: TDD strict, >95% coverage
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Enterprise Export Schema Validation', () => {
  let schema;
  const schemaPath = path.join(__dirname, '../../../../backend/schemas/enterpriseExportSchema.json');

  beforeAll(() => {
    // Vérifier que le schema existe
    expect(fs.existsSync(schemaPath)).toBe(true);
    
    // Charger le schema
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    expect(schemaContent).toBeTruthy();
    
    schema = JSON.parse(schemaContent);
  });

  describe('Schema Structure Validation', () => {
    test('should have valid OpenAPI 3.0 structure', () => {
      expect(schema.openapi).toBe('3.0.3');
      expect(schema.info).toBeDefined();
      expect(schema.info.title).toBe('PRISM Enterprise Export API');
      expect(schema.info.version).toBeDefined();
      expect(schema.paths).toBeDefined();
      expect(schema.components).toBeDefined();
    });

    test('should define enterprise export endpoint', () => {
      expect(schema.paths['/api/export/enterprise-report']).toBeDefined();
      const endpoint = schema.paths['/api/export/enterprise-report'];
      expect(endpoint.post).toBeDefined();
    });

    test('should have security definitions', () => {
      expect(schema.components.securitySchemes).toBeDefined();
      expect(schema.security).toBeDefined();
    });
  });

  describe('Request Schema Validation', () => {
    let requestSchema;

    beforeAll(() => {
      requestSchema = schema.components.schemas.EnterpriseExportRequest;
    });

    test('should require content field', () => {
      expect(requestSchema.required).toContain('content');
      expect(requestSchema.properties.content).toBeDefined();
      expect(requestSchema.properties.content.type).toBe('string');
      expect(requestSchema.properties.content.minLength).toBeGreaterThan(0);
    });

    test('should define format field with enum values', () => {
      expect(requestSchema.properties.format).toBeDefined();
      expect(requestSchema.properties.format.enum).toEqual(['pdf', 'docx']);
      expect(requestSchema.properties.format.default).toBe('pdf');
    });

    test('should define template field with enterprise types', () => {
      expect(requestSchema.properties.template).toBeDefined();
      expect(requestSchema.properties.template.enum).toEqual(['executive', 'analytical', 'structured']);
    });

    test('should define options object with nested properties', () => {
      expect(requestSchema.properties.options).toBeDefined();
      const options = requestSchema.properties.options;
      expect(options.type).toBe('object');
      expect(options.properties.includeCharts).toBeDefined();
      expect(options.properties.watermark).toBeDefined();
      expect(options.properties.language).toBeDefined();
      expect(options.properties.language.enum).toEqual(['fr', 'en']);
    });

    test('should validate content size limits', () => {
      expect(requestSchema.properties.content.maxLength).toBeDefined();
      expect(requestSchema.properties.content.maxLength).toBeLessThanOrEqual(1000000); // 1MB limit
    });
  });

  describe('Response Schema Validation', () => {
    let successResponseSchema;
    let errorResponseSchema;

    beforeAll(() => {
      successResponseSchema = schema.components.schemas.EnterpriseExportResponse;
      errorResponseSchema = schema.components.schemas.ErrorResponse;
    });

    test('should define success response structure', () => {
      expect(successResponseSchema.required).toContain('success');
      expect(successResponseSchema.required).toContain('exportId');
      expect(successResponseSchema.required).toContain('downloadUrl');
      expect(successResponseSchema.required).toContain('expiresAt');
      
      expect(successResponseSchema.properties.success.type).toBe('boolean');
      expect(successResponseSchema.properties.exportId.format).toBe('uuid');
      expect(successResponseSchema.properties.downloadUrl.format).toBe('uri');
      expect(successResponseSchema.properties.expiresAt.format).toBe('date-time');
    });

    test('should define metadata object in success response', () => {
      expect(successResponseSchema.properties.metadata).toBeDefined();
      const metadata = successResponseSchema.properties.metadata;
      expect(metadata.type).toBe('object');
      expect(metadata.properties.fileSize).toBeDefined();
      expect(metadata.properties.pageCount).toBeDefined();
      expect(metadata.properties.template).toBeDefined();
    });

    test('should define error response structure', () => {
      expect(errorResponseSchema.required).toContain('success');
      expect(errorResponseSchema.required).toContain('error');
      expect(errorResponseSchema.required).toContain('code');
      
      expect(errorResponseSchema.properties.success.type).toBe('boolean');
      expect(errorResponseSchema.properties.error.type).toBe('string');
      expect(errorResponseSchema.properties.code.type).toBe('string');
    });
  });

  describe('HTTP Status Codes Validation', () => {
    let endpoint;

    beforeAll(() => {
      endpoint = schema.paths['/api/export/enterprise-report'].post;
    });

    test('should define all required error codes', () => {
      const requiredCodes = ['200', '400', '401', '403', '413', '429', '500', '503'];
      requiredCodes.forEach(code => {
        expect(endpoint.responses[code]).toBeDefined();
      });
    });

    test('should have appropriate descriptions for error codes', () => {
      const responses = endpoint.responses;
      expect(responses['400'].description).toContain('validation');
      expect(responses['401'].description).toContain('Authentication');
      expect(responses['403'].description).toContain('Access denied');
      expect(responses['413'].description).toContain('too large');
      expect(responses['429'].description).toContain('Rate limit');
      expect(responses['500'].description).toContain('Internal');
      expect(responses['503'].description).toContain('Service');
    });
  });

  describe('Security Schema Validation', () => {
    test('should require authentication', () => {
      const endpoint = schema.paths['/api/export/enterprise-report'].post;
      expect(endpoint.security).toBeDefined();
      expect(endpoint.security.length).toBeGreaterThan(0);
    });

    test('should define rate limiting specification', () => {
      const endpoint = schema.paths['/api/export/enterprise-report'].post;
      expect(endpoint['x-rate-limit']).toBeDefined();
      expect(endpoint['x-rate-limit'].requests).toBeDefined();
      expect(endpoint['x-rate-limit'].window).toBeDefined();
    });
  });

  describe('OpenAPI Validation', () => {
    test('should be valid OpenAPI 3.0 schema', async () => {
      // Utilisation de swagger-parser pour validation complète
      await expect(SwaggerParser.validate(schema)).resolves.toBeDefined();
    });

    test('should have no circular references', async () => {
      const api = await SwaggerParser.dereference(schema);
      expect(api).toBeDefined();
    });
  });

  describe('Enterprise Business Rules', () => {
    test('should enforce enterprise content detection', () => {
      const endpoint = schema.paths['/api/export/enterprise-report'].post;
      expect(endpoint.description).toContain('enterprise');
      expect(endpoint['x-enterprise-validation']).toBe(true);
    });

    test('should define content classification', () => {
      const requestSchema = schema.components.schemas.EnterpriseExportRequest;
      expect(requestSchema['x-content-types']).toEqual([
        'executive_report',
        'analytical_response', 
        'structured_response'
      ]);
    });

    test('should specify data retention policies', () => {
      const successSchema = schema.components.schemas.EnterpriseExportResponse;
      expect(successSchema.properties.expiresAt).toBeDefined();
      expect(successSchema['x-retention-policy']).toBeDefined();
    });
  });

  describe('Edge Cases Validation', () => {
    test('should handle empty content gracefully', () => {
      const requestSchema = schema.components.schemas.EnterpriseExportRequest;
      expect(requestSchema.properties.content.minLength).toBeGreaterThan(0);
    });

    test('should validate template and format combinations', () => {
      const requestSchema = schema.components.schemas.EnterpriseExportRequest;
      // Vérifier que les templates et formats sont bien définis
      expect(requestSchema.properties.template.enum).toBeDefined();
      expect(requestSchema.properties.format.enum).toBeDefined();
    });

    test('should handle concurrent requests limits', () => {
      const endpoint = schema.paths['/api/export/enterprise-report'].post;
      expect(endpoint['x-concurrency-limit']).toBeDefined();
    });
  });

  describe('Schema Integrity Tests', () => {
    test('should have consistent enum values across components', () => {
      const requestSchema = schema.components.schemas.EnterpriseExportRequest;
      const errorSchema = schema.components.schemas.ErrorResponse;
      
      // Vérifier cohérence des formats
      expect(requestSchema.properties.format.enum).toContain('pdf');
      expect(requestSchema.properties.format.enum).toContain('docx');
      
      // Vérifier cohérence des templates
      expect(requestSchema.properties.template.enum).toContain('executive');
      expect(requestSchema.properties.template.enum).toContain('analytical');
      expect(requestSchema.properties.template.enum).toContain('structured');
      
      // Vérifier cohérence des langues
      expect(requestSchema.properties.options.properties.language.enum).toContain('fr');
      expect(requestSchema.properties.options.properties.language.enum).toContain('en');
      
      // Vérifier cohérence des codes d'erreur
      expect(errorSchema.properties.code.enum).toContain('VALIDATION_ERROR');
      expect(errorSchema.properties.code.enum).toContain('NOT_ENTERPRISE_CONTENT');
    });

    test('should have proper boolean constraints', () => {
      const successSchema = schema.components.schemas.EnterpriseExportResponse;
      const errorSchema = schema.components.schemas.ErrorResponse;
      
      expect(successSchema.properties.success.enum).toEqual([true]);
      expect(errorSchema.properties.success.enum).toEqual([false]);
    });

    test('should have required fields properly defined', () => {
      const requestSchema = schema.components.schemas.EnterpriseExportRequest;
      const successSchema = schema.components.schemas.EnterpriseExportResponse;
      const errorSchema = schema.components.schemas.ErrorResponse;
      
      expect(requestSchema.required).toContain('content');
      expect(successSchema.required).toContain('success');
      expect(successSchema.required).toContain('exportId');
      expect(errorSchema.required).toContain('success');
      expect(errorSchema.required).toContain('error');
      expect(errorSchema.required).toContain('code');
    });
  });

  describe('Enterprise Features Validation', () => {
    test('should define enterprise features configuration', () => {
      expect(schema['x-enterprise-features']).toBeDefined();
      expect(schema['x-enterprise-features'].contentValidation).toBeDefined();
      expect(schema['x-enterprise-features'].security).toBeDefined();
      expect(schema['x-enterprise-features'].performance).toBeDefined();
    });

    test('should specify minimum enterprise score', () => {
      const enterpriseFeatures = schema['x-enterprise-features'];
      expect(enterpriseFeatures.contentValidation.minimumScore).toBe(80);
    });

    test('should define supported content types', () => {
      const enterpriseFeatures = schema['x-enterprise-features'];
      expect(enterpriseFeatures.contentValidation.supportedTypes).toEqual([
        'executive_report',
        'analytical_response',
        'structured_response'
      ]);
    });
  });
});

describe('Schema Integration Tests', () => {
  test('should validate sample valid request', () => {
    const validRequest = {
      content: "This is a comprehensive analysis of market trends and strategic recommendations for enterprise growth.",
      format: "pdf",
      template: "executive",
      options: {
        includeCharts: true,
        watermark: "CONFIDENTIAL",
        language: "fr"
      }
    };

    // Ces tests seront complétés lors de l'implémentation du validateur
    expect(validRequest).toBeDefined();
    expect(validRequest.content.length).toBeGreaterThan(50);
    expect(['pdf', 'docx']).toContain(validRequest.format);
    expect(['executive', 'analytical', 'structured']).toContain(validRequest.template);
  });

  test('should reject invalid requests', () => {
    const invalidRequests = [
      { content: "" }, // Empty content
      { content: "short", format: "invalid" }, // Invalid format
      { content: "valid content", template: "unknown" }, // Invalid template
    ];

    invalidRequests.forEach(request => {
      expect(request).toBeDefined(); // Placeholder for validation logic
      if (request.content === "") {
        expect(request.content.length).toBe(0);
      }
    });
  });

  test('should validate example requests from schema', () => {
    // Tester les exemples du schema
    const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../backend/schemas/enterpriseExportSchema.json'), 'utf8'));
    const examples = schema.paths['/api/export/enterprise-report'].post.requestBody.content['application/json'].examples;
    
    Object.values(examples).forEach(example => {
      const request = example.value;
      expect(request.content).toBeDefined();
      expect(request.content.length).toBeGreaterThan(50);
      expect(['pdf', 'docx']).toContain(request.format);
      if (request.template) {
        expect(['executive', 'analytical', 'structured']).toContain(request.template);
      }
    });
  });
}); 
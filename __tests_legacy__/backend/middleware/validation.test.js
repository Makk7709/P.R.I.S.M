/**
 * Tests unitaires pour Validation Middleware
 * Phase 2 - Micro-étape 2.1 - TDD Validation Middleware
 * 
 * Requirements:
 * - Validation schema d'entrée strict
 * - Rate limiting
 * - Logging sécurisé
 * - Coverage > 95%
 */

import {
  validateEnterpriseExportRequest,
  sanitizeInput,
  checkPayloadSize,
  enterpriseExportSchema
} from '../../../backend/middleware/validation.js';
import { jest } from '@jest/globals';

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        const headers = {
          'User-Agent': 'Test Browser',
          'Content-Length': '1000'
        };
        return headers[header];
      })
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();

    // Mock console.log pour les tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateEnterpriseExportRequest', () => {
    const validPayload = {
      content: "## Analyse Stratégique Q4\n\nPerformance exceptionnelle avec croissance 15% CA, EBITDA 2.8M€. Recommandations stratégiques pour expansion EMEA.",
      metadata: {
        reportType: 'executive_summary',
        title: 'Analyse Stratégique Q4',
        date: '2024-01-15',
        confidentiality: 'Internal'
      },
      format: 'pdf',
      requestId: 'testrequest123'
    };

    test('should accept valid payload', () => {
      req.body = validPayload;

      validateEnterpriseExportRequest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedData).toBeDefined();
      expect(req.validatedData.content).toBe(validPayload.content);
      expect(req.validationTime).toBeGreaterThan(0);
    });

    test('should reject missing content', () => {
      req.body = { ...validPayload, content: undefined };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          details: expect.objectContaining({
            field: 'content',
            message: 'Content is required and must be a non-empty string'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject empty content', () => {
      req.body = { ...validPayload, content: '' };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed'
        })
      );
    });

    test('should reject content too short', () => {
      req.body = { ...validPayload, content: 'Too short' };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            message: 'Content must be at least 50 characters'
          })
        })
      );
    });

    test('should reject content too long', () => {
      req.body = {
        ...validPayload,
        content: 'A'.repeat(1024 * 1024 + 1) // 1MB + 1 char
      };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            message: 'Content must not exceed 1MB'
          })
        })
      );
    });

    test('should reject missing metadata', () => {
      req.body = { ...validPayload, metadata: undefined };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            field: 'metadata',
            message: 'Metadata is required'
          })
        })
      );
    });

    test('should reject invalid report type', () => {
      req.body = {
        ...validPayload,
        metadata: {
          ...validPayload.metadata,
          reportType: 'invalid_type'
        }
      };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            message: 'Report type must be one of: executive_summary, financial, technical, strategy, analysis'
          })
        })
      );
    });

    test('should reject invalid date format', () => {
      req.body = {
        ...validPayload,
        metadata: {
          ...validPayload.metadata,
          date: 'invalid-date'
        }
      };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            message: 'Date must be in ISO format (YYYY-MM-DD)'
          })
        })
      );
    });

    test('should reject invalid confidentiality level', () => {
      req.body = {
        ...validPayload,
        metadata: {
          ...validPayload.metadata,
          confidentiality: 'Invalid'
        }
      };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            message: 'Confidentiality must be one of: Public, Internal, Confidential, Restricted'
          })
        })
      );
    });

    test('should reject invalid format', () => {
      req.body = { ...validPayload, format: 'docx' };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            message: 'Format must be "pdf"'
          })
        })
      );
    });

    test('should accept optional fields', () => {
      req.body = {
        ...validPayload,
        metadata: {
          ...validPayload.metadata,
          author: 'John Doe',
          department: 'Strategy',
          version: '1.0.0'
        },
        options: {
          includeMetrics: false,
          theme: 'minimal',
          language: 'en'
        }
      };

      validateEnterpriseExportRequest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedData.metadata.author).toBe('John Doe');
      expect(req.validatedData.options.theme).toBe('minimal');
    });

    test('should strip unknown fields', () => {
      req.body = {
        ...validPayload,
        unknownField: 'should be removed',
        metadata: {
          ...validPayload.metadata,
          unknownMetadata: 'should be removed'
        }
      };

      validateEnterpriseExportRequest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.validatedData.unknownField).toBeUndefined();
      expect(req.validatedData.metadata.unknownMetadata).toBeUndefined();
    });

    test('should detect malicious script content', () => {
      req.body = {
        ...validPayload,
        content: "## Report <script>alert('xss')</script>\n\nContent with malicious script."
      };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Security validation failed',
          details: expect.objectContaining({
            reason: 'Potentially malicious content detected'
          })
        })
      );
    });

    test('should detect malicious HTML content', () => {
      req.body = {
        ...validPayload,
        content: "## Report\n\nContent with <img src=x onerror=alert('xss')> malicious HTML."
      };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Security validation failed'
        })
      );
    });

    test('should detect oversized content', () => {
      req.body = {
        ...validPayload,
        content: 'A'.repeat(3 * 1024 * 1024) // 3MB content
      };

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Security validation failed',
          details: expect.objectContaining({
            reason: 'Content too large for enterprise report'
          })
        })
      );
    });

    test('should log security events', () => {
      req.body = validPayload;

      validateEnterpriseExportRequest(req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        '[SECURITY] Enterprise export validation started',
        expect.objectContaining({
          ip: '127.0.0.1',
          contentLength: validPayload.content.length
        })
      );

      expect(console.log).toHaveBeenCalledWith(
        '[SECURITY] Validation successful',
        expect.objectContaining({
          reportType: 'executive_summary'
        })
      );
    });

    test('should handle validation errors gracefully', () => {
      // Simuler une erreur interne
      req.body = null; // Cela devrait causer une erreur interne

      validateEnterpriseExportRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Internal validation error'
        })
      );
    });
  });

  describe('sanitizeInput', () => {
    beforeEach(() => {
      req.validatedData = {
        content: "## Content with   extra   spaces\nAnd control characters\x00\x01",
        metadata: {
          title: "Title with\x00control chars   "
        }
      };
    });

    test('should sanitize content properly', () => {
      sanitizeInput(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.sanitizedData.content).toBe("## Content with extra spaces And control characters");
      expect(req.sanitizedData.metadata.title).toBe("Title with control chars");
    });

    test('should add processing metadata', () => {
      sanitizeInput(req, res, next);

      expect(req.sanitizedData.processing).toBeDefined();
      expect(req.sanitizedData.processing.sanitizedAt).toBeDefined();
      expect(req.sanitizedData.processing.sanitizationTime).toBeGreaterThan(0);
      expect(req.sanitizedData.processing.requestIP).toBe('127.0.0.1');
    });

    test('should handle sanitization errors', () => {
      req.validatedData = null; // Simuler une erreur

      sanitizeInput(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Input sanitization failed'
        })
      );
    });

    test('should log sanitization process', () => {
      sanitizeInput(req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        '[SECURITY] Input sanitization completed',
        expect.objectContaining({
          originalLength: expect.any(Number),
          sanitizedLength: expect.any(Number)
        })
      );
    });
  });

  describe('checkPayloadSize', () => {
    test('should accept normal payload size', () => {
      req.get = jest.fn().mockReturnValue('1048576'); // 1MB

      checkPayloadSize(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject oversized payload', () => {
      req.get = jest.fn().mockReturnValue('11534336'); // 11MB

      checkPayloadSize(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Content too large',
          details: expect.objectContaining({
            maxSize: '10MB',
            receivedSize: '11.00MB'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle missing Content-Length header', () => {
      req.get = jest.fn().mockReturnValue(undefined);

      checkPayloadSize(req, res, next);

      expect(next).toHaveBeenCalled(); // Should pass with 0 size
    });

    test('should log oversized requests', () => {
      req.get = jest.fn().mockReturnValue('11534336'); // 11MB

      checkPayloadSize(req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        '[SECURITY] Payload too large',
        expect.objectContaining({
          contentLength: 11534336,
          maxSize: 10485760,
          ip: '127.0.0.1'
        })
      );
    });
  });

  describe('enterpriseExportSchema', () => {
    test('should validate complete valid schema', () => {
      const validData = {
        content: "## Valid Enterprise Content\n\nThis is a detailed business analysis with strategic insights and metrics that demonstrate professional formatting and enterprise-grade quality.",
        metadata: {
          reportType: 'executive_summary',
          title: 'Valid Enterprise Report',
          date: '2024-01-15',
          confidentiality: 'Internal',
          author: 'John Doe',
          department: 'Strategy',
          version: '1.0.0'
        },
        format: 'pdf',
        requestId: 'valid-request-123',
        options: {
          includeMetrics: true,
          includeBranding: true,
          theme: 'corporate',
          language: 'fr',
          watermark: false
        }
      };

      const { error, value } = enterpriseExportSchema.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toMatchObject(validData);
    });

    test('should apply default values for options', () => {
      const minimalData = {
        content: "## Minimal Enterprise Content\n\nThis is a minimal but valid enterprise content that meets the minimum requirements for validation.",
        metadata: {
          reportType: 'analysis',
          title: 'Minimal Report',
          date: '2024-01-15',
          confidentiality: 'Public'
        },
        format: 'pdf'
      };

      const { error, value } = enterpriseExportSchema.validate(minimalData);

      expect(error).toBeUndefined();
      expect(value.options).toMatchObject({
        includeMetrics: true,
        includeBranding: true,
        theme: 'corporate',
        language: 'fr',
        watermark: false
      });
    });

    test('should reject invalid semantic version', () => {
      const invalidData = {
        content: "## Valid Content\n\nValid enterprise content for testing version validation.",
        metadata: {
          reportType: 'technical',
          title: 'Version Test',
          date: '2024-01-15',
          confidentiality: 'Internal',
          version: 'invalid-version'
        },
        format: 'pdf'
      };

      const { error } = enterpriseExportSchema.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].message).toBe('Version must follow semantic versioning (x.y.z)');
    });

    test('should accept valid semantic versions', () => {
      const validVersions = ['1.0.0', '2.1.3', '10.5.2'];

      validVersions.forEach(version => {
        const data = {
          content: "## Valid Content\n\nValid enterprise content for testing version validation.",
          metadata: {
            reportType: 'technical',
            title: 'Version Test',
            date: '2024-01-15',
            confidentiality: 'Internal',
            version
          },
          format: 'pdf'
        };

        const { error } = enterpriseExportSchema.validate(data);
        expect(error).toBeUndefined();
      });
    });

    test('should reject HTML tags in content and title', () => {
      const invalidData = {
        content: "## Report <div>with HTML</div>\n\nContent with <span>tags</span>.",
        metadata: {
          reportType: 'analysis',
          title: 'Report <script>with script</script>',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        format: 'pdf'
      };

      const { error } = enterpriseExportSchema.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details.some(detail => 
        detail.message.includes('potentially unsafe characters')
      )).toBe(true);
    });
  });
}); 
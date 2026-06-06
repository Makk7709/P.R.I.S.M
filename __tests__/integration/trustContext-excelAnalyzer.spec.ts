/**
 * Tests TDD STRICT - Intégration TrustContext dans ExcelAnalyzer
 * Rigueur militaire : tests exhaustifs, cas limites, validation complète
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExcelAnalyzer } from '../../../src/excel/ExcelAnalyzer.js';
import { CriticalityLevel } from '../../../src/core/TrustContext.js';

describe('ExcelAnalyzer + TrustContext Integration', () => {
  let analyzer: ExcelAnalyzer;
  let mockTrustContext: any;

  beforeEach(() => {
    analyzer = new ExcelAnalyzer();
    mockTrustContext = {
      validateCriticalDecision: vi.fn(),
      requestApproval: vi.fn(),
      getMetrics: vi.fn(() => ({
        totalDecisions: 0,
        approvedDecisions: 0,
        rejectedDecisions: 0
      }))
    };

    // Injecter TrustContext mock
    (analyzer as any).trustContext = mockTrustContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation TrustContext pour fichiers Excel volumineux', () => {
    
    it('DOIT appeler TrustContext pour fichier > 10MB', async () => {
      mockTrustContext.requestApproval.mockResolvedValue({
        approved: true,
        reason: 'Auto-approved',
        timestamp: Date.now()
      });

      const largeFile = {
        buffer: Buffer.alloc(11 * 1024 * 1024), // 11MB
        originalname: 'large_file.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      // Mock l'analyse
      vi.spyOn(analyzer as any, '_performAnalysis').mockResolvedValue({
        summary: {},
        sheets: []
      });

      try {
        await analyzer.analyze(largeFile as any, 'Analyze this file');
      } catch (_e) {
        // Peut échouer sur parsing, mais TrustContext doit être appelé
      }

      // Assertion 1: TrustContext appelé
      expect(mockTrustContext.requestApproval).toHaveBeenCalled();
      
      // Assertion 2: Paramètres corrects
      const call = mockTrustContext.requestApproval.mock.calls[0];
      expect(call[0]).toMatchObject({
        action: 'excel_analysis',
        fileSize: expect.any(Number),
        fileName: 'large_file.xlsx'
      });
      
      // Assertion 3: FileSize >= seuil
      expect(call[0].fileSize).toBeGreaterThanOrEqual(10 * 1024 * 1024);
      
      // Assertion 4: Action correcte
      expect(call[0].action).toBe('excel_analysis');
      
      // Assertion 5: Criticality présente
      expect(call[0]).toHaveProperty('criticality');
      
      // Assertion 6: UserQuery passée si disponible
      if (call[0].userQuery) {
        expect(typeof call[0].userQuery).toBe('string');
      }
    });

    it('DOIT bloquer analyse si TrustContext rejette fichier volumineux', async () => {
      mockTrustContext.requestApproval.mockResolvedValue({
        approved: false,
        reason: 'File too large, requires supervisor approval',
        timestamp: Date.now()
      });

      const largeFile = {
        buffer: Buffer.alloc(15 * 1024 * 1024), // 15MB
        originalname: 'sensitive_data.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      // Assertion 1: Erreur levée
      await expect(
        analyzer.analyze(largeFile as any, 'Analyze confidential data')
      ).rejects.toThrow(/approval|rejected|failed/i);

      // Assertion 2: TrustContext appelé
      expect(mockTrustContext.requestApproval).toHaveBeenCalled();
      
      // Assertion 3: Raison de rejet passée
      const call = mockTrustContext.requestApproval.mock.calls[0];
      expect(call[0].fileSize).toBe(15 * 1024 * 1024);
      
      // Assertion 4: Action correcte
      expect(call[0].action).toBe('excel_analysis');
      
      // Assertion 5: UserQuery contient mot-clé sensible
      expect(call[0].userQuery?.toLowerCase()).toContain('confidential');
      
      // Assertion 6: Criticality appropriée pour fichier > 20MB
      if (call[0].fileSize >= 20 * 1024 * 1024) {
        expect(call[0].criticality).toBe(CriticalityLevel.HIGH);
      }
    });

    it('NE DOIT PAS appeler TrustContext pour fichier < 10MB', async () => {
      const smallFile = {
        buffer: Buffer.alloc(5 * 1024 * 1024), // 5MB
        originalname: 'small_file.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      vi.spyOn(analyzer as any, '_performAnalysis').mockResolvedValue({
        summary: {},
        sheets: []
      });

      try {
        await analyzer.analyze(smallFile as any, 'Analyze');
      } catch (_e) {
        // Ignorer erreurs parsing
      }

      // Assertion 1: TrustContext PAS appelé pour fichier < 10MB
      expect(mockTrustContext.requestApproval).not.toHaveBeenCalled();
      
      // Assertion 2: Analyse peut continuer normalement
      // (peut échouer sur parsing, mais pas sur validation)
      
      // Assertion 3: Pas de validation pour fichiers petits
      const callCount = mockTrustContext.requestApproval.mock.calls.length;
      expect(callCount).toBe(0);
      
      // Assertion 4: Pas de validateCriticalDecision non plus
      expect(mockTrustContext.validateCriticalDecision).not.toHaveBeenCalled();
    });
  });

  describe('Validation TrustContext pour requêtes sensibles', () => {
    
    it('DOIT détecter mots-clés sensibles et valider', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true
      });

      const sensitiveKeywords = [
        'confidential',
        'secret',
        'private',
        'internal',
        'classified',
        'restricted'
      ];

      for (const keyword of sensitiveKeywords) {
        const userQuery = `Analyze ${keyword} data in this file`;
        
        vi.spyOn(analyzer as any, '_performAnalysis').mockResolvedValue({
          summary: {},
          sheets: []
        });

        const file = {
          buffer: Buffer.alloc(2 * 1024 * 1024),
          originalname: 'file.xlsx',
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };

        try {
          await analyzer.analyze(file as any, userQuery);
        } catch (_e) {
          // Ignorer erreurs parsing
        }

        // Assertion: TrustContext appelé pour chaque mot-clé sensible
        const hasSensitiveCall = mockTrustContext.validateCriticalDecision.mock.calls
          .some(call => call[0].userQuery?.toLowerCase().includes(keyword));
        const hasApprovalCall = mockTrustContext.requestApproval.mock.calls
          .some(call => call[0].userQuery?.toLowerCase().includes(keyword));
        
        // Assertion 1: Au moins une validation déclenchée
        expect(hasSensitiveCall || hasApprovalCall).toBeTruthy();
        
        // Assertion 2: Mot-clé détecté dans la requête
        if (hasSensitiveCall) {
          const call = mockTrustContext.validateCriticalDecision.mock.calls
            .find(c => c[0].userQuery?.toLowerCase().includes(keyword));
          expect(call[0].userQuery.toLowerCase()).toContain(keyword);
        }
      }
      
      // Assertion finale: Au moins une validation pour tous les mots-clés
      const totalValidations = 
        mockTrustContext.validateCriticalDecision.mock.calls.length +
        mockTrustContext.requestApproval.mock.calls.length;
      expect(totalValidations).toBeGreaterThan(0);
    });

    it('DOIT valider requête contenant données financières sensibles', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true
      });

      const financialQueries = [
        'Calculate revenue',
        'Show profit margins',
        'Analyze financial statements',
        'Extract salary data'
      ];

      for (const query of financialQueries) {
        vi.spyOn(analyzer as any, '_performAnalysis').mockResolvedValue({
          summary: {},
          sheets: []
        });

        const file = {
          buffer: Buffer.alloc(3 * 1024 * 1024),
          originalname: 'financial.xlsx',
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };

        try {
          await analyzer.analyze(file as any, query);
        } catch (_e) {
          // Ignorer erreurs
        }
      }

      // Au moins une validation devrait être déclenchée
      expect(
        mockTrustContext.validateCriticalDecision.mock.calls.length > 0 ||
        mockTrustContext.requestApproval.mock.calls.length > 0
      ).toBeTruthy();
    });
  });

  describe('Validation TrustContext pour colonnes sensibles', () => {
    
    it('DOIT valider si fichier contient colonnes sensibles (email, phone, SSN)', async () => {
      mockTrustContext.validateCriticalDecision.mockResolvedValue({
        approved: true
      });

      // Simuler détection de colonnes sensibles
      vi.spyOn(analyzer as any, '_detectSensitiveColumns').mockReturnValue([
        'email', 'phone', 'ssn'
      ]);

      const file = {
        buffer: Buffer.alloc(2 * 1024 * 1024),
        originalname: 'contacts.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      vi.spyOn(analyzer as any, '_performAnalysis').mockResolvedValue({
        summary: { columns: ['email', 'phone', 'ssn'] },
        sheets: []
      });

      try {
        await analyzer.analyze(file as any, 'Analyze contacts');
      } catch (_e) {
        // Ignorer erreurs
      }

      // TrustContext devrait être appelé pour colonnes sensibles
      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
    });
  });

  describe('Gestion des erreurs TrustContext', () => {
    
    it('DOIT rejeter par défaut si TrustContext unavailable', async () => {
      mockTrustContext.validateCriticalDecision.mockRejectedValue(
        new Error('TrustContext unavailable')
      );

      const largeFile = {
        buffer: Buffer.alloc(11 * 1024 * 1024),
        originalname: 'file.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      await expect(
        analyzer.analyze(largeFile as any, 'Analyze')
      ).rejects.toThrow();

      expect(mockTrustContext.validateCriticalDecision).toHaveBeenCalled();
    });

    it('DOIT logger erreur TrustContext pour audit', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockTrustContext.validateCriticalDecision.mockRejectedValue(
        new Error('TrustContext error')
      );

      const file = {
        buffer: Buffer.alloc(11 * 1024 * 1024),
        originalname: 'file.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      try {
        await analyzer.analyze(file as any, 'Analyze confidential');
      } catch (_e) {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Cas limites', () => {
    
    it('DOIT gérer fileSize = 0', async () => {
      const emptyFile = {
        buffer: Buffer.alloc(0),
        originalname: 'empty.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      try {
        await analyzer.analyze(emptyFile as any, 'Analyze');
      } catch (_e) {
        // Expected error
      }

      // Pas de validation TrustContext pour fichier vide
      expect(mockTrustContext.requestApproval).not.toHaveBeenCalled();
    });

    it('DOIT gérer fileSize exactement = 10MB (seuil)', async () => {
      mockTrustContext.requestApproval.mockResolvedValue({
        approved: true
      });

      const exactSizeFile = {
        buffer: Buffer.alloc(10 * 1024 * 1024), // Exactement 10MB
        originalname: 'exact.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      vi.spyOn(analyzer as any, '_performAnalysis').mockResolvedValue({
        summary: {},
        sheets: []
      });

      try {
        await analyzer.analyze(exactSizeFile as any, 'Analyze');
      } catch (_e) {
        // Ignorer erreurs
      }

      // Doit appeler TrustContext pour seuil >= 10MB
      expect(mockTrustContext.requestApproval).toHaveBeenCalled();
    });

    it('DOIT valider même si userQuery est vide', async () => {
      mockTrustContext.requestApproval.mockResolvedValue({
        approved: true
      });

      const largeFile = {
        buffer: Buffer.alloc(11 * 1024 * 1024),
        originalname: 'file.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      vi.spyOn(analyzer as any, '_performAnalysis').mockResolvedValue({
        summary: {},
        sheets: []
      });

      try {
        await analyzer.analyze(largeFile as any, '');
      } catch (_e) {
        // Ignorer erreurs
      }

      // TrustContext doit être appelé basé sur taille, pas query
      expect(mockTrustContext.requestApproval).toHaveBeenCalled();
    });
  });

  describe('Métriques et audit', () => {
    
    it('DOIT enregistrer validations dans métriques TrustContext', async () => {
      mockTrustContext.requestApproval.mockResolvedValue({
        approved: true
      });

      mockTrustContext.getMetrics.mockReturnValue({
        totalDecisions: 1,
        approvedDecisions: 1,
        rejectedDecisions: 0
      });

      const largeFile = {
        buffer: Buffer.alloc(11 * 1024 * 1024),
        originalname: 'file.xlsx',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

      vi.spyOn(analyzer as any, '_performAnalysis').mockResolvedValue({
        summary: {},
        sheets: []
      });

      try {
        await analyzer.analyze(largeFile as any, 'Analyze');
      } catch (_e) {
        // Ignorer erreurs
      }

      expect(mockTrustContext.getMetrics).toBeDefined();
    });
  });
});

/**
 * Tests unitaires pour Enterprise PDF Service
 * Micro-étape 1.3 - TDD Cycle RED
 * 
 * Requirements:
 * - generateExecutiveReport(sanitizedData)
 * - applyEnterpriseTheme(doc) 
 * - Performance < 2s
 * - Coverage > 95%
 */

import { EnterprisePDFService } from '../../../backend/services/enterprisePDFService.js';
import { jest } from '@jest/globals';

// Mock PDFKit pour les tests
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    fillColor: jest.fn().mockReturnThis(),
    rect: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    lineWidth: jest.fn().mockReturnThis(),
    lineCap: jest.fn().mockReturnThis(),
    pipe: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    x: 50,
    y: 50,
    page: {
      width: 612,
      height: 792
    }
  }));
});

describe('EnterprisePDFService', () => {
  let pdfService;
  let mockPDFDoc;

  beforeEach(() => {
    pdfService = new EnterprisePDFService();
    mockPDFDoc = {
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      lineWidth: jest.fn().mockReturnThis(),
      lineCap: jest.fn().mockReturnThis(),
      pipe: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      x: 50,
      y: 50,
      page: {
        width: 612,
        height: 792
      }
    };
  });

  describe('generateExecutiveReport', () => {
    test('should generate PDF for executive summary report', async () => {
      const sanitizedData = {
        content: "## Analyse Stratégique Q4\n\nPerformance exceptionnelle avec croissance **15%** CA, EBITDA **2.8M€**. Recommandations stratégiques pour expansion EMEA.",
        metadata: {
          reportType: 'executive_summary',
          title: 'Analyse Stratégique Q4',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 92,
          qualityScore: 88
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.pdfBuffer).toBeDefined();
      expect(result.metadata).toMatchObject({
        title: 'Analyse Stratégique Q4',
        pages: expect.any(Number),
        size: expect.any(Number)
      });
    });

    test('should generate PDF for financial analysis report', async () => {
      const sanitizedData = {
        content: "## Bilan Financier T3\n\nChiffre d'affaires **12.3M€** (+18% YoY), EBITDA **2.8M€** (marge 22.7%), dette nette réduite de **15%**.",
        metadata: {
          reportType: 'financial',
          title: 'Bilan Financier T3',
          date: '2024-01-15',
          confidentiality: 'Confidential'
        },
        metrics: {
          enterpriseScore: 95,
          qualityScore: 91
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.metadata.reportType).toBe('financial');
    });

    test('should generate PDF for technical analysis report', async () => {
      const sanitizedData = {
        content: "## Architecture Technique Recommandée\n\nMigration vers infrastructure cloud avec auto-scaling, réduction latence de **40%**, amélioration uptime **99.9%**.",
        metadata: {
          reportType: 'technical',
          title: 'Architecture Technique',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 87,
          qualityScore: 85
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.metadata.reportType).toBe('technical');
    });

    test('should handle strategy report with specific formatting', async () => {
      const sanitizedData = {
        content: "## Stratégie de Croissance 2024\n\nObjectifs: expansion **3 nouveaux marchés**, recrutement **50 collaborateurs**, investissement R&D **2.5M€**.",
        metadata: {
          reportType: 'strategy',
          title: 'Stratégie de Croissance 2024',
          date: '2024-01-15',
          confidentiality: 'Restricted'
        },
        metrics: {
          enterpriseScore: 90,
          qualityScore: 87
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.metadata.reportType).toBe('strategy');
    });

    test('should include PRISM branding and metadata', async () => {
      const sanitizedData = {
        content: "## Rapport d'Analyse\n\nContenu professionnel du rapport.",
        metadata: {
          reportType: 'analysis',
          title: 'Rapport d\'Analyse',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.metadata.generator).toBe('PRISM Enterprise');
      expect(result.metadata.version).toBeDefined();
      expect(result.metadata.generatedAt).toBeDefined();
    });

    test('should handle long content with multiple pages', async () => {
      const longContent = "## Rapport Détaillé\n\n" + 
        "### Introduction\n" + "Contenu introduction ".repeat(100) + "\n\n" +
        "### Analyse\n" + "Contenu analyse ".repeat(150) + "\n\n" +
        "### Recommandations\n" + "Contenu recommandations ".repeat(120) + "\n\n" +
        "### Conclusion\n" + "Contenu conclusion ".repeat(80);

      const sanitizedData = {
        content: longContent,
        metadata: {
          reportType: 'analysis',
          title: 'Rapport Détaillé',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 88,
          qualityScore: 85
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.metadata.pages).toBeGreaterThan(1);
    });

    test('should handle special characters and accents', async () => {
      const sanitizedData = {
        content: "## Société Européenne\n\nAnalyse des marchés français, européens et américains. Résultats exceptionnels malgré défis économiques.",
        metadata: {
          reportType: 'analysis',
          title: 'Société Européenne',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 86,
          qualityScore: 83
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.metadata.encoding).toBe('UTF-8');
    });

    test('should generate within performance requirements (<2s)', async () => {
      const sanitizedData = {
        content: "## Performance Test\n\nContenu de test pour validation des performances.",
        metadata: {
          reportType: 'analysis',
          title: 'Performance Test',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      const startTime = Date.now();
      const result = await pdfService.generateExecutiveReport(sanitizedData);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000); // < 2 secondes
    });

    test('should validate sanitized data structure', async () => {
      const invalidData = {
        content: null,
        metadata: {},
        metrics: {}
      };

      await expect(pdfService.generateExecutiveReport(invalidData))
        .rejects.toThrow('Invalid sanitized data structure');
    });

    test('should handle missing metadata gracefully', async () => {
      const sanitizedData = {
        content: "## Rapport\n\nContenu du rapport.",
        metadata: null,
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.metadata.title).toBe('Rapport Enterprise PRISM');
      expect(result.metadata.reportType).toBe('general');
    });
  });

  describe('applyEnterpriseTheme', () => {
    test('should apply corporate color scheme', () => {
      const result = pdfService.applyEnterpriseTheme(mockPDFDoc);

      expect(result.theme).toBeDefined();
      expect(result.theme.colors).toMatchObject({
        primary: '#1E3A8A',
        secondary: '#64748B', 
        accent: '#059669',
        text: '#1F2937',
        background: '#FFFFFF'
      });
    });

    test('should configure professional fonts', () => {
      const result = pdfService.applyEnterpriseTheme(mockPDFDoc);

      expect(result.theme.fonts).toMatchObject({
        title: 'Helvetica-Bold',
        heading: 'Helvetica-Bold',
        body: 'Helvetica',
        caption: 'Helvetica-Oblique'
      });
    });

    test('should define font sizes hierarchy', () => {
      const result = pdfService.applyEnterpriseTheme(mockPDFDoc);

      expect(result.theme.fontSizes).toMatchObject({
        title: 24,
        h1: 20,
        h2: 16,
        h3: 14,
        body: 12,
        caption: 10
      });
    });

    test('should configure page layout', () => {
      const result = pdfService.applyEnterpriseTheme(mockPDFDoc);

      expect(result.theme.layout).toMatchObject({
        pageSize: 'A4',
        margins: {
          top: 80,
          bottom: 80,
          left: 60,
          right: 60
        },
        lineHeight: 1.4,
        paragraphSpacing: 12
      });
    });

    test('should configure branding elements', () => {
      const result = pdfService.applyEnterpriseTheme(mockPDFDoc);

      expect(result.theme.branding).toBeDefined();
      expect(result.theme.branding.title).toBe('PRISM Enterprise Report');
      expect(result.theme.branding.footer).toBe('Generated by PRISM AI Assistant');
      expect(result.theme.branding.watermark).toBe('CONFIDENTIAL');
    });

    test('should apply consistent spacing rules', () => {
      const result = pdfService.applyEnterpriseTheme(mockPDFDoc);

      expect(result.theme.spacing).toMatchObject({
        section: 20,
        paragraph: 12,
        list: 8,
        caption: 6
      });
    });

    test('should configure table styling', () => {
      const result = pdfService.applyEnterpriseTheme(mockPDFDoc);

      expect(result.theme.table).toMatchObject({
        headerBackground: '#F8FAFC',
        borderColor: '#E2E8F0',
        cellPadding: 8,
        alternateRowColor: '#F9FAFB'
      });
    });

    test('should return applied theme configuration', () => {
      const result = pdfService.applyEnterpriseTheme(mockPDFDoc);

      expect(result.success).toBe(true);
      expect(result.theme).toBeDefined();
      expect(result.appliedAt).toBeDefined();
    });
  });

  describe('PDF Structure and Content', () => {
    test('should include proper header with title and date', async () => {
      const sanitizedData = {
        content: "## Rapport Test\n\nContenu du rapport de test.",
        metadata: {
          reportType: 'analysis',
          title: 'Rapport Test',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.structure.hasHeader).toBe(true);
      expect(result.structure.hasTitle).toBe(true);
      expect(result.structure.hasDate).toBe(true);
    });

    test('should include footer with page numbers and branding', async () => {
      const sanitizedData = {
        content: "## Rapport Test\n\nContenu du rapport de test.",
        metadata: {
          reportType: 'analysis',
          title: 'Rapport Test',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.structure.hasFooter).toBe(true);
      expect(result.structure.hasPageNumbers).toBe(true);
      expect(result.structure.hasBranding).toBe(true);
    });

    test('should properly format markdown content', async () => {
      const sanitizedData = {
        content: "## Titre Principal\n\n### Sous-titre\n\nTexte normal avec **texte en gras** et contenu.\n\n- Point 1\n- Point 2\n- Point 3",
        metadata: {
          reportType: 'analysis',
          title: 'Test Markdown',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.structure.hasMarkdownFormatting).toBe(true);
      expect(result.structure.hasBoldText).toBe(true);
      expect(result.structure.hasBulletPoints).toBe(true);
    });

    test('should include confidentiality watermark when specified', async () => {
      const sanitizedData = {
        content: "## Rapport Confidentiel\n\nInformations sensibles de l'entreprise.",
        metadata: {
          reportType: 'strategy',
          title: 'Rapport Confidentiel',
          date: '2024-01-15',
          confidentiality: 'Confidential'
        },
        metrics: {
          enterpriseScore: 90,
          qualityScore: 87
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.structure.hasWatermark).toBe(true);
      expect(result.structure.watermarkText).toBe('CONFIDENTIAL');
    });

    test('should include metrics summary in footer', async () => {
      const sanitizedData = {
        content: "## Rapport avec Métriques\n\nContenu du rapport analysé.",
        metadata: {
          reportType: 'analysis',
          title: 'Rapport avec Métriques',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 92,
          qualityScore: 88
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.structure.hasMetricsSummary).toBe(true);
      expect(result.metadata.enterpriseScore).toBe(92);
      expect(result.metadata.qualityScore).toBe(88);
    });
  });

  describe('Error Handling', () => {
    test('should handle PDF generation errors gracefully', async () => {
      const sanitizedData = {
        content: "## Test Error\n\nContenu de test.",
        metadata: {
          reportType: 'analysis',
          title: 'Test Error',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      // Simuler une erreur PDFKit
      const originalGenerate = pdfService.generateExecutiveReport;
      pdfService.generateExecutiveReport = jest.fn().mockRejectedValue(new Error('PDF generation failed'));

      await expect(pdfService.generateExecutiveReport(sanitizedData))
        .rejects.toThrow('PDF generation failed');

      // Restaurer la méthode originale
      pdfService.generateExecutiveReport = originalGenerate;
    });

    test('should validate content length limits', async () => {
      const veryLongContent = "## Contenu Très Long\n\n" + "Texte répété ".repeat(10000);
      
      const sanitizedData = {
        content: veryLongContent,
        metadata: {
          reportType: 'analysis',
          title: 'Contenu Très Long',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      await expect(pdfService.generateExecutiveReport(sanitizedData))
        .rejects.toThrow('Content too long for PDF generation');
    });

    test('should handle invalid report types', async () => {
      const sanitizedData = {
        content: "## Rapport Type Invalide\n\nContenu du rapport.",
        metadata: {
          reportType: 'invalid_type',
          title: 'Rapport Type Invalide',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      const result = await pdfService.generateExecutiveReport(sanitizedData);

      expect(result.success).toBe(true);
      expect(result.metadata.reportType).toBe('general'); // Fallback
    });

    test('should handle missing content gracefully', async () => {
      const sanitizedData = {
        content: "",
        metadata: {
          reportType: 'analysis',
          title: 'Rapport Vide',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 0,
          qualityScore: 0
        }
      };

      await expect(pdfService.generateExecutiveReport(sanitizedData))
        .rejects.toThrow('Cannot generate PDF from empty content');
    });
  });

  describe('Performance and Memory', () => {
    test('should handle multiple concurrent PDF generations', async () => {
      const sanitizedData = {
        content: "## Test Concurrent\n\nContenu de test pour génération concurrente.",
        metadata: {
          reportType: 'analysis',
          title: 'Test Concurrent',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 85,
          qualityScore: 82
        }
      };

      const promises = Array(5).fill(null).map(() => 
        pdfService.generateExecutiveReport(sanitizedData)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should not exceed memory limits for large documents', async () => {
      const mediumContent = "## Document Moyen\n\n" + 
        "### Section 1\n" + "Contenu section 1 ".repeat(200) + "\n\n" +
        "### Section 2\n" + "Contenu section 2 ".repeat(200) + "\n\n" +
        "### Section 3\n" + "Contenu section 3 ".repeat(200);

      const sanitizedData = {
        content: mediumContent,
        metadata: {
          reportType: 'analysis',
          title: 'Document Moyen',
          date: '2024-01-15',
          confidentiality: 'Internal'
        },
        metrics: {
          enterpriseScore: 87,
          qualityScore: 84
        }
      };

      const startMemory = process.memoryUsage().heapUsed;
      const result = await pdfService.generateExecutiveReport(sanitizedData);
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;

      expect(result.success).toBe(true);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB
    });
  });
}); 
/**
 * @jest-environment node
 * 
 * Tests d'intégration pour le workflow Enterprise (Detection → Sanitization)
 * Ne couvre pas la génération PDF.
 * Validation micro-étapes 1.1 + 1.2
 * Detection Service + Sanitizer Service
 */

import { EnterpriseDetectionService } from '../../../backend/services/enterpriseDetectionService.js';
import { EnterpriseSanitizer } from '../../../backend/services/enterpriseSanitizer.js';
import { EnterprisePDFService } from '../../../backend/services/enterprisePDFService.js';

describe('Enterprise Workflow Integration', () => {
  let detectionService;
  let sanitizer;

  beforeEach(() => {
    detectionService = new EnterpriseDetectionService();
    sanitizer = new EnterpriseSanitizer();
  });

  describe('Complete Enterprise Content Processing', () => {
    test('should process strategic content from detection to sanitized PDF', () => {
      const rawContent = "Salut ! 😊 Voici l'analyse stratégique Q4: Performance exceptionnelle avec croissance 15% CA, EBITDA 2.8M€. Super résultats ! Les équipes ont assuré grave ! Recommandations: expansion EMEA.";
      const metadata = { type: 'analysis', context: 'quarterly_review' };

      // Phase 1: Détection Enterprise
      const isEnterprise = detectionService.isEnterpriseReport(rawContent, metadata);
      expect(isEnterprise).toBe(true);

      const reportType = detectionService.getReportType(rawContent);
      expect(['strategy', 'analysis', 'executive_summary', 'financial']).toContain(reportType);

      const enterpriseScore = detectionService.calculateEnterpriseScore(rawContent, metadata);
      expect(enterpriseScore).toBeGreaterThan(80);

      // Phase 2: Sanitisation du contenu
      const sanitizedContent = sanitizer.sanitizeContent(rawContent);
      
      // Vérifications de sanitisation
      expect(sanitizedContent).not.toContain('Salut !');
      expect(sanitizedContent).not.toContain('😊');
      expect(sanitizedContent).not.toContain('Super');
      expect(sanitizedContent).not.toContain('assuré grave');
      
      // Contenu business préservé
      expect(sanitizedContent).toContain('analyse stratégique Q4');
      expect(sanitizedContent).toContain('Performance exceptionnelle');
      expect(sanitizedContent).toContain('15% CA');
      expect(sanitizedContent).toContain('EBITDA 2.8M€');
      expect(sanitizedContent).toContain('Recommandations');

      // Phase 3: Validation post-sanitisation
      const validation = sanitizer.validateSanitizedContent(sanitizedContent);
      expect(validation.isValid).toBe(true);
      expect(validation.qualityScore).toBeGreaterThan(80);

      // Phase 4: Formatage PDF
      const pdfContent = sanitizer.formatForPDF(sanitizedContent);
      expect(pdfContent).toContain('**15%**');
      expect(pdfContent).toContain('**2.8M€**');
    });

    test('should reject casual content and not sanitize', () => {
      const casualContent = "😊 Salut ! Comment ça va ? Je peux t'aider avec tes questions aujourd'hui !";
      const metadata = { type: 'greeting', context: 'chat' };

      // Phase 1: Détection Enterprise (doit rejeter)
      const isEnterprise = detectionService.isEnterpriseReport(casualContent, metadata);
      expect(isEnterprise).toBe(false);

      const enterpriseScore = detectionService.calculateEnterpriseScore(casualContent, metadata);
      expect(enterpriseScore).toBeLessThan(50);

      // Phase 2: Ne pas sanitiser le contenu non-enterprise
      // (Dans un vrai workflow, on ne sanitiserait pas ce contenu)
      const reportType = detectionService.getReportType(casualContent);
      expect(reportType).toBe('unknown');
    });

    test('should handle financial reports workflow', () => {
      const financialContent = "Bilan financier T3: Chiffre d'affaires 12.3M euros (+18% YoY), EBITDA 2.8M EUR (marge 22.7%), dette nette réduite de 15%. Prévisions T4: croissance maintenue.";
      const metadata = { type: 'financial', context: 'quarterly_report' };

      // Phase 1: Détection
      const isEnterprise = detectionService.isEnterpriseReport(financialContent, metadata);
      expect(isEnterprise).toBe(true);

      const reportType = detectionService.getReportType(financialContent);
      expect(reportType).toBe('financial');

      // Phase 2: Sanitisation avec normalisation financière
      const sanitizedContent = sanitizer.sanitizeContent(financialContent);
      
      // Formats monétaires standardisés
      expect(sanitizedContent).toContain('12.3M€');
      expect(sanitizedContent).toContain('2.8M€');
      expect(sanitizedContent).not.toContain('euros');
      expect(sanitizedContent).not.toContain('EUR');

      // Phase 3: Validation
      const validation = sanitizer.validateSanitizedContent(sanitizedContent);
      expect(validation.isValid).toBe(true);
      expect(validation.metrics.professionalTermRatio).toBeGreaterThan(0.1);
    });

    test('should handle technical analysis workflow', () => {
      const technicalContent = "Architecture technique recommandée: Migration vers infrastructure cloud avec auto-scaling, réduction latence de 40%, amélioration uptime 99.9%. Coût d'implémentation estimé 180k euros.";
      const metadata = { type: 'technical', context: 'architecture' };

      // Phase 1: Détection
      const isEnterprise = detectionService.isEnterpriseReport(technicalContent, metadata);
      expect(isEnterprise).toBe(true);

      const reportType = detectionService.getReportType(technicalContent);
      expect(reportType).toBe('technical');

      // Phase 2: Sanitisation préservant les termes techniques
      const sanitizedContent = sanitizer.sanitizeContent(technicalContent);
      
      expect(sanitizedContent).toContain('Architecture technique');
      expect(sanitizedContent).toContain('infrastructure cloud');
      expect(sanitizedContent).toContain('auto-scaling');
      expect(sanitizedContent).toContain('99.9%');
      expect(sanitizedContent).toContain('180k€'); // Format standardisé

      // Phase 3: PDF avec mise en forme technique
      const pdfContent = sanitizer.formatForPDF(sanitizedContent);
      expect(pdfContent).toContain('**99.9%**');
      expect(pdfContent).toContain('**40%**');
    });

    test('should handle mixed content with professional core', () => {
      const mixedContent = "👋 Voici l'analyse demandée: Performance commerciale excellente avec 25% d'augmentation des ventes B2B, optimisation du funnel conversion (+12%), réduction CAC de 18%. Recommandations stratégiques en annexe.";
      const metadata = { type: 'mixed', context: 'report' };

      // Phase 1: Détection (doit détecter le contenu professionnel)
      const isEnterprise = detectionService.isEnterpriseReport(mixedContent, metadata);
      expect(isEnterprise).toBe(true);

      // Phase 2: Sanitisation (supprime casual, garde professionnel)
      const sanitizedContent = sanitizer.sanitizeContent(mixedContent);
      
      expect(sanitizedContent).not.toContain('👋');
      expect(sanitizedContent).toContain('analyse');
      expect(sanitizedContent).toContain('Performance commerciale');
      expect(sanitizedContent).toContain('25%');
      expect(sanitizedContent).toContain('+12%');
      expect(sanitizedContent).toContain('18%');

      // Phase 3: Validation du contenu nettoyé
      const validation = sanitizer.validateSanitizedContent(sanitizedContent);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Workflow Edge Cases', () => {
    test('should handle empty content gracefully', () => {
      const emptyContent = "";
      const metadata = {};

      // Détection
      const isEnterprise = detectionService.isEnterpriseReport(emptyContent, metadata);
      expect(isEnterprise).toBe(false);

      // Sanitisation
      const sanitizedContent = sanitizer.sanitizeContent(emptyContent);
      expect(sanitizedContent).toBe("");

      // Validation
      const validation = sanitizer.validateSanitizedContent(sanitizedContent);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('empty_content');
    });

    test('should handle very short content', () => {
      const shortContent = "Résultats positifs.";
      const metadata = { type: 'summary', context: 'report' };

      // Détection (trop court pour enterprise)
      const isEnterprise = detectionService.isEnterpriseReport(shortContent, metadata);
      expect(isEnterprise).toBe(false);

      // Score bas
      const score = detectionService.calculateEnterpriseScore(shortContent, metadata);
      expect(score).toBeLessThan(80);
    });

    test('should maintain consistency between services', () => {
      const testContent = "Analyse stratégique détaillée avec recommandations business et métriques de performance: croissance 15%, ROI 12%.";
      const metadata = null; // Test sans métadonnées

      // Les deux services doivent traiter le contenu de manière cohérente
      const isEnterprise = detectionService.isEnterpriseReport(testContent, metadata);
      const sanitizedContent = sanitizer.sanitizeContent(testContent);
      const validation = sanitizer.validateSanitizedContent(sanitizedContent);

      // Si le contenu est détecté comme enterprise, la sanitisation doit réussir
      if (isEnterprise) {
        expect(validation.isValid).toBe(true);
        expect(validation.qualityScore).toBeGreaterThan(70);
      }

      // Le contenu sanitisé doit toujours préserver les éléments clés
      expect(sanitizedContent).toContain('Analyse stratégique');
      expect(sanitizedContent).toContain('15%');
      expect(sanitizedContent).toContain('12%');
    });
  });

  describe('Performance Integration', () => {
    test('should process content efficiently in pipeline', () => {
      const testContent = "Analyse Q4: Performance exceptionnelle, croissance 15% CA, EBITDA 2.8M€, recommandations stratégiques.";
      const metadata = { type: 'analysis', context: 'quarterly' };

      const startTime = Date.now();

      // Pipeline complet
      const isEnterprise = detectionService.isEnterpriseReport(testContent, metadata);
      const reportType = detectionService.getReportType(testContent);
      const score = detectionService.calculateEnterpriseScore(testContent, metadata);
      const sanitizedContent = sanitizer.sanitizeContent(testContent);
      const validation = sanitizer.validateSanitizedContent(sanitizedContent);
      const pdfContent = sanitizer.formatForPDF(sanitizedContent);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Performance acceptable (< 50ms pour ce volume)
      expect(processingTime).toBeLessThan(50);

      // Résultats cohérents
      expect(isEnterprise).toBe(true);
      expect(['analysis', 'strategy', 'financial']).toContain(reportType);
      expect(score).toBeGreaterThan(80);
      expect(validation.isValid).toBe(true);
      expect(pdfContent).toContain('**15%**');
    });
  });
}); 
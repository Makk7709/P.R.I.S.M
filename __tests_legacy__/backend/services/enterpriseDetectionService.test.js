/**
 * Tests unitaires pour Enterprise Detection Service
 * Micro-étape 1.1 - TDD approach
 * Couverture cible: >95%
 */

import { EnterpriseDetectionService } from '../../../backend/services/enterpriseDetectionService.js';

describe('EnterpriseDetectionService', () => {
  let service;

  beforeEach(() => {
    service = new EnterpriseDetectionService();
  });

  describe('isEnterpriseReport', () => {
    test('should detect executive report with strategic content', () => {
      const content = "Analyse stratégique Q4 2024: Les indicateurs financiers montrent une croissance de 15% du chiffre d'affaires avec une optimisation des coûts opérationnels de 8%. Recommandations: expansion géographique en EMEA et investissement R&D.";
      const metadata = { type: 'analysis', context: 'quarterly_review' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(true);
    });

    test('should detect analytical content with metrics', () => {
      const content = "Analyse détaillée des métriques de performance: Conversion rate 12.4% (+2.1%), Customer acquisition cost 45€ (-12%), Lifetime value 890€ (+18%). Corrélations significatives identifiées entre engagement social et rétention client.";
      const metadata = { type: 'metrics', context: 'performance_analysis' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(true);
    });

    test('should reject casual conversational content', () => {
      const content = "😊 Salut ! Comment ça va ? Je peux t'aider avec tes questions aujourd'hui !";
      const metadata = { type: 'greeting', context: 'chat' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(false);
    });

    test('should reject content with too many emojis', () => {
      const content = "🎯 Super analyse ! 📊 Les chiffres sont bons 📈 avec 15% de croissance 🚀 et optimisation 💡 des coûts !";
      const metadata = { type: 'analysis', context: 'report' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(false);
    });

    test('should reject content too short for enterprise', () => {
      const content = "Résultats positifs.";
      const metadata = { type: 'summary', context: 'report' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(false);
    });

    test('should detect structured business content', () => {
      const content = "1. Analyse du marché: Croissance de 23% sur le segment B2B. 2. Recommandations stratégiques: Diversification produit et partenariats technologiques. 3. Plan d'action: Déploiement Q1 2025 avec budget alloué de 2.5M€.";
      const metadata = { type: 'strategy', context: 'business_plan' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(true);
    });

    test('should detect technical analysis content', () => {
      const content = "Architecture technique recommandée: Migration vers infrastructure cloud avec auto-scaling, réduction latence de 40%, amélioration uptime 99.9%. Coût d'implémentation estimé 180k€, ROI projeté 24 mois.";
      const metadata = { type: 'technical', context: 'architecture' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(true);
    });

    test('should reject personal or informal content', () => {
      const content = "J'espère que tu vas bien ! Alors pour ton problème, je pense que tu pourrais essayer cette solution sympa...";
      const metadata = { type: 'help', context: 'personal' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(false);
    });

    test('should handle empty or null content', () => {
      expect(service.isEnterpriseReport("", {})).toBe(false);
      expect(service.isEnterpriseReport(null, {})).toBe(false);
      expect(service.isEnterpriseReport(undefined, {})).toBe(false);
    });

    test('should handle missing metadata', () => {
      const content = "Analyse stratégique détaillée avec recommandations business et métriques de performance.";
      
      const result = service.isEnterpriseReport(content, null);
      
      expect(result).toBe(true); // Should work with content analysis only
    });

    test('should detect financial reporting content', () => {
      const content = "Bilan financier T3: Chiffre d'affaires 12.3M€ (+18% YoY), EBITDA 2.8M€ (marge 22.7%), dette nette réduite de 15%. Prévisions T4: croissance maintenue, investissements capex 1.2M€.";
      const metadata = { type: 'financial', context: 'quarterly_report' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(true);
    });

    test('should detect compliance and risk content', () => {
      const content = "Audit de conformité RGPD: 95% de conformité atteinte, 3 non-conformités mineures identifiées. Plan de remédiation sur 60 jours, budget correction 45k€. Certification ISO 27001 maintenue.";
      const metadata = { type: 'compliance', context: 'audit' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(true);
    });

    test('should reject debug or technical logs', () => {
      const content = "ERROR: Connection timeout at line 245. Stack trace: [...] Debug info: memory usage 85%, CPU 60%. Investigating network latency issues.";
      const metadata = { type: 'debug', context: 'technical' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(false);
    });

    test('should detect market research content', () => {
      const content = "Étude de marché SaaS B2B: Taille adressable 450M€, croissance annuelle 12%. Positionnement concurrentiel favorable, part de marché cible 3.2%. Stratégie go-to-market recommandée.";
      const metadata = { type: 'research', context: 'market_analysis' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(true);
    });

    test('should handle mixed content with professional core', () => {
      const content = "👋 Voici l'analyse demandée: Performance commerciale excellente avec 25% d'augmentation des ventes B2B, optimisation du funnel conversion (+12%), réduction CAC de 18%. Recommandations stratégiques en annexe.";
      const metadata = { type: 'mixed', context: 'report' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(true); // Professional content should prevail
    });

    test('should reject pure AI meta-conversation', () => {
      const content = "En tant qu'IA, je peux t'aider à analyser tes données. Mes capacités incluent l'analyse de texte, la génération de rapports...";
      const metadata = { type: 'meta', context: 'ai_explanation' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(false);
    });
  });

  describe('getReportType', () => {
    test('should classify executive summary content', () => {
      const content = "Synthèse exécutive Q4: Performance globale exceptionnelle, objectifs dépassés, recommandations stratégiques pour 2025.";
      
      const result = service.getReportType(content);
      
      expect(result).toBe('executive_summary');
    });

    test('should classify analytical content', () => {
      const content = "Analyse détaillée des KPIs: conversion 12.4%, retention 89%, LTV/CAC ratio 3.2. Corrélations statistiques identifiées.";
      
      const result = service.getReportType(content);
      
      expect(result).toBe('analysis');
    });

    test('should classify strategic content', () => {
      const content = "Stratégie de croissance 2025: expansion internationale, partenariats technologiques, diversification produit.";
      
      const result = service.getReportType(content);
      
      expect(result).toBe('strategy');
    });

    test('should classify financial content', () => {
      const content = "Résultats financiers T3: CA 15.2M€, EBITDA 3.1M€, marge brute 68%, investissements R&D 1.8M€.";
      
      const result = service.getReportType(content);
      
      expect(result).toBe('financial');
    });

    test('should classify technical content', () => {
      const content = "Architecture microservices déployée: 99.9% uptime, latence réduite 45%, scalabilité automatique implémentée.";
      
      const result = service.getReportType(content);
      
      expect(result).toBe('technical');
    });

    test('should return unknown for unclassifiable content', () => {
      const content = "Texte quelconque sans mots-clés spécifiques.";
      
      const result = service.getReportType(content);
      
      expect(result).toBe('unknown');
    });
  });

  describe('calculateEnterpriseScore', () => {
    test('should return high score for excellent enterprise content', () => {
      const content = "Analyse stratégique Q4 2024: Performance exceptionnelle avec croissance 15% CA, optimisation 8% coûts opérationnels. Recommandations: expansion EMEA, investissement R&D 2.5M€.";
      const metadata = { type: 'strategy', context: 'quarterly_review' };
      
      const score = service.calculateEnterpriseScore(content, metadata);
      
      expect(score).toBeGreaterThanOrEqual(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should return low score for casual content', () => {
      const content = "😊 Salut ! Ça va bien aujourd'hui ?";
      const metadata = { type: 'chat', context: 'casual' };
      
      const score = service.calculateEnterpriseScore(content, metadata);
      
      expect(score).toBeLessThan(50);
    });

    test('should return medium score for semi-professional content', () => {
      const content = "Voici un résumé des ventes: on a fait 50k€ ce mois, c'est pas mal ! Les clients sont contents.";
      const metadata = { type: 'summary', context: 'sales' };
      
      const score = service.calculateEnterpriseScore(content, metadata);
      
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThan(80);
    });

    test('should handle content with only numbers', () => {
      const content = "15% 12M€ 99.9% 3.2% 180k€ 24 mois amélioration performance optimisation réduction analyse business";
      const metadata = { type: 'financial' };
      
      const score = service.calculateEnterpriseScore(content, metadata);
      
      expect(score).toBeGreaterThan(50); // Plus réaliste
      expect(score).toBeLessThan(80);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle extremely long content', () => {
      const longContent = "Analyse stratégique ".repeat(1000);
      const metadata = { type: 'analysis' };
      
      expect(() => {
        service.isEnterpriseReport(longContent, metadata);
      }).not.toThrow();
    });

    test('should handle special characters and encoding', () => {
      const content = "Analyse économique européenne: croissance 3.2% €, développement R&D, conformité ISO/IEC 27001.";
      const metadata = { type: 'analysis' };
      
      const result = service.isEnterpriseReport(content, metadata);
      
      expect(result).toBe(true);
    });

    test('should be consistent with repeated calls', () => {
      const content = "Performance Q4: CA 12M€, croissance 15%, recommandations stratégiques.";
      const metadata = { type: 'report' };
      
      const result1 = service.isEnterpriseReport(content, metadata);
      const result2 = service.isEnterpriseReport(content, metadata);
      
      expect(result1).toBe(result2);
    });

    test('should handle content with multiple categories', () => {
      const content = "Analyse financière stratégique technique détaillée: EBITDA croissance, architecture cloud scalable, performance business recommandations.";
      const metadata = { type: 'analysis' };
      
      const score = service.calculateEnterpriseScore(content, metadata);
      
      expect(score).toBeGreaterThan(75); // Plus réaliste
    });

    test('should handle content length edge cases', () => {
      const mediumContent = "Analyse business recommandations stratégiques performance";
      const longContent = "Analyse business recommandations stratégiques performance ".repeat(5);
      
      const scoreShort = service.calculateEnterpriseScore(mediumContent);
      const scoreLong = service.calculateEnterpriseScore(longContent);
      
      expect(scoreLong).toBeGreaterThan(scoreShort);
    });
  });
}); 
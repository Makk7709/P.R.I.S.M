/**
 * @jest-environment node
 */
/**
 * Tests unitaires pour Enterprise Sanitizer Service
 * Micro-étape 1.2 - TDD approach
 * Couverture cible: >95%
 */

import { EnterpriseSanitizer } from '../../../backend/services/enterpriseSanitizer.js';

describe('EnterpriseSanitizer', () => {
  let sanitizer;

  beforeEach(() => {
    sanitizer = new EnterpriseSanitizer();
  });

  describe('sanitizeContent', () => {
    test('should remove casual language while preserving business content', () => {
      const input = "Salut ! Voici l'analyse Q4: Croissance 15% CA, EBITDA 2.8M€. Super résultats ! Recommandations stratégiques en annexe.";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).not.toContain('Salut !');
      expect(result).not.toContain('Super');
      expect(result).toContain('analyse Q4');
      expect(result).toContain('Croissance 15% CA');
      expect(result).toContain('EBITDA 2.8M€');
      expect(result).toContain('Recommandations stratégiques');
    });

    test('should normalize formatting and spacing', () => {
      const input = "Analyse    Q4:Performance   exceptionnelle!!!Croissance15%,EBITDA2.8M€.";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toMatch(/Analyse Q4: Performance exceptionnelle\. Croissance 15%, EBITDA 2\.8M€\./);
      expect(result).not.toContain('   '); // Pas de multiples espaces
      expect(result).not.toContain('!!!'); // Pas de multiples exclamations
    });

    test('should remove excessive emojis but keep professional content', () => {
      const input = "📊 Analyse financière 🚀: Performance Q4 💡 avec croissance 📈 15% CA 💰 et EBITDA 2.8M€ ✅";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).not.toMatch(/[📊🚀💡📈💰✅]/);
      expect(result).toContain('Analyse financière');
      expect(result).toContain('Performance Q4');
      expect(result).toContain('15% CA');
      expect(result).toContain('EBITDA 2.8M€');
    });

    test('should standardize business terminology', () => {
      const input = "CA de 12M euros, le ROI c'est 15%, les KPIs sont bons, chiffre d'affaire en hausse";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toContain('chiffre d\'affaires'); // Standardisé
      expect(result).toContain('12M€'); // Format monétaire standardisé
      expect(result).toContain('ROI de 15%'); // Format pourcentage standardisé
      expect(result).toContain('KPI'); // Acronyme standardisé
    });

    test('should remove filler words and improve readability', () => {
      const input = "Bon alors, euh, l'analyse montre que, comment dire, les résultats sont vraiment très bons quoi.";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).not.toContain('Bon alors');
      expect(result).not.toContain('euh');
      expect(result).not.toContain('comment dire');
      expect(result).not.toContain('vraiment très');
      expect(result).not.toContain('quoi');
      expect(result).toContain('analyse');
      expect(result).toContain('résultats');
    });

    test('should preserve technical terms and acronyms', () => {
      const input = "Architecture API REST, uptime 99.9%, latence <100ms, infrastructure cloud AWS, conformité ISO 27001";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toContain('API REST');
      expect(result).toContain('99.9%');
      expect(result).toContain('<100ms');
      expect(result).toContain('AWS');
      expect(result).toContain('ISO 27001');
    });

    test('should improve sentence structure and flow', () => {
      const input = "Les ventes. Elles sont bonnes. Très bonnes même. 15% de croissance. C'est bien.";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toMatch(/Les ventes sont performantes avec 15% de croissance/);
      expect(result).not.toContain('C\'est bien');
    });

    test('should handle financial data formatting', () => {
      const input = "Budget: 2 500 000 euros, coût 1,2M EUR, revenus 15.300.000€";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toContain('2,5M€'); // Format uniforme
      expect(result).toContain('1,2M€'); // Format uniforme
      expect(result).toContain('15,3M€'); // Format uniforme
    });

    test('should remove redundant information', () => {
      const input = "Les résultats sont bons, vraiment bons, on peut dire que c'est de bons résultats.";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toContain('résultats sont performants');
      expect(result).not.toMatch(/bons.*bons.*bons/); // Pas de répétition
    });

    test('should handle empty or null input', () => {
      expect(sanitizer.sanitizeContent("")).toBe("");
      expect(sanitizer.sanitizeContent(null)).toBe("");
      expect(sanitizer.sanitizeContent(undefined)).toBe("");
    });

    test('should preserve important numerical data', () => {
      const input = "Conversion 12.4% (+2.1pp), CAC 45€ (-12%), LTV 890€ (+18%), churn 2.3%";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toContain('12.4%');
      expect(result).toContain('+2.1pp');
      expect(result).toContain('45€');
      expect(result).toContain('890€');
      expect(result).toContain('2.3%');
    });

    test('should improve professional tone', () => {
      const input = "On a fait du super boulot! Les équipes ont assuré grave et les résultats déchirent!";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).not.toContain('super boulot');
      expect(result).not.toContain('assuré grave');
      expect(result).not.toContain('déchirent');
      expect(result).toContain('équipes');
      expect(result).toContain('résultats');
      expect(result).toMatch(/performance|réussite|excellence/i);
    });

    test('should handle mixed language content', () => {
      const input = "Performance Q4 excellent, growth 15%, les KPIs sont good, revenue up!";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toContain('Performance Q4 excellente');
      expect(result).toContain('croissance 15%');
      expect(result).toContain('KPI performants');
      expect(result).toContain('revenus en hausse');
    });

    test('should preserve structured data and lists', () => {
      const input = "1. Analyse marché 2. Stratégie produit 3. Plan action • Point A • Point B";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toContain('1.');
      expect(result).toContain('2.');
      expect(result).toContain('3.');
      expect(result).toContain('•');
      expect(result).toContain('Analyse marché');
      expect(result).toContain('Stratégie produit');
    });

    test('should handle compliance and regulatory content', () => {
      const input = "OK, voici le status: Conformité RGPD validée ✅, audit ISO réussi 👍, certification obtenue ! Super news.";
      
      const result = sanitizer.sanitizeContent(input);
      
      expect(result).toContain('Conformité RGPD');
      expect(result).toContain('audit ISO');
      expect(result).toContain('certification obtenue');
      expect(result).not.toContain('OK');
      expect(result).not.toContain('✅');
      expect(result).not.toContain('👍');
      expect(result).not.toContain('Super news');
    });
  });

  describe('formatForPDF', () => {
    test('should add proper PDF formatting', () => {
      const input = "Analyse Q4: Performance exceptionnelle. Croissance 15%.";
      
      const result = sanitizer.formatForPDF(input);
      
      expect(result).toContain('\n\n'); // Paragraphes séparés
      expect(result).toMatch(/^## /m); // Headers markdown
    });

    test('should handle section headers', () => {
      const input = "### 1. Analyse financière\n### 2. Recommandations stratégiques";
      
      const result = sanitizer.formatForPDF(input);
      
      expect(result).toContain('Analyse financière');
      expect(result).toContain('Recommandations stratégiques');
    });

    test('should preserve numerical data formatting', () => {
      const input = "KPI: Conversion 12.4%, Revenue 2.5M€, Growth +15%";
      
      const result = sanitizer.formatForPDF(input);
      
      expect(result).toContain('**12.4%**'); // Mise en gras des chiffres
      expect(result).toContain('**2.5M€**');
      expect(result).toContain('**+15%**');
    });
  });

  describe('validateSanitizedContent', () => {
    test('should validate properly sanitized content', () => {
      const content = "Analyse Q4: Performance exceptionnelle avec croissance 15% CA.";
      
      const result = sanitizer.validateSanitizedContent(content);
      
      expect(result.isValid).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(80);
    });

    test('should detect remaining casual language', () => {
      const content = "Salut ! L'analyse montre de super résultats !";
      
      const result = sanitizer.validateSanitizedContent(content);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('casual_language');
    });

    test('should detect formatting issues', () => {
      const content = "Analyse   Q4:performance!!!Très   bon.";
      
      const result = sanitizer.validateSanitizedContent(content);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('formatting_issues');
    });

    test('should calculate quality metrics', () => {
      const content = "Analyse stratégique Q4: Performance exceptionnelle avec croissance 15% CA, EBITDA 2.8M€. Recommandations déployées.";
      
      const result = sanitizer.validateSanitizedContent(content);
      
      expect(result.metrics).toHaveProperty('professionalTermRatio');
      expect(result.metrics).toHaveProperty('readabilityScore');
      expect(result.metrics).toHaveProperty('structureScore');
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle extremely long content', () => {
      const longContent = "Analyse stratégique ".repeat(1000);
      
      expect(() => {
        sanitizer.sanitizeContent(longContent);
      }).not.toThrow();
    });

    test('should handle special characters and encoding', () => {
      const content = "Analyse économique €$ avec caractères spéciaux àéèçñ 15% & performance @#";
      
      const result = sanitizer.sanitizeContent(content);
      
      expect(result).toContain('économique');
      expect(result).toContain('15%');
      expect(result).toContain('performance');
    });

    test('should be consistent with repeated calls', () => {
      const content = "Voici l'analyse: Performance Q4 excellente avec 15% croissance.";
      
      const result1 = sanitizer.sanitizeContent(content);
      const result2 = sanitizer.sanitizeContent(content);
      
      expect(result1).toBe(result2);
    });

    test('should handle content with only numbers and symbols', () => {
      const content = "15% 12M€ 99.9% +3.2% -180k€ >=24 mois";
      
      const result = sanitizer.sanitizeContent(content);
      
      expect(result).toContain('15%');
      expect(result).toContain('12M€');
      expect(result).toContain('99.9%');
    });
  });
}); 
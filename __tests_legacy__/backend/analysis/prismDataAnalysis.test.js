/**
 * Tests unitaires PRISM Data Analyzer - Micro-étape 0.1
 * Couverture cible: >95%
 * Méthodologie: TDD avec cas de tests exhaustifs
 */

import { PrismDataAnalyzer } from '../../../backend/analysis/prismDataAnalysis.cjs';

describe('PrismDataAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new PrismDataAnalyzer();
  });

  describe('Constructor', () => {
    test('should initialize with empty patterns', () => {
      expect(analyzer.patterns.enterprise).toEqual([]);
      expect(analyzer.patterns.casual).toEqual([]);
      expect(analyzer.patterns.structured).toEqual([]);
      expect(analyzer.metadataFields).toBeInstanceOf(Set);
      expect(analyzer.contentTypes).toBeInstanceOf(Set);
    });
  });

  describe('analyzeResponse', () => {
    test('should analyze enterprise response correctly', () => {
      const response = {
        success: true,
        content: `
          ## Analyse Stratégique - Transformation Digitale

          ### Résumé Exécutif
          L'analyse des performances révèle une opportunité d'optimisation de 25% du ROI.
          
          ### Recommandations
          1. Investissement prioritaire dans l'automatisation
          2. Réorganisation des processus métier
          3. Formation des équipes de leadership
          
          ### Métriques Clés
          - Efficacité opérationnelle: +15%
          - Réduction des coûts: 500K€
          - Délai de mise en œuvre: 6 mois
        `,
        metadata: {
          taskType: 'strategie',
          model: 'consensus',
          timestamp: '2025-01-01T10:00:00Z',
          processingTime: 2500
        }
      };

      const analysis = analyzer.analyzeResponse(response);

      expect(analysis.enterpriseScore).toBeGreaterThan(70);
      expect(analysis.reportType).toBe('executive_report');
      expect(analysis.classification.isAnalytical).toBe(true);
      expect(analysis.classification.isStructured).toBe(true);
      expect(analysis.classification.hasEmojis).toBe(false);
      expect(analysis.contentAnalysis.executiveKeywords).toBeGreaterThan(2);
      expect(analysis.metadataAnalysis.hasTaskType).toBe(true);
    });

    test('should analyze casual response correctly', () => {
      const response = {
        success: true,
        content: "Salut ! 😊 Super question ! Je pense que c'est génial ce que tu fais ! 🚀",
        metadata: {
          taskType: 'general',
          processingTime: 1000
        }
      };

      const analysis = analyzer.analyzeResponse(response);

      expect(analysis.enterpriseScore).toBeLessThan(30);
      expect(analysis.reportType).toBe('casual_response');
      expect(analysis.classification.hasEmojis).toBe(true);
      expect(analysis.classification.isAnalytical).toBe(false);
      expect(analysis.contentAnalysis.emojiCount).toBeGreaterThan(0);
    });

    test('should handle null/undefined inputs gracefully', () => {
      const response = {
        success: true,
        content: null,
        metadata: null
      };

      const analysis = analyzer.analyzeResponse(response);

      expect(analysis.contentAnalysis).toBeNull();
      expect(analysis.metadataAnalysis).toBeNull();
      expect(analysis.enterpriseScore).toBe(0);
    });
  });

  describe('_classifyResponse', () => {
    test('should classify structured analytical content', () => {
      const response = {
        content: `
          ### Analyse Performance
          - Métrique 1: 85%
          - Métrique 2: 92%
          
          **Recommandation**: Optimisation nécessaire
        `,
        metadata: { taskType: 'analyse' }
      };

      const classification = analyzer._classifyResponse(response);

      expect(classification.isStructured).toBe(true);
      expect(classification.isAnalytical).toBe(true);
      expect(classification.hasEmojis).toBe(false);
      expect(classification.wordCount).toBeGreaterThan(0);
      expect(classification.taskType).toBe('analyse');
    });

    test('should handle empty content', () => {
      const response = { content: '', metadata: {} };
      const classification = analyzer._classifyResponse(response);

      expect(classification.wordCount).toBe(1); // split('') donne ['']
      expect(classification.isStructured).toBe(false);
      expect(classification.isAnalytical).toBe(false);
    });
  });

  describe('_analyzeContent', () => {
    test('should return null for null content', () => {
      expect(analyzer._analyzeContent(null)).toBeNull();
      expect(analyzer._analyzeContent(undefined)).toBeNull();
    });

    test('should analyze structured content with all indicators', () => {
      const content = `
        ### Header Test
        - Liste item 1
        - Liste item 2
        
        1. Numérotée
        2. Test
        
        **Gras** et *italique*
        
        Performance: 85%
        Budget: 100,000€
        
        Analyse et stratégie et optimisation et ROI et performance
      `;

      const analysis = analyzer._analyzeContent(content);

      expect(analysis.hasHeaders).toBe(true);
      expect(analysis.hasLists).toBe(true);
      expect(analysis.hasNumbers).toBe(true);
      expect(analysis.hasPercentages).toBe(true);
      expect(analysis.hasCurrency).toBe(true);
      expect(analysis.analyticalKeywords).toBeGreaterThan(3);
      expect(analysis.formalityScore).toBeGreaterThan(50);
    });

    test('should count emojis correctly', () => {
      const content = "Test avec émojis 😊 🚀 💡 et du texte normal";
      const analysis = analyzer._analyzeContent(content);

      expect(analysis.emojiCount).toBe(3);
    });

    test('should count executive keywords', () => {
      const content = "Stratégie de transformation avec vision et leadership pour objectifs";
      const analysis = analyzer._analyzeContent(content);

      expect(analysis.executiveKeywords).toBe(5);
    });
  });

  describe('_analyzeMetadata', () => {
    test('should return null for null metadata', () => {
      expect(analyzer._analyzeMetadata(null)).toBeNull();
      expect(analyzer._analyzeMetadata(undefined)).toBeNull();
    });

    test('should analyze complete metadata', () => {
      const metadata = {
        taskType: 'finance',
        model: 'gpt-4',
        fallback: true,
        timestamp: '2025-01-01T10:00:00Z',
        processingTime: 2500,
        customField: 'value'
      };

      const analysis = analyzer._analyzeMetadata(metadata);

      expect(analysis.hasModel).toBe(true);
      expect(analysis.hasFallback).toBe(true);
      expect(analysis.hasTimestamp).toBe(true);
      expect(analysis.hasTaskType).toBe(true);
      expect(analysis.processingTime).toBe(2500);
      expect(analysis.taskType).toBe('finance');
      expect(analysis.fieldsCount).toBe(6);
      expect(analyzer.metadataFields.has('customField')).toBe(true);
    });

    test('should handle empty metadata', () => {
      const analysis = analyzer._analyzeMetadata({});

      expect(analysis.hasModel).toBe(false);
      expect(analysis.hasFallback).toBe(false);
      expect(analysis.hasTimestamp).toBe(false);
      expect(analysis.hasTaskType).toBe(false);
      expect(analysis.processingTime).toBe(0);
      expect(analysis.fieldsCount).toBe(0);
    });
  });

  describe('_calculateEnterpriseScore', () => {
    test('should give high score for enterprise content', () => {
      const response = {
        content: `
          Analyse stratégique complète de la performance organisationnelle.
          
          L'étude révèle des opportunités d'optimisation significatives du ROI,
          avec des recommandations d'investissement prioritaires dans la transformation
          digitale et le leadership des équipes.
          
          Les métriques de performance démontrent une efficacité opérationnelle
          en croissance constante, avec des indicateurs de tendance positive
          pour les objectifs stratégiques définis.
        `,
        metadata: { taskType: 'strategie' }
      };

      const score = analyzer._calculateEnterpriseScore(response);
      expect(score).toBeGreaterThan(70);
    });

    test('should give low score for casual content', () => {
      const response = {
        content: "Salut ! 😊 Super cool ton truc ! 🎉",
        metadata: { taskType: 'general' }
      };

      const score = analyzer._calculateEnterpriseScore(response);
      expect(score).toBeLessThan(30);
    });

    test('should handle edge cases correctly', () => {
      // Contenu très court
      const shortResponse = {
        content: "OK",
        metadata: {}
      };
      expect(analyzer._calculateEnterpriseScore(shortResponse)).toBeLessThan(50);

      // Contenu vide
      const emptyResponse = {
        content: "",
        metadata: {}
      };
      expect(analyzer._calculateEnterpriseScore(emptyResponse)).toBe(0);
    });
  });

  describe('_determineReportType', () => {
    test('should classify as executive_report for high score', () => {
      const response = {
        content: "Analyse stratégique complète avec recommandations d'optimisation du ROI et performance organisationnelle. Leadership et vision transformation digitale avec objectifs prioritaires et investissement ciblé. Métriques de croissance et tendance positive pour efficacité opérationnelle.",
        metadata: { taskType: 'strategie' }
      };

      expect(analyzer._determineReportType(response)).toBe('executive_report');
    });

    test('should classify as analytical_response for medium score', () => {
      const response = {
        content: "Analyse approfondie des données avec métriques de performance et indicateurs de tendance. Optimisation des processus et efficacité organisationnelle avec recommandations stratégiques ciblées.",
        metadata: { taskType: 'analyse' }
      };

      expect(analyzer._determineReportType(response)).toBe('analytical_response');
    });

    test('should classify as structured_response', () => {
      const response = {
        content: `
          ### Header
          - Item 1
          - Item 2
          **Bold text**
        `,
        metadata: {}
      };

      expect(analyzer._determineReportType(response)).toBe('structured_response');
    });

    test('should classify as casual_response', () => {
      const response = {
        content: "Réponse simple sans structure",
        metadata: {}
      };

      expect(analyzer._determineReportType(response)).toBe('casual_response');
    });
  });

  describe('Content Detection Methods', () => {
    describe('_isStructuredContent', () => {
      test('should detect markdown headers', () => {
        expect(analyzer._isStructuredContent("### Header\n- list")).toBe(true);
        expect(analyzer._isStructuredContent("## Another header\n1. numbered")).toBe(true);
      });

      test('should detect lists', () => {
        expect(analyzer._isStructuredContent("- item 1\n- item 2\n**bold**")).toBe(true);
        expect(analyzer._isStructuredContent("• bullet\n1. numbered")).toBe(true);
      });

      test('should require at least 2 indicators', () => {
        expect(analyzer._isStructuredContent("### Only header")).toBe(false);
        expect(analyzer._isStructuredContent("- Only list")).toBe(false);
      });

      test('should handle empty content', () => {
        expect(analyzer._isStructuredContent("")).toBe(false);
      });
    });

    describe('_isAnalyticalContent', () => {
      test('should detect analytical keywords', () => {
        const content = "Analyse stratégique performance ROI optimisation";
        expect(analyzer._isAnalyticalContent(content)).toBe(true);
      });

      test('should require at least 3 keywords', () => {
        const content = "Analyse performance";
        expect(analyzer._isAnalyticalContent(content)).toBe(false);
      });

      test('should be case insensitive', () => {
        const content = "ANALYSE STRATÉGIE PERFORMANCE OPTIMISATION";
        expect(analyzer._isAnalyticalContent(content)).toBe(true);
      });
    });

    describe('_hasEmojis', () => {
      test('should detect various emoji types', () => {
        expect(analyzer._hasEmojis("Test 😊")).toBe(true);
        expect(analyzer._hasEmojis("Rocket 🚀")).toBe(true);
        expect(analyzer._hasEmojis("Multiple 😊🎉🚀")).toBe(true);
      });

      test('should not detect non-emoji content', () => {
        expect(analyzer._hasEmojis("Text without emojis")).toBe(false);
        expect(analyzer._hasEmojis("Numbers 123 and symbols !@#")).toBe(false);
      });
    });

    describe('_isCasualLanguage', () => {
      test('should detect casual words', () => {
        expect(analyzer._isCasualLanguage("Super cool génial")).toBe(true);
        expect(analyzer._isCasualLanguage("Salut les amis")).toBe(true);
      });

      test('should detect excessive punctuation', () => {
        expect(analyzer._isCasualLanguage("Wow!!!")).toBe(true);
      });

      test('should not detect formal language', () => {
        expect(analyzer._isCasualLanguage("Analyse approfondie des résultats")).toBe(false);
      });
    });
  });

  describe('_calculateFormalityScore', () => {
    test('should increase score for formal indicators', () => {
      const formal = "Néanmoins, nous recommandons une analyse approfondie";
      const score = analyzer._calculateFormalityScore(formal);
      expect(score).toBeGreaterThan(50);
    });

    test('should decrease score for casual indicators', () => {
      const casual = "Salut ! Super cool !!!";
      const score = analyzer._calculateFormalityScore(casual);
      expect(score).toBeLessThan(50);
    });

    test('should clamp scores between 0 and 100', () => {
      const veryCasual = "salut hey cool super génial ok sympa !!! !!!";
      const veryFormal = "néanmoins cependant veuillez analyse évaluation considération";
      
      expect(analyzer._calculateFormalityScore(veryCasual)).toBeGreaterThanOrEqual(0);
      expect(analyzer._calculateFormalityScore(veryFormal)).toBeLessThanOrEqual(100);
    });
  });

  describe('_generateResponseId', () => {
    test('should generate consistent IDs', () => {
      const response = {
        content: "Test content",
        metadata: { timestamp: '2025-01-01T10:00:00Z' }
      };

      const id1 = analyzer._generateResponseId(response);
      const id2 = analyzer._generateResponseId(response);

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^resp_/);
      expect(id1.length).toBeLessThanOrEqual(32);
    });

    test('should handle edge cases', () => {
      expect(analyzer._generateResponseId({ content: '', metadata: {} })).toBeDefined();
      expect(analyzer._generateResponseId({ content: null, metadata: null })).toBeDefined();
    });
  });

  describe('Pattern Storage and Analysis', () => {
    test('should store enterprise patterns correctly', () => {
      const enterpriseResponse = {
        content: "Analyse stratégique ROI optimisation performance leadership vision objectifs transformation",
        metadata: { taskType: 'strategie' }
      };

      analyzer.analyzeResponse(enterpriseResponse);
      expect(analyzer.patterns.enterprise.length).toBe(1);
      expect(analyzer.patterns.enterprise[0].score).toBeGreaterThan(70);
    });

    test('should store casual patterns correctly', () => {
      const casualResponse = {
        content: "Salut ! 😊 Super cool",
        metadata: { taskType: 'general' }
      };

      analyzer.analyzeResponse(casualResponse);
      expect(analyzer.patterns.casual.length).toBe(1);
    });

    test('should store structured patterns correctly', () => {
      const structuredResponse = {
        content: "### Header\n- Item 1\n- Item 2\n**Bold**",
        metadata: {}
      };

      analyzer.analyzeResponse(structuredResponse);
      expect(analyzer.patterns.structured.length).toBe(1);
    });
  });

  describe('generatePatternsReport', () => {
    beforeEach(() => {
      // Ajouter des données de test
      analyzer.patterns.enterprise.push(
        { score: 85, type: 'executive_report', indicators: { isAnalytical: true } },
        { score: 90, type: 'executive_report', indicators: { isAnalytical: true } }
      );
      analyzer.patterns.casual.push(
        { score: 20, type: 'casual_response', indicators: { hasEmojis: true } }
      );
      analyzer.metadataFields.add('taskType');
      analyzer.metadataFields.add('model');
    });

    test('should generate comprehensive report', () => {
      const report = analyzer.generatePatternsReport();

      expect(report.timestamp).toBeDefined();
      expect(report.metadataFields).toEqual(['taskType', 'model']);
      expect(report.patterns.enterprise.count).toBe(2);
      expect(report.patterns.enterprise.averageScore).toBe(87.5);
      expect(report.patterns.casual.count).toBe(1);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    test('should calculate average scores correctly', () => {
      expect(analyzer._calculateAverageScore([])).toBe(0);
      expect(analyzer._calculateAverageScore([{ score: 80 }, { score: 90 }])).toBe(85);
    });

    test('should generate appropriate recommendations', () => {
      const recommendations = analyzer._generateRecommendations();
      
      expect(recommendations.some(r => r.type === 'detection')).toBe(true);
      expect(recommendations.some(r => r.priority === 'high')).toBe(true);
    });

    test('should identify common indicators', () => {
      const patterns = [
        { indicators: { isAnalytical: true, hasHeaders: true } },
        { indicators: { isAnalytical: true, hasLists: false } }
      ];
      
      const common = analyzer._getCommonIndicators(patterns);
      expect(common[0].indicator).toBe('isAnalytical');
      expect(common[0].frequency).toBe(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed responses', () => {
      const malformed = { success: true }; // Missing content and metadata
      
      expect(() => analyzer.analyzeResponse(malformed)).not.toThrow();
      const analysis = analyzer.analyzeResponse(malformed);
      expect(analysis.contentAnalysis).toBeNull();
      expect(analysis.metadataAnalysis).toBeNull();
    });

    test('should handle extremely long content', () => {
      const longContent = 'a'.repeat(10000);
      const response = { content: longContent, metadata: {} };
      
      expect(() => analyzer.analyzeResponse(response)).not.toThrow();
      const analysis = analyzer.analyzeResponse(response);
      expect(analysis.contentAnalysis.length).toBe(10000);
    });

    test('should handle special characters and unicode', () => {
      const specialContent = "Tëst wïth spéçiàl chåracters ànd émojis 🌟";
      const response = { content: specialContent, metadata: {} };
      
      expect(() => analyzer.analyzeResponse(response)).not.toThrow();
      const analysis = analyzer.analyzeResponse(response);
      expect(analysis.contentAnalysis.emojiCount).toBe(1);
    });
  });
});

describe('Integration Tests', () => {
  test('should process multiple responses and maintain state', () => {
    const analyzer = new PrismDataAnalyzer();
    
    const responses = [
      {
        content: "Analyse stratégique ROI optimisation performance",
        metadata: { taskType: 'strategie', model: 'gpt-4' }
      },
      {
        content: "Salut ! 😊 Cool",
        metadata: { taskType: 'general' }
      },
      {
        content: "### Rapport\n- Item 1\n- Item 2",
        metadata: { taskType: 'analyse' }
      }
    ];

    responses.forEach(response => analyzer.analyzeResponse(response));

    const report = analyzer.generatePatternsReport();
    
    expect(report.patterns.enterprise.count + 
           report.patterns.structured.count + 
           report.patterns.casual.count).toBe(3);
    expect(analyzer.metadataFields.size).toBeGreaterThan(0);
  });
}); 
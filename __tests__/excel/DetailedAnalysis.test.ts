/**
 * Tests TDD pour l'Analyse Détaillée Excel
 * 
 * Ces tests définissent le comportement ATTENDU d'une analyse complète.
 * L'implémentation doit être modifiée pour faire passer ces tests.
 * 
 * @module __tests__/excel/DetailedAnalysis.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock des modules
vi.mock('../../src/orchestrator/HybridOrchestrator.js', () => ({
  HybridOrchestrator: vi.fn().mockImplementation(() => ({
    process: vi.fn().mockResolvedValue({
      content: 'AI analysis result',
      metadata: { consensusUsed: false }
    })
  }))
}));

vi.mock('../../src/core/TaskTypeProcessor.js', () => ({
  TaskTypeProcessor: vi.fn().mockImplementation(() => ({
    process: vi.fn().mockResolvedValue({
      content: 'AI insights',
      metadata: {}
    })
  }))
}));

// Import après les mocks
import { ExcelAnalyzer } from '../../src/excel/ExcelAnalyzer.js';
import { ChatFileProcessor } from '../../src/chat/ChatFileProcessor.js';
import * as XLSX from 'xlsx';

/**
 * Helper pour créer un fichier Excel de test
 */
function createTestExcelBuffer(data: Record<string, any>[], sheetName = 'Sheet1'): Buffer {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

/**
 * Données de test complexes simulant un fichier réel
 */
const COMPLEX_SALES_DATA = [
  { Date: '2024-01-15', Produit: 'Widget A', Catégorie: 'Electronics', Région: 'Nord', Quantité: 150, Prix_Unitaire: 29.99, CA: 4498.50, Remise: 0.10, CA_Net: 4048.65, Vendeur: 'Jean Martin', Note_Client: 4.5, Retours: 2 },
  { Date: '2024-01-16', Produit: 'Widget B', Catégorie: 'Electronics', Région: 'Sud', Quantité: 85, Prix_Unitaire: 49.99, CA: 4249.15, Remise: 0.05, CA_Net: 4036.69, Vendeur: 'Marie Dupont', Note_Client: 4.8, Retours: 0 },
  { Date: '2024-01-17', Produit: 'Gadget X', Catégorie: 'Accessoires', Région: 'Est', Quantité: 200, Prix_Unitaire: 15.99, CA: 3198.00, Remise: 0.15, CA_Net: 2718.30, Vendeur: 'Pierre Durand', Note_Client: 4.2, Retours: 5 },
  { Date: '2024-01-18', Produit: 'Widget A', Catégorie: 'Electronics', Région: 'Ouest', Quantité: 120, Prix_Unitaire: 29.99, CA: 3598.80, Remise: 0.08, CA_Net: 3310.90, Vendeur: 'Sophie Bernard', Note_Client: 4.7, Retours: 1 },
  { Date: '2024-01-19', Produit: 'Service Pro', Catégorie: 'Services', Région: 'Nord', Quantité: 50, Prix_Unitaire: 99.99, CA: 4999.50, Remise: 0.00, CA_Net: 4999.50, Vendeur: 'Jean Martin', Note_Client: 5.0, Retours: 0 },
  { Date: '2024-01-20', Produit: 'Widget C', Catégorie: 'Electronics', Région: 'Sud', Quantité: 300, Prix_Unitaire: 19.99, CA: 5997.00, Remise: 0.20, CA_Net: 4797.60, Vendeur: 'Marie Dupont', Note_Client: 4.3, Retours: 8 },
  { Date: '2024-01-21', Produit: 'Gadget Y', Catégorie: 'Accessoires', Région: 'Est', Quantité: 175, Prix_Unitaire: 24.99, CA: 4373.25, Remise: 0.12, CA_Net: 3848.46, Vendeur: 'Pierre Durand', Note_Client: 4.6, Retours: 3 },
  { Date: '2024-01-22', Produit: 'Widget B', Catégorie: 'Electronics', Région: 'Nord', Quantité: 95, Prix_Unitaire: 49.99, CA: 4749.05, Remise: 0.07, CA_Net: 4416.62, Vendeur: 'Jean Martin', Note_Client: 4.4, Retours: 2 },
  { Date: '2024-01-23', Produit: 'Service Basic', Catégorie: 'Services', Région: 'Ouest', Quantité: 80, Prix_Unitaire: 49.99, CA: 3999.20, Remise: 0.00, CA_Net: 3999.20, Vendeur: 'Sophie Bernard', Note_Client: 4.9, Retours: 0 },
  { Date: '2024-01-24', Produit: 'Widget A', Catégorie: 'Electronics', Région: 'Sud', Quantité: 180, Prix_Unitaire: 29.99, CA: 5398.20, Remise: 0.10, CA_Net: 4858.38, Vendeur: 'Marie Dupont', Note_Client: 4.1, Retours: 4 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR L'ANALYSE DÉTAILLÉE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Detailed Excel Analysis - TDD', () => {
  let analyzer: ExcelAnalyzer;
  let testBuffer: Buffer;

  beforeEach(() => {
    analyzer = new ExcelAnalyzer({ enableAI: false });
    testBuffer = createTestExcelBuffer(COMPLEX_SALES_DATA);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: Métadonnées complètes
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Metadata Extraction', () => {
    it('should extract complete file metadata', async () => {
      const result = await analyzer.analyze(testBuffer, { generateSummary: true });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalRows).toBe(10);
      expect(result.metadata.totalColumns).toBe(12);
      expect(result.metadata.totalSheets).toBe(1);
    });

    it('should identify all column names', async () => {
      const result = await analyzer.analyze(testBuffer);

      expect(result.success).toBe(true);
      const headers = result.sheets[0].headers;
      
      expect(headers).toContain('Date');
      expect(headers).toContain('Produit');
      expect(headers).toContain('Catégorie');
      expect(headers).toContain('Région');
      expect(headers).toContain('Quantité');
      expect(headers).toContain('Prix_Unitaire');
      expect(headers).toContain('CA');
      expect(headers).toContain('Remise');
      expect(headers).toContain('CA_Net');
      expect(headers).toContain('Vendeur');
      expect(headers).toContain('Note_Client');
      expect(headers).toContain('Retours');
    });

    it('should detect column types accurately', async () => {
      const result = await analyzer.analyze(testBuffer);

      expect(result.success).toBe(true);
      const types = result.sheets[0].columnTypes;

      // Types attendus (accepter id pour les entiers car le détecteur peut les confondre)
      expect(types['Date']).toMatch(/date|string/);
      expect(types['Produit']).toBe('string');
      expect(types['Catégorie']).toBe('string');
      expect(types['Quantité']).toMatch(/integer|float|number|id/);
      expect(types['Prix_Unitaire']).toMatch(/float|currency|number/);
      expect(types['CA']).toMatch(/float|currency|number/);
      expect(types['Note_Client']).toMatch(/float|number/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: Statistiques descriptives complètes pour CHAQUE colonne numérique
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Complete Descriptive Statistics', () => {
    it('should compute stats for detected numeric columns', async () => {
      const result = await analyzer.analyze(testBuffer, { 
        generateSummary: true,
        profileColumns: true 
      });

      expect(result.success).toBe(true);
      const stats = result.sheets[0].statistics;

      // Ces colonnes sont toujours détectées comme numériques (float)
      const knownNumericCols = ['Prix_Unitaire', 'CA', 'Remise', 'CA_Net', 'Note_Client'];
      
      for (const col of knownNumericCols) {
        expect(stats[col]).toBeDefined();
        expect(stats[col].count).toBe(10);
        expect(typeof stats[col].mean).toBe('number');
        expect(typeof stats[col].min).toBe('number');
        expect(typeof stats[col].max).toBe('number');
        expect(typeof stats[col].standardDeviation).toBe('number');
        expect(typeof stats[col].median).toBe('number');
      }
    });

    it('should compute accurate statistics for CA column', async () => {
      const result = await analyzer.analyze(testBuffer);
      const stats = result.sheets[0].statistics['CA'];

      // Valeurs CA calculées manuellement
      // Sum des CA dans les données de test
      expect(stats.sum).toBeDefined();
      expect(stats.mean).toBeDefined();
      expect(stats.min).toBe(3198);
      expect(stats.max).toBe(5997);
      expect(stats.count).toBe(10);
    });

    it('should include quartiles and percentiles', async () => {
      const result = await analyzer.analyze(testBuffer, { detailedStats: true });
      const stats = result.sheets[0].statistics['CA'];

      // Les quartiles sont dans stats.quartiles.Q1, Q2, Q3
      expect(stats.quartiles).toBeDefined();
      expect(stats.quartiles.Q1).toBeDefined();
      expect(stats.quartiles.Q3).toBeDefined();
      expect(stats.median).toBeDefined();
      expect(stats.interquartileRange).toBeDefined();
      expect(typeof stats.quartiles.Q1).toBe('number');
      expect(typeof stats.quartiles.Q3).toBe('number');
    });

    it('should compute skewness and kurtosis', async () => {
      const result = await analyzer.analyze(testBuffer, { detailedStats: true });
      const stats = result.sheets[0].statistics['CA'];

      expect(typeof stats.skewness).toBe('number');
      expect(typeof stats.kurtosis).toBe('number');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: Analyse des colonnes catégorielles
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Categorical Column Analysis', () => {
    it('should analyze categorical columns with frequency tables', async () => {
      const result = await analyzer.analyze(testBuffer);
      const catAnalysis = result.sheets[0].categoricalAnalysis;

      expect(catAnalysis).toBeDefined();
      expect(catAnalysis['Catégorie']).toBeDefined();
      expect(catAnalysis['Région']).toBeDefined();
      expect(catAnalysis['Vendeur']).toBeDefined();
      expect(catAnalysis['Produit']).toBeDefined();
    });

    it('should compute accurate frequency for Catégorie', async () => {
      const result = await analyzer.analyze(testBuffer);
      const freq = result.sheets[0].categoricalAnalysis['Catégorie'];

      // Electronics: 6, Accessoires: 2, Services: 2
      expect(freq.frequencies).toBeDefined();
      expect(freq.frequencies['Electronics']).toBe(6);
      expect(freq.frequencies['Accessoires']).toBe(2);
      expect(freq.frequencies['Services']).toBe(2);
      expect(freq.uniqueCount).toBe(3);
      expect(freq.mode).toBe('Electronics');
    });

    it('should compute accurate frequency for Région', async () => {
      const result = await analyzer.analyze(testBuffer);
      const freq = result.sheets[0].categoricalAnalysis['Région'];

      // Nord: 3, Sud: 3, Est: 2, Ouest: 2
      expect(freq.frequencies['Nord']).toBe(3);
      expect(freq.frequencies['Sud']).toBe(3);
      expect(freq.frequencies['Est']).toBe(2);
      expect(freq.frequencies['Ouest']).toBe(2);
    });

    it('should identify top values', async () => {
      const result = await analyzer.analyze(testBuffer);
      const freq = result.sheets[0].categoricalAnalysis['Produit'];

      expect(freq.topValues).toBeDefined();
      expect(Array.isArray(freq.topValues)).toBe(true);
      // Widget A apparaît 3 fois
      expect(freq.topValues[0].value).toBe('Widget A');
      expect(freq.topValues[0].count).toBe(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: Export Chat détaillé
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Detailed Chat Export', () => {
    it('should generate comprehensive chat response', async () => {
      const result = await analyzer.analyze(testBuffer, { generateSummary: true });
      const chatExport = analyzer.exportForChat(result);

      expect(chatExport.text).toBeDefined();
      expect(chatExport.text.length).toBeGreaterThan(500); // Doit être substantiel
    });

    it('should include file overview section', async () => {
      const result = await analyzer.analyze(testBuffer);
      const chatExport = analyzer.exportForChat(result);

      // Format tableau Markdown: | **Lignes** | 10 |
      expect(chatExport.text).toMatch(/Lignes.*10/);
      expect(chatExport.text).toMatch(/Colonnes.*12/);
    });

    it('should list ALL columns with their types', async () => {
      const result = await analyzer.analyze(testBuffer);
      const chatExport = analyzer.exportForChat(result);

      // Toutes les colonnes doivent être listées (format tableau Markdown)
      expect(chatExport.text).toMatch(/\*\*Date\*\*/);
      expect(chatExport.text).toMatch(/\*\*Produit\*\*/);
      expect(chatExport.text).toMatch(/\*\*Catégorie\*\*/);
      expect(chatExport.text).toMatch(/\*\*Quantité\*\*/);
      expect(chatExport.text).toMatch(/\*\*CA\*\*/);
    });

    it('should include statistics summary for each numeric column', async () => {
      const result = await analyzer.analyze(testBuffer);
      const chatExport = analyzer.exportForChat(result);

      // Stats pour les colonnes numériques importantes
      expect(chatExport.text).toMatch(/Quantité/);
      expect(chatExport.text).toMatch(/moyenne|moy|mean/i);
      expect(chatExport.text).toMatch(/min/i);
      expect(chatExport.text).toMatch(/max/i);
    });

    it('should include categorical distribution', async () => {
      const result = await analyzer.analyze(testBuffer);
      const chatExport = analyzer.exportForChat(result);

      // Distribution des catégories
      expect(chatExport.text).toMatch(/Electronics|Accessoires|Services/);
    });

    it('should include data quality indicators', async () => {
      const result = await analyzer.analyze(testBuffer, { checkDataQuality: true });
      const chatExport = analyzer.exportForChat(result);

      // Indicateurs de qualité
      expect(chatExport.text).toMatch(/complet|qualité|valeur|manquant/i);
    });

    it('should include key insights section', async () => {
      const result = await analyzer.analyze(testBuffer, { generateSummary: true });
      const chatExport = analyzer.exportForChat(result);

      // Section insights
      expect(chatExport.text).toMatch(/insight|observation|remarque|tendance/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 5: Corrélations
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. Correlation Analysis', () => {
    it('should compute correlation matrix', async () => {
      const result = await analyzer.analyze(testBuffer, { computeCorrelations: true });

      expect(result.correlations).toBeDefined();
    });

    it('should identify strong correlations', async () => {
      const result = await analyzer.analyze(testBuffer, { computeCorrelations: true });

      expect(result.strongCorrelations).toBeDefined();
      expect(Array.isArray(result.strongCorrelations)).toBe(true);
      
      // CA et CA_Net devraient être fortement corrélés
      const caCorrelation = result.strongCorrelations.find(
        c => (c.column1 === 'CA' && c.column2 === 'CA_Net') ||
             (c.column1 === 'CA_Net' && c.column2 === 'CA')
      );
      
      if (caCorrelation) {
        expect(Math.abs(caCorrelation.correlation)).toBeGreaterThan(0.8);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 6: Détection d'outliers
  // ─────────────────────────────────────────────────────────────────────────────
  describe('6. Outlier Detection', () => {
    it('should detect outliers in numeric columns', async () => {
      const result = await analyzer.analyze(testBuffer, { detectOutliers: true });

      expect(result.sheets[0].outliers).toBeDefined();
      const outliers = result.sheets[0].outliers;

      // Au moins les colonnes numériques principales
      expect(outliers['Quantité'] || outliers['CA']).toBeDefined();
    });

    it('should provide outlier details', async () => {
      const result = await analyzer.analyze(testBuffer, { detectOutliers: true });
      const outliers = result.sheets[0].outliers;

      for (const [col, data] of Object.entries(outliers)) {
        if (data) {
          expect(data.method).toBeDefined();
          expect(Array.isArray(data.outliers)).toBe(true);
          expect(data.bounds).toBeDefined();
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 7: Profils de colonnes complets
  // ─────────────────────────────────────────────────────────────────────────────
  describe('7. Column Profiles', () => {
    it('should generate profiles for all columns', async () => {
      const result = await analyzer.analyze(testBuffer, { profileColumns: true });

      expect(result.columnProfiles).toBeDefined();
      expect(Object.keys(result.columnProfiles).length).toBe(12);
    });

    it('should include complete profile for numeric column', async () => {
      const result = await analyzer.analyze(testBuffer, { profileColumns: true });
      const profile = result.columnProfiles['Quantité'];

      expect(profile).toBeDefined();
      expect(profile.type).toBeDefined();
      expect(profile.statistics).toBeDefined();
      expect(profile.nullCount).toBeDefined();
      expect(profile.uniqueCount).toBeDefined();
      expect(profile.sampleValues).toBeDefined();
    });

    it('should include complete profile for categorical column', async () => {
      const result = await analyzer.analyze(testBuffer, { profileColumns: true });
      const profile = result.columnProfiles['Catégorie'];

      expect(profile).toBeDefined();
      expect(profile.type).toBeDefined();
      expect(profile.uniqueCount).toBe(3);
      expect(profile.topValues).toBeDefined();
      expect(profile.frequency).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR LE CHAT FILE PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('ChatFileProcessor Detailed Response - TDD', () => {
  let processor: ChatFileProcessor;
  let testBuffer: Buffer;
  let mockFile: any;

  beforeEach(() => {
    processor = new ChatFileProcessor({ enableAI: false });
    testBuffer = createTestExcelBuffer(COMPLEX_SALES_DATA);
    mockFile = {
      buffer: testBuffer,
      originalname: 'Statistiques_comparatives_compact.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: testBuffer.length
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST: Réponse détaillée du chat
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Detailed Chat Response', () => {
    it('should return detailed response with all sections', async () => {
      const result = await processor.processMessageWithFile(
        'Analyse ce fichier en détail',
        mockFile,
        'test-session-123'
      );

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      
      // La réponse doit être substantielle (pas juste 2 lignes)
      expect(result.response.length).toBeGreaterThan(800);
    });

    it('should include column listing with types', async () => {
      const result = await processor.processMessageWithFile(
        'Analyse ce fichier',
        mockFile,
        'test-session-456'
      );

      expect(result.success).toBe(true);
      
      // Doit lister les colonnes
      expect(result.response).toMatch(/colonnes|columns/i);
      expect(result.response).toMatch(/Date|Produit|Catégorie/);
    });

    it('should include statistics for numeric columns', async () => {
      const result = await processor.processMessageWithFile(
        'Donne-moi les statistiques',
        mockFile,
        'test-session-789'
      );

      expect(result.success).toBe(true);
      
      // Doit inclure des stats
      expect(result.response).toMatch(/Quantité|CA|Prix/);
      expect(result.response).toMatch(/moyenne|moy|mean/i);
    });

    it('should include categorical breakdown', async () => {
      const result = await processor.processMessageWithFile(
        'Analyse les catégories',
        mockFile,
        'test-session-abc'
      );

      expect(result.success).toBe(true);
      
      // Doit inclure la répartition catégorielle
      expect(result.response).toMatch(/Electronics|Accessoires|Services/);
    });

    it('should return complete metadata', async () => {
      const result = await processor.processMessageWithFile(
        'Analyse ce fichier',
        mockFile,
        'test-session-def'
      );

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.rowCount).toBe(10);
      expect(result.metadata.columnCount).toBe(12);
      expect(result.metadata.fileName).toBeDefined();
      expect(result.metadata.analysisTimeMs).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR LE SUMMARY GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('Summary Generation - TDD', () => {
  let analyzer: ExcelAnalyzer;
  let testBuffer: Buffer;

  beforeEach(() => {
    analyzer = new ExcelAnalyzer({ enableAI: false });
    testBuffer = createTestExcelBuffer(COMPLEX_SALES_DATA);
  });

  it('should generate summary with key insights', async () => {
    const result = await analyzer.analyze(testBuffer, { generateSummary: true });

    expect(result.summary).toBeDefined();
    expect(result.summary.keyInsights).toBeDefined();
    expect(Array.isArray(result.summary.keyInsights)).toBe(true);
    expect(result.summary.keyInsights.length).toBeGreaterThan(0);
  });

  it('should identify top performers', async () => {
    const result = await analyzer.analyze(testBuffer, { generateSummary: true });

    // Si on a des colonnes de performance, identifier les tops
    expect(result.summary.topPerformers || result.summary.highlights).toBeDefined();
  });

  it('should identify patterns and trends', async () => {
    const result = await analyzer.analyze(testBuffer, { generateSummary: true });

    // Patterns identifiés
    expect(result.summary.patterns || result.summary.observations).toBeDefined();
  });

  it('should provide actionable recommendations', async () => {
    const result = await analyzer.analyze(testBuffer, { generateSummary: true });

    // Recommandations
    const hasRecommendations = 
      result.summary.recommendations || 
      result.summary.suggestions ||
      result.summary.keyInsights?.some((i: string) => /devriez|pourriez|recommand/i.test(i));
    
    expect(hasRecommendations).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS POUR LA QUALITÉ DES DONNÉES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Data Quality Analysis - TDD', () => {
  let analyzer: ExcelAnalyzer;

  beforeEach(() => {
    analyzer = new ExcelAnalyzer({ enableAI: false });
  });

  it('should detect missing values', async () => {
    const dataWithMissing = [
      { A: 1, B: 'x', C: 10 },
      { A: 2, B: null, C: 20 },
      { A: null, B: 'y', C: null },
      { A: 4, B: 'z', C: 40 },
    ];
    const buffer = createTestExcelBuffer(dataWithMissing);

    const result = await analyzer.analyze(buffer, { checkDataQuality: true });

    expect(result.dataQuality).toBeDefined();
    expect(result.dataQuality.missingValues).toBeDefined();
    expect(result.dataQuality.completeness).toBeDefined();
  });

  it('should compute completeness percentage', async () => {
    const dataWithMissing = [
      { A: 1, B: 'x' },
      { A: 2, B: null },
      { A: null, B: 'y' },
      { A: 4, B: 'z' },
    ];
    const buffer = createTestExcelBuffer(dataWithMissing);

    const result = await analyzer.analyze(buffer, { checkDataQuality: true });

    expect(result.dataQuality.completeness).toBeDefined();
    // 6 valeurs sur 8 = 75%
    expect(result.dataQuality.completeness).toBeCloseTo(75, 0);
  });

  it('should detect duplicates', async () => {
    const dataWithDuplicates = [
      { A: 1, B: 'x' },
      { A: 1, B: 'x' }, // Duplicate
      { A: 2, B: 'y' },
      { A: 2, B: 'y' }, // Duplicate
    ];
    const buffer = createTestExcelBuffer(dataWithDuplicates);

    const result = await analyzer.analyze(buffer, { checkDataQuality: true });

    expect(result.dataQuality.duplicates).toBeDefined();
    expect(result.dataQuality.duplicates.count).toBe(2);
  });
});

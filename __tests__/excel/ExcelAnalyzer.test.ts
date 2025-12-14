/**
 * ExcelAnalyzer - Tests TDD Stricts
 * 
 * Tests complets pour l'orchestrateur d'analyse Excel avec intégration IA
 * Couverture cible: 100%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExcelAnalyzer } from '../../src/excel/ExcelAnalyzer.js';
import { ExcelParserService } from '../../src/excel/ExcelParserService.js';
import { StatisticalEngine } from '../../src/excel/StatisticalEngine.js';
import { DataTypeDetector } from '../../src/excel/DataTypeDetector.js';
import * as XLSX from 'xlsx';

// Mock du TaskTypeProcessor pour isoler les tests
vi.mock('../../src/core/TaskTypeProcessor.js', () => ({
  TaskTypeProcessor: vi.fn().mockImplementation(() => ({
    process: vi.fn().mockResolvedValue({
      content: 'AI Analysis: The data shows positive trends...',
      metadata: {
        consensusUsed: false,
        model: 'gpt-4'
      }
    })
  }))
}));

describe('ExcelAnalyzer', () => {
  let analyzer: ExcelAnalyzer;
  let testBuffer: Buffer;

  beforeEach(() => {
    analyzer = new ExcelAnalyzer();
    
    // Créer un fichier Excel de test
    const workbook = XLSX.utils.book_new();
    const data = [
      ['Product', 'Category', 'Price', 'Quantity', 'Revenue', 'Date'],
      ['Widget A', 'Electronics', 29.99, 100, 2999.00, '2024-01-15'],
      ['Widget B', 'Electronics', 49.99, 75, 3749.25, '2024-01-20'],
      ['Gadget X', 'Home', 19.99, 200, 3998.00, '2024-02-10'],
      ['Gadget Y', 'Home', 34.99, 150, 5248.50, '2024-02-15'],
      ['Device Z', 'Electronics', 99.99, 50, 4999.50, '2024-03-01']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales');
    testBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // TESTS D'INITIALISATION
  // ============================================================================

  describe('Initialization', () => {
    it('should create an instance with all required components', () => {
      expect(analyzer).toBeInstanceOf(ExcelAnalyzer);
      expect(analyzer.parser).toBeInstanceOf(ExcelParserService);
      expect(analyzer.statsEngine).toBeInstanceOf(StatisticalEngine);
      expect(analyzer.typeDetector).toBeInstanceOf(DataTypeDetector);
    });

    it('should accept custom options', () => {
      const customAnalyzer = new ExcelAnalyzer({
        maxFileSize: 100 * 1024 * 1024,
        enableAI: false,
        detailedStats: true
      });
      
      expect(customAnalyzer.options.maxFileSize).toBe(100 * 1024 * 1024);
      expect(customAnalyzer.options.enableAI).toBe(false);
    });
  });

  // ============================================================================
  // TESTS ANALYSE DE BASE
  // ============================================================================

  describe('Basic Analysis', () => {
    it('should analyze a simple Excel file', async () => {
      const result = await analyzer.analyze(testBuffer);
      
      expect(result.success).toBe(true);
      expect(result.sheets).toHaveLength(1);
      expect(result.metadata).toBeDefined();
    });

    it('should extract parsed data correctly', async () => {
      const result = await analyzer.analyze(testBuffer);
      
      expect(result.parsedData).toBeDefined();
      expect(result.parsedData.sheets[0].name).toBe('Sales');
      expect(result.parsedData.sheets[0].rows).toHaveLength(5);
    });

    it('should detect column types automatically', async () => {
      const result = await analyzer.analyze(testBuffer);
      const sheet = result.sheets[0];
      
      expect(sheet.columnTypes).toBeDefined();
      expect(sheet.columnTypes['Product']).toBe('string');
      expect(sheet.columnTypes['Price']).toBe('float');
      expect(sheet.columnTypes['Quantity']).toBe('integer');
      expect(sheet.columnTypes['Date']).toBe('date');
    });

    it('should generate statistics for numeric columns', async () => {
      const result = await analyzer.analyze(testBuffer);
      const sheet = result.sheets[0];
      
      expect(sheet.statistics).toBeDefined();
      expect(sheet.statistics['Price']).toBeDefined();
      expect(sheet.statistics['Price'].mean).toBeDefined();
      expect(sheet.statistics['Price'].min).toBeDefined();
      expect(sheet.statistics['Price'].max).toBeDefined();
    });

    it('should generate frequency tables for categorical columns', async () => {
      const result = await analyzer.analyze(testBuffer);
      const sheet = result.sheets[0];
      
      expect(sheet.categoricalAnalysis).toBeDefined();
      expect(sheet.categoricalAnalysis['Category']).toBeDefined();
      expect(sheet.categoricalAnalysis['Category']['Electronics']).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS ANALYSE STATISTIQUE COMPLÈTE
  // ============================================================================

  describe('Complete Statistical Analysis', () => {
    it('should compute all descriptive statistics', async () => {
      const result = await analyzer.analyze(testBuffer, { 
        analysisLevel: 'complete' 
      });
      
      const revenueStats = result.sheets[0].statistics['Revenue'];
      
      expect(revenueStats.count).toBe(5);
      expect(revenueStats.sum).toBeCloseTo(21000, -2);
      expect(revenueStats.mean).toBeDefined();
      expect(revenueStats.median).toBeDefined();
      expect(revenueStats.standardDeviation).toBeDefined();
      expect(revenueStats.quartiles).toBeDefined();
    });

    it('should detect outliers', async () => {
      // Créer données avec outlier
      const workbook = XLSX.utils.book_new();
      const data = [
        ['Value'],
        [10], [12], [11], [13], [12], [11], [100], [12], [11], [10]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await analyzer.analyze(buffer, { detectOutliers: true });
      
      expect(result.sheets[0].outliers).toBeDefined();
      expect(result.sheets[0].outliers['Value'].values).toContain(100);
    });

    it('should compute correlations between numeric columns', async () => {
      const result = await analyzer.analyze(testBuffer, {
        computeCorrelations: true
      });
      
      expect(result.correlations).toBeDefined();
      expect(result.correlations['Price']['Revenue']).toBeDefined();
      expect(result.correlations['Quantity']['Revenue']).toBeDefined();
    });

    it('should identify strongly correlated columns', async () => {
      const result = await analyzer.analyze(testBuffer, {
        computeCorrelations: true
      });
      
      expect(result.strongCorrelations).toBeDefined();
      // Price * Quantity ≈ Revenue, so expect strong correlation
    });

    it('should perform distribution analysis', async () => {
      const result = await analyzer.analyze(testBuffer, {
        analyzeDistributions: true
      });
      
      const priceDistribution = result.sheets[0].distributions['Price'];
      
      expect(priceDistribution.histogram).toBeDefined();
      expect(priceDistribution.normalityTest).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS ANALYSE TEMPORELLE
  // ============================================================================

  describe('Time Series Analysis', () => {
    let timeSeriesBuffer: Buffer;

    beforeEach(() => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['Date', 'Sales', 'Visitors'],
        ['2024-01-01', 1000, 500],
        ['2024-01-02', 1100, 520],
        ['2024-01-03', 1050, 510],
        ['2024-01-04', 1200, 550],
        ['2024-01-05', 1150, 530],
        ['2024-01-06', 1300, 600],
        ['2024-01-07', 1250, 580],
        ['2024-01-08', 1400, 620],
        ['2024-01-09', 1350, 610],
        ['2024-01-10', 1500, 650]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'TimeSeries');
      timeSeriesBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    });

    it('should detect date columns and enable time series analysis', async () => {
      const result = await analyzer.analyze(timeSeriesBuffer);
      
      expect(result.sheets[0].hasTimeData).toBe(true);
      expect(result.sheets[0].dateColumns).toContain('Date');
    });

    it('should compute trends for numeric columns', async () => {
      const result = await analyzer.analyze(timeSeriesBuffer, {
        timeSeriesAnalysis: true,
        dateColumn: 'Date'
      });
      
      expect(result.timeSeries).toBeDefined();
      expect(result.timeSeries['Sales'].trend).toBe('increasing');
      expect(result.timeSeries['Visitors'].trend).toBe('increasing');
    });

    it('should calculate growth rates', async () => {
      const result = await analyzer.analyze(timeSeriesBuffer, {
        timeSeriesAnalysis: true,
        dateColumn: 'Date'
      });
      
      expect(result.timeSeries['Sales'].growthRate).toBeDefined();
      expect(result.timeSeries['Sales'].growthRate).toBeGreaterThan(0);
    });

    it('should compute moving averages', async () => {
      const result = await analyzer.analyze(timeSeriesBuffer, {
        timeSeriesAnalysis: true,
        dateColumn: 'Date',
        movingAverageWindow: 3
      });
      
      expect(result.timeSeries['Sales'].movingAverage).toBeDefined();
      expect(result.timeSeries['Sales'].movingAverage).toHaveLength(8);
    });

    it('should generate simple forecasts', async () => {
      const result = await analyzer.analyze(timeSeriesBuffer, {
        timeSeriesAnalysis: true,
        dateColumn: 'Date',
        forecastPeriods: 3
      });
      
      expect(result.timeSeries['Sales'].forecast).toBeDefined();
      expect(result.timeSeries['Sales'].forecast.predictions).toHaveLength(3);
    });
  });

  // ============================================================================
  // TESTS GROUPBY ET AGRÉGATION
  // ============================================================================

  describe('GroupBy Analysis', () => {
    it('should group data by categorical column', async () => {
      const result = await analyzer.analyze(testBuffer, {
        groupBy: 'Category'
      });
      
      expect(result.groupedAnalysis).toBeDefined();
      expect(result.groupedAnalysis['Electronics']).toBeDefined();
      expect(result.groupedAnalysis['Home']).toBeDefined();
    });

    it('should compute aggregates per group', async () => {
      const result = await analyzer.analyze(testBuffer, {
        groupBy: 'Category',
        aggregations: ['sum', 'mean', 'count']
      });
      
      const electronics = result.groupedAnalysis['Electronics'];
      
      expect(electronics.Revenue.sum).toBeDefined();
      expect(electronics.Revenue.mean).toBeDefined();
      expect(electronics.count).toBe(3);
    });

    it('should generate pivot table', async () => {
      // Créer données pour pivot
      const workbook = XLSX.utils.book_new();
      const data = [
        ['Region', 'Product', 'Sales'],
        ['North', 'A', 100],
        ['North', 'B', 150],
        ['South', 'A', 120],
        ['South', 'B', 180],
        ['North', 'A', 110],
        ['South', 'B', 200]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'PivotData');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await analyzer.analyze(buffer, {
        pivotTable: {
          rowField: 'Region',
          columnField: 'Product',
          valueField: 'Sales',
          aggregation: 'sum'
        }
      });
      
      expect(result.pivotTable).toBeDefined();
      expect(result.pivotTable.data['North']['A']).toBe(210);
      expect(result.pivotTable.data['South']['B']).toBe(380);
    });
  });

  // ============================================================================
  // TESTS INTÉGRATION IA
  // ============================================================================

  describe('AI Integration', () => {
    it('should generate AI insights when enabled', async () => {
      const result = await analyzer.analyzeWithAI(testBuffer, 'Analyze trends');
      
      expect(result.aiInsights).toBeDefined();
      expect(result.aiInsights.content).toContain('AI Analysis');
    });

    it('should format statistics for AI prompt', async () => {
      const result = await analyzer.analyzeWithAI(testBuffer, 'What are the key metrics?');
      
      expect(result.aiPrompt).toBeDefined();
      expect(result.aiPrompt).toContain('statistics');
    });

    it('should include user query in AI analysis', async () => {
      const userQuery = 'Which product category performs best?';
      const result = await analyzer.analyzeWithAI(testBuffer, userQuery);
      
      expect(result.aiPrompt).toContain(userQuery);
    });

    it('should work without AI when disabled', async () => {
      const noAIAnalyzer = new ExcelAnalyzer({ enableAI: false });
      const result = await noAIAnalyzer.analyze(testBuffer);
      
      expect(result.aiInsights).toBeUndefined();
      expect(result.statistics).toBeDefined();
    });

    it('should handle AI errors gracefully', async () => {
      // Mock AI failure
      const failingAnalyzer = new ExcelAnalyzer();
      vi.spyOn(failingAnalyzer as any, 'getAIInsights').mockRejectedValue(new Error('AI unavailable'));
      
      const result = await failingAnalyzer.analyzeWithAI(testBuffer, 'Test query');
      
      expect(result.aiError).toBeDefined();
      expect(result.statistics).toBeDefined(); // Stats should still work
    });

    it('should extract recommendations from AI response', async () => {
      const result = await analyzer.analyzeWithAI(testBuffer, 'Give recommendations');
      
      expect(result.recommendations).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS GÉNÉRATION DE RÉSUMÉ
  // ============================================================================

  describe('Summary Generation', () => {
    it('should generate executive summary', async () => {
      const result = await analyzer.analyze(testBuffer, {
        generateSummary: true
      });
      
      expect(result.summary).toBeDefined();
      expect(result.summary.totalRows).toBe(5);
      expect(result.summary.totalColumns).toBe(6);
    });

    it('should identify key insights', async () => {
      const result = await analyzer.analyze(testBuffer, {
        generateSummary: true,
        identifyInsights: true
      });
      
      expect(result.summary.keyInsights).toBeDefined();
      expect(result.summary.keyInsights.length).toBeGreaterThan(0);
    });

    it('should detect data quality issues', async () => {
      // Créer données avec problèmes
      const workbook = XLSX.utils.book_new();
      const data = [
        ['A', 'B', 'C'],
        [1, null, 3],
        [null, 2, null],
        [3, 3, 3],
        [1000, 4, 4] // Outlier in A
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'QualityTest');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await analyzer.analyze(buffer, {
        checkDataQuality: true
      });
      
      expect(result.dataQuality).toBeDefined();
      expect(result.dataQuality.nullCells).toBeGreaterThan(0);
      expect(result.dataQuality.completenessScore).toBeLessThan(1);
    });

    it('should generate column profile', async () => {
      const result = await analyzer.analyze(testBuffer, {
        profileColumns: true
      });
      
      const priceProfile = result.columnProfiles['Price'];
      
      expect(priceProfile.type).toBe('float');
      expect(priceProfile.uniqueValues).toBeDefined();
      expect(priceProfile.nullPercentage).toBe(0);
      expect(priceProfile.statistics).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS MULTI-FEUILLES
  // ============================================================================

  describe('Multi-Sheet Analysis', () => {
    let multiSheetBuffer: Buffer;

    beforeEach(() => {
      const workbook = XLSX.utils.book_new();
      
      // Sheet 1: Sales
      const salesData = [
        ['Product', 'Revenue'],
        ['A', 1000],
        ['B', 2000]
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(salesData), 'Sales');
      
      // Sheet 2: Costs
      const costsData = [
        ['Product', 'Cost'],
        ['A', 500],
        ['B', 800]
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(costsData), 'Costs');
      
      // Sheet 3: Inventory
      const inventoryData = [
        ['Product', 'Stock'],
        ['A', 100],
        ['B', 50]
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(inventoryData), 'Inventory');
      
      multiSheetBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    });

    it('should analyze all sheets', async () => {
      const result = await analyzer.analyze(multiSheetBuffer);
      
      expect(result.sheets).toHaveLength(3);
      expect(result.sheets.map(s => s.name)).toEqual(['Sales', 'Costs', 'Inventory']);
    });

    it('should analyze specific sheets', async () => {
      const result = await analyzer.analyze(multiSheetBuffer, {
        sheets: ['Sales', 'Costs']
      });
      
      expect(result.sheets).toHaveLength(2);
    });

    it('should detect relationships between sheets', async () => {
      const result = await analyzer.analyze(multiSheetBuffer, {
        detectRelationships: true
      });
      
      expect(result.relationships).toBeDefined();
      expect(result.relationships.commonColumns).toContain('Product');
    });

    it('should merge sheets on common column', async () => {
      const result = await analyzer.analyze(multiSheetBuffer, {
        mergeSheets: {
          on: 'Product',
          how: 'inner'
        }
      });
      
      expect(result.mergedData).toBeDefined();
      expect(result.mergedData.columns).toContain('Revenue');
      expect(result.mergedData.columns).toContain('Cost');
      expect(result.mergedData.columns).toContain('Stock');
    });
  });

  // ============================================================================
  // TESTS EXPORT DES RÉSULTATS
  // ============================================================================

  describe('Results Export', () => {
    it('should export results to JSON', async () => {
      const result = await analyzer.analyze(testBuffer);
      const json = analyzer.exportToJSON(result);
      
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should export summary for chat response', async () => {
      const result = await analyzer.analyze(testBuffer);
      const chatSummary = analyzer.exportForChat(result);
      
      expect(chatSummary).toBeDefined();
      expect(chatSummary.text).toBeDefined();
      expect(chatSummary.text.length).toBeLessThan(5000); // Concis
    });

    it('should format numbers for display', async () => {
      const result = await analyzer.analyze(testBuffer);
      const formatted = analyzer.exportForChat(result, { locale: 'fr-FR' });
      
      expect(formatted.text).toContain('€'); // French currency
    });

    it('should generate markdown report', async () => {
      const result = await analyzer.analyze(testBuffer);
      const markdown = analyzer.exportToMarkdown(result);
      
      expect(markdown).toContain('##'); // Headers
      expect(markdown).toContain('|'); // Tables
    });
  });

  // ============================================================================
  // TESTS ANALYSE SPÉCIFIQUE
  // ============================================================================

  describe('Specific Analysis Requests', () => {
    it('should analyze specific columns only', async () => {
      const result = await analyzer.analyze(testBuffer, {
        columns: ['Price', 'Revenue']
      });
      
      expect(Object.keys(result.sheets[0].statistics)).toEqual(['Price', 'Revenue']);
    });

    it('should support custom aggregation', async () => {
      const result = await analyzer.analyze(testBuffer, {
        customAggregations: {
          'totalRevenue': { column: 'Revenue', operation: 'sum' },
          'avgPrice': { column: 'Price', operation: 'mean' }
        }
      });
      
      expect(result.customResults.totalRevenue).toBeDefined();
      expect(result.customResults.avgPrice).toBeDefined();
    });

    it('should filter data before analysis', async () => {
      const result = await analyzer.analyze(testBuffer, {
        filter: {
          column: 'Category',
          value: 'Electronics'
        }
      });
      
      expect(result.sheets[0].filteredRowCount).toBe(3);
    });

    it('should answer specific questions about data', async () => {
      const result = await analyzer.analyzeWithQuery(testBuffer, 
        'What is the average price by category?'
      );
      
      expect(result.queryResult).toBeDefined();
      expect(result.queryResult['Electronics']).toBeDefined();
      expect(result.queryResult['Home']).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS PERFORMANCE
  // ============================================================================

  describe('Performance', () => {
    it('should analyze large files within time limit', async () => {
      // Créer un gros fichier
      const workbook = XLSX.utils.book_new();
      const data = [['ID', 'Value', 'Category']];
      for (let i = 0; i < 10000; i++) {
        data.push([i, Math.random() * 1000, `Cat${i % 10}`]);
      }
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Large');
      const largeBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const startTime = Date.now();
      const result = await analyzer.analyze(largeBuffer);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Less than 10s
    });

    it('should provide progress updates for large files', async () => {
      const progressUpdates: number[] = [];
      
      const workbook = XLSX.utils.book_new();
      const data = [['V']];
      for (let i = 0; i < 5000; i++) data.push([i]);
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      await analyzer.analyze(buffer, {
        onProgress: (progress: number) => progressUpdates.push(progress)
      });
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
  });

  // ============================================================================
  // TESTS GESTION D'ERREURS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle invalid buffer', async () => {
      await expect(analyzer.analyze(Buffer.from('invalid')))
        .rejects.toThrow();
    });

    it('should handle empty file', async () => {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Empty');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await analyzer.analyze(buffer);
      
      expect(result.success).toBe(true);
      expect(result.sheets[0].isEmpty).toBe(true);
    });

    it('should handle non-existent columns gracefully', async () => {
      const result = await analyzer.analyze(testBuffer, {
        columns: ['NonExistent', 'Price']
      });
      
      expect(result.warnings).toContain("Column 'NonExistent' not found");
      expect(Object.keys(result.sheets[0].statistics)).toEqual(['Price']);
    });

    it('should provide detailed error information', async () => {
      try {
        await analyzer.analyze(Buffer.from('not excel'));
      } catch (error: any) {
        expect(error.code).toBeDefined();
        expect(error.details).toBeDefined();
      }
    });
  });
});

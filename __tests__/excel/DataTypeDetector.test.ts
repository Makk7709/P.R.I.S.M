/**
 * DataTypeDetector - Tests TDD Stricts
 * 
 * Tests complets pour la détection automatique des types de données
 * Couverture cible: 100%
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataTypeDetector, DataType } from '../../src/excel/DataTypeDetector.js';

describe('DataTypeDetector', () => {
  let detector: DataTypeDetector;

  beforeEach(() => {
    detector = new DataTypeDetector();
  });

  // ============================================================================
  // TESTS D'INITIALISATION
  // ============================================================================

  describe('Initialization', () => {
    it('should create an instance with default options', () => {
      expect(detector).toBeInstanceOf(DataTypeDetector);
      expect(detector.options.sampleSize).toBe(100);
      expect(detector.options.confidenceThreshold).toBe(0.8);
    });

    it('should accept custom options', () => {
      const customDetector = new DataTypeDetector({
        sampleSize: 50,
        confidenceThreshold: 0.9
      });
      expect(customDetector.options.sampleSize).toBe(50);
      expect(customDetector.options.confidenceThreshold).toBe(0.9);
    });
  });

  // ============================================================================
  // TESTS DÉTECTION TYPES PRIMITIFS
  // ============================================================================

  describe('Primitive Type Detection', () => {
    describe('String Detection', () => {
      it('should detect simple strings', () => {
        const values = ['Hello', 'World', 'Test', 'Data'];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.STRING);
        expect(result.confidence).toBeGreaterThan(0.9);
      });

      it('should detect strings with special characters', () => {
        const values = ['Hello!', 'Test@123', 'Data#$%', 'Rémi été'];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.STRING);
      });

      it('should detect empty strings as string type', () => {
        const values = ['', 'Hello', '', 'World'];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.STRING);
        expect(result.stats.emptyCount).toBe(2);
      });
    });

    describe('Number Detection', () => {
      it('should detect integers', () => {
        const values = [1, 2, 3, 100, 500, -10];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.INTEGER);
        expect(result.confidence).toBeGreaterThan(0.95);
      });

      it('should detect floats/decimals', () => {
        const values = [1.5, 2.75, 3.14159, 100, -10.5];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.FLOAT);
        expect(result.confidence).toBeGreaterThan(0.95);
      });

      it('should detect numbers as strings', () => {
        const values = ['100', '200', '300', '400'];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.INTEGER);
        expect(result.parsedAs).toBe('string_to_number');
      });

      it('should detect negative numbers', () => {
        const values = [-100, -200, -300, 400, -500];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.INTEGER);
        expect(result.stats.hasNegatives).toBe(true);
      });

      it('should detect scientific notation', () => {
        const values = [1e5, 2.5e-3, 1E10, '3.14e2'];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.FLOAT);
        expect(result.stats.hasScientificNotation).toBe(true);
      });
    });

    describe('Boolean Detection', () => {
      it('should detect boolean true/false', () => {
        const values = [true, false, true, true, false];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.BOOLEAN);
        expect(result.confidence).toBeGreaterThan(0.95);
      });

      it('should detect string boolean representations', () => {
        const values = ['true', 'false', 'TRUE', 'FALSE', 'True'];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.BOOLEAN);
      });

      it('should detect yes/no as boolean', () => {
        const values = ['yes', 'no', 'Yes', 'NO', 'YES'];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.BOOLEAN);
        expect(result.booleanFormat).toBe('yes_no');
      });

      it('should detect 0/1 as boolean', () => {
        const values = [0, 1, 1, 0, 1, 1, 0];
        const result = detector.detectType(values, { checkBinaryBoolean: true });
        
        expect(result.type).toBe(DataType.BOOLEAN);
        expect(result.booleanFormat).toBe('binary');
      });

      it('should detect oui/non as boolean (French)', () => {
        const values = ['oui', 'non', 'OUI', 'NON', 'Oui'];
        const result = detector.detectType(values);
        
        expect(result.type).toBe(DataType.BOOLEAN);
        expect(result.booleanFormat).toBe('oui_non');
      });
    });
  });

  // ============================================================================
  // TESTS DÉTECTION DATES
  // ============================================================================

  describe('Date Detection', () => {
    it('should detect Date objects', () => {
      const values = [
        new Date('2024-01-15'),
        new Date('2024-06-20'),
        new Date('2024-12-01')
      ];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.DATE);
      expect(result.confidence).toBeGreaterThan(0.95);
    });

    it('should detect ISO 8601 date strings', () => {
      const values = ['2024-01-15', '2024-06-20', '2024-12-01'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.DATE);
      expect(result.dateFormat).toBe('ISO8601');
    });

    it('should detect DD/MM/YYYY format', () => {
      const values = ['15/01/2024', '20/06/2024', '01/12/2024'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.DATE);
      expect(result.dateFormat).toBe('DD/MM/YYYY');
    });

    it('should detect MM/DD/YYYY format', () => {
      const values = ['01/15/2024', '06/20/2024', '12/01/2024'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.DATE);
      expect(result.dateFormat).toBe('MM/DD/YYYY');
    });

    it('should detect DD-MM-YYYY format', () => {
      const values = ['15-01-2024', '20-06-2024', '01-12-2024'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.DATE);
      expect(result.dateFormat).toBe('DD-MM-YYYY');
    });

    it('should detect datetime with time component', () => {
      const values = [
        '2024-01-15 10:30:00',
        '2024-06-20 14:45:30',
        '2024-12-01 09:00:00'
      ];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.DATETIME);
      expect(result.hasTimeComponent).toBe(true);
    });

    it('should detect French date format', () => {
      const values = ['15 janvier 2024', '20 juin 2024', '1er décembre 2024'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.DATE);
      expect(result.dateFormat).toBe('DD_MONTH_YYYY_FR');
    });

    it('should detect Excel serial dates', () => {
      // Excel serial date: days since 1900-01-01
      const values = [45307, 45463, 45627]; // Corresponding to dates in 2024
      const result = detector.detectType(values, { checkExcelDates: true });
      
      expect(result.type).toBe(DataType.DATE);
      expect(result.dateFormat).toBe('EXCEL_SERIAL');
    });

    it('should detect time-only values', () => {
      const values = ['10:30', '14:45:30', '09:00', '23:59:59'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.TIME);
    });
  });

  // ============================================================================
  // TESTS DÉTECTION MONNAIE
  // ============================================================================

  describe('Currency Detection', () => {
    it('should detect EUR currency format', () => {
      const values = ['1 500,00 €', '2 300,50 €', '500,75 €', '10 000,00 €'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.CURRENCY);
      expect(result.currencySymbol).toBe('€');
      expect(result.currencyCode).toBe('EUR');
    });

    it('should detect USD currency format', () => {
      const values = ['$1,500.00', '$2,300.50', '$500.75', '$10,000.00'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.CURRENCY);
      expect(result.currencySymbol).toBe('$');
      expect(result.currencyCode).toBe('USD');
    });

    it('should detect currency without symbol', () => {
      const values = ['1500.00 USD', '2300.50 EUR', '500.75 GBP'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.CURRENCY);
    });

    it('should detect GBP currency format', () => {
      const values = ['£1,500.00', '£2,300.50', '£500.75'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.CURRENCY);
      expect(result.currencySymbol).toBe('£');
    });

    it('should extract numeric values from currency', () => {
      const values = ['$1,500.00', '$2,300.50', '$500.75'];
      const result = detector.detectType(values);
      
      expect(result.extractedValues).toEqual([1500, 2300.5, 500.75]);
    });
  });

  // ============================================================================
  // TESTS DÉTECTION POURCENTAGES
  // ============================================================================

  describe('Percentage Detection', () => {
    it('should detect percentage with % symbol', () => {
      const values = ['75%', '50%', '25%', '100%'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.PERCENTAGE);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect percentage with decimals', () => {
      const values = ['75.5%', '50.25%', '25.75%', '100.00%'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.PERCENTAGE);
    });

    it('should detect decimal percentages (0-1 range)', () => {
      const values = [0.75, 0.5, 0.25, 0.1, 0.95];
      const result = detector.detectType(values, { checkDecimalPercentage: true });
      
      expect(result.type).toBe(DataType.PERCENTAGE);
      expect(result.percentageFormat).toBe('decimal');
    });

    it('should extract numeric values from percentages', () => {
      const values = ['75%', '50%', '25%'];
      const result = detector.detectType(values);
      
      expect(result.extractedValues).toEqual([75, 50, 25]);
      expect(result.normalizedValues).toEqual([0.75, 0.5, 0.25]);
    });
  });

  // ============================================================================
  // TESTS DÉTECTION EMAIL/URL/TÉLÉPHONE
  // ============================================================================

  describe('Special Format Detection', () => {
    it('should detect email addresses', () => {
      const values = [
        'test@example.com',
        'user.name@domain.org',
        'contact@company.fr'
      ];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.EMAIL);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect URLs', () => {
      const values = [
        'https://example.com',
        'http://test.org/page',
        'https://www.domain.fr/path?query=1'
      ];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.URL);
    });

    it('should detect phone numbers (French format)', () => {
      const values = [
        '06 12 34 56 78',
        '01 23 45 67 89',
        '+33 6 12 34 56 78'
      ];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.PHONE);
      expect(result.phoneFormat).toBe('FR');
    });

    it('should detect phone numbers (international format)', () => {
      const values = [
        '+1-555-123-4567',
        '+44 20 7123 4567',
        '+33 1 23 45 67 89'
      ];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.PHONE);
      expect(result.phoneFormat).toBe('INTERNATIONAL');
    });

    it('should detect postal codes (French)', () => {
      const values = ['75001', '69002', '13008', '33000', '59000'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.POSTAL_CODE);
      expect(result.postalFormat).toBe('FR');
    });
  });

  // ============================================================================
  // TESTS DÉTECTION IDENTIFIANTS
  // ============================================================================

  describe('ID Detection', () => {
    it('should detect sequential integer IDs', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.ID);
      expect(result.idType).toBe('sequential');
    });

    it('should detect UUID format', () => {
      const values = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.UUID);
    });

    it('should detect alphanumeric IDs', () => {
      const values = ['ID001', 'ID002', 'ID003', 'ID004'];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.ID);
      expect(result.idType).toBe('alphanumeric');
    });
  });

  // ============================================================================
  // TESTS TYPES MIXTES
  // ============================================================================

  describe('Mixed Type Detection', () => {
    it('should detect mixed types', () => {
      const values = ['Hello', 123, true, '456', null];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.MIXED);
      expect(result.mixedTypes).toContain(DataType.STRING);
      expect(result.mixedTypes).toContain(DataType.INTEGER);
    });

    it('should provide type distribution for mixed columns', () => {
      const values = ['A', 'B', 1, 2, 3, 'C'];
      const result = detector.detectType(values);
      
      expect(result.typeDistribution).toBeDefined();
      expect(result.typeDistribution[DataType.STRING]).toBe(3);
      expect(result.typeDistribution[DataType.INTEGER]).toBe(3);
    });

    it('should suggest dominant type for mixed columns', () => {
      const values = [1, 2, 3, 4, 5, 'N/A', 7, 8, 9, 10];
      const result = detector.detectType(values);
      
      expect(result.dominantType).toBe(DataType.INTEGER);
      expect(result.dominantConfidence).toBeGreaterThan(0.8);
    });

    it('should handle mostly null columns', () => {
      const values = [null, null, null, 'Value', null, null];
      const result = detector.detectType(values);
      
      expect(result.type).toBe(DataType.STRING);
      expect(result.nullRatio).toBeGreaterThan(0.8);
    });
  });

  // ============================================================================
  // TESTS ANALYSE DE COLONNE COMPLÈTE
  // ============================================================================

  describe('Column Analysis', () => {
    it('should analyze a complete column', () => {
      const column = {
        name: 'Revenue',
        values: [1500.5, 2300, 1800.75, 3200.25, 2100]
      };
      
      const result = detector.analyzeColumn(column);
      
      expect(result.columnName).toBe('Revenue');
      expect(result.type).toBe(DataType.FLOAT);
      expect(result.stats).toBeDefined();
      expect(result.stats.min).toBe(1500.5);
      expect(result.stats.max).toBe(3200.25);
    });

    it('should detect categorical data', () => {
      const column = {
        name: 'Category',
        values: ['A', 'B', 'A', 'C', 'B', 'A', 'C', 'A', 'B', 'C']
      };
      
      const result = detector.analyzeColumn(column);
      
      expect(result.isCategorical).toBe(true);
      expect(result.uniqueValues).toBe(3);
      expect(result.categories).toEqual(['A', 'B', 'C']);
    });

    it('should calculate cardinality', () => {
      const column = {
        name: 'Status',
        values: ['Active', 'Inactive', 'Active', 'Active', 'Pending', 'Active']
      };
      
      const result = detector.analyzeColumn(column);
      
      expect(result.cardinality).toBe(3);
      expect(result.cardinalityRatio).toBeCloseTo(0.5, 2);
    });

    it('should detect potential primary key columns', () => {
      const column = {
        name: 'ID',
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      };
      
      const result = detector.analyzeColumn(column);
      
      expect(result.isPotentialKey).toBe(true);
      expect(result.isUnique).toBe(true);
    });

    it('should handle columns with all same values', () => {
      const column = {
        name: 'Country',
        values: ['France', 'France', 'France', 'France']
      };
      
      const result = detector.analyzeColumn(column);
      
      expect(result.isConstant).toBe(true);
      expect(result.constantValue).toBe('France');
    });
  });

  // ============================================================================
  // TESTS ANALYSE MULTI-COLONNES
  // ============================================================================

  describe('Multi-Column Analysis', () => {
    it('should analyze multiple columns at once', () => {
      const columns = [
        { name: 'ID', values: [1, 2, 3] },
        { name: 'Name', values: ['Alice', 'Bob', 'Charlie'] },
        { name: 'Salary', values: [50000, 60000, 55000] }
      ];
      
      const results = detector.analyzeColumns(columns);
      
      expect(results).toHaveLength(3);
      expect(results[0].type).toBe(DataType.ID);
      expect(results[1].type).toBe(DataType.STRING);
      expect(results[2].type).toBe(DataType.INTEGER);
    });

    it('should detect relationships between columns', () => {
      const columns = [
        { name: 'OrderID', values: [1, 2, 3, 1, 2] },
        { name: 'ProductID', values: [101, 102, 103, 104, 105] },
        { name: 'CustomerID', values: [1001, 1001, 1002, 1001, 1002] }
      ];
      
      const results = detector.analyzeColumns(columns, { detectRelationships: true });
      
      expect(results.relationships).toBeDefined();
      // CustomerID has repeated values suggesting foreign key
      expect(results.potentialForeignKeys).toContain('CustomerID');
    });
  });

  // ============================================================================
  // TESTS PERFORMANCE ET ÉCHANTILLONNAGE
  // ============================================================================

  describe('Performance and Sampling', () => {
    it('should sample large columns for performance', () => {
      const largeColumn = {
        name: 'LargeData',
        values: new Array(10000).fill(0).map((_, i) => i)
      };
      
      const detector50 = new DataTypeDetector({ sampleSize: 50 });
      const result = detector50.analyzeColumn(largeColumn);
      
      expect(result.sampled).toBe(true);
      expect(result.sampleSize).toBe(50);
    });

    it('should maintain accuracy with sampling', () => {
      const largeColumn = {
        name: 'Amounts',
        values: new Array(10000).fill(0).map((_, i) => (i * 1.5).toFixed(2))
      };
      
      const result = detector.analyzeColumn(largeColumn);
      
      expect(result.type).toBe(DataType.FLOAT);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should use stratified sampling for mixed columns', () => {
      const mixedColumn = {
        name: 'Mixed',
        values: [
          ...Array(9000).fill('text'),
          ...Array(1000).fill(123)
        ]
      };
      
      const result = detector.analyzeColumn(mixedColumn, { stratifiedSampling: true });
      
      // Should still detect mixed type despite uneven distribution
      expect(result.typeDistribution).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS SUGGESTIONS DE CONVERSION
  // ============================================================================

  describe('Conversion Suggestions', () => {
    it('should suggest conversions for string numbers', () => {
      const values = ['100', '200', '300', '400'];
      const result = detector.detectType(values);
      
      expect(result.suggestedConversion).toBeDefined();
      expect(result.suggestedConversion.targetType).toBe(DataType.INTEGER);
      expect(result.suggestedConversion.safe).toBe(true);
    });

    it('should suggest date parsing for date strings', () => {
      const values = ['2024-01-15', '2024-06-20', '2024-12-01'];
      const result = detector.detectType(values);
      
      expect(result.suggestedConversion).toBeDefined();
      expect(result.suggestedConversion.parser).toBe('ISO8601');
    });

    it('should warn about potential data loss in conversion', () => {
      const values = ['100.5', '200.7', '300.9'];
      const result = detector.detectType(values);
      
      if (result.suggestedConversion?.targetType === DataType.INTEGER) {
        expect(result.suggestedConversion.warning).toContain('precision loss');
      }
    });
  });

  // ============================================================================
  // TESTS LOCALISATION
  // ============================================================================

  describe('Localization', () => {
    it('should detect French number format (comma decimal)', () => {
      const values = ['1 234,56', '2 345,67', '3 456,78'];
      const result = detector.detectType(values, { locale: 'fr-FR' });
      
      expect(result.type).toBe(DataType.FLOAT);
      expect(result.numberFormat).toBe('FR');
    });

    it('should detect German number format', () => {
      const values = ['1.234,56', '2.345,67', '3.456,78'];
      const result = detector.detectType(values, { locale: 'de-DE' });
      
      expect(result.type).toBe(DataType.FLOAT);
      expect(result.numberFormat).toBe('DE');
    });

    it('should auto-detect locale from data patterns', () => {
      const values = ['1 500,00 €', '2 300,50 €', '500,75 €'];
      const result = detector.detectType(values);
      
      expect(result.detectedLocale).toBe('fr-FR');
    });
  });
});

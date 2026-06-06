/**
 * ExcelParserService - Tests TDD Stricts
 * 
 * Tests complets pour le parsing de fichiers Excel complexes
 * Couverture cible: 100%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExcelParserService } from '../../src/excel/ExcelParserService.js';
import * as XLSX from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';

describe('ExcelParserService', () => {
  let parser: ExcelParserService;

  beforeEach(() => {
    parser = new ExcelParserService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // TESTS D'INITIALISATION
  // ============================================================================
  
  describe('Initialization', () => {
    it('should create an instance with default options', () => {
      expect(parser).toBeInstanceOf(ExcelParserService);
      expect(parser.options).toBeDefined();
      expect(parser.options.maxFileSize).toBe(50 * 1024 * 1024); // 50MB
      expect(parser.options.maxRows).toBe(1000000);
      expect(parser.options.maxSheets).toBe(50);
    });

    it('should accept custom options', () => {
      const customParser = new ExcelParserService({
        maxFileSize: 100 * 1024 * 1024,
        maxRows: 500000,
        maxSheets: 10
      });
      expect(customParser.options.maxFileSize).toBe(100 * 1024 * 1024);
      expect(customParser.options.maxRows).toBe(500000);
      expect(customParser.options.maxSheets).toBe(10);
    });

    it('should have supportedFormats property', () => {
      expect(parser.supportedFormats).toContain('.xlsx');
      expect(parser.supportedFormats).toContain('.xls');
      expect(parser.supportedFormats).toContain('.csv');
      expect(parser.supportedFormats).toContain('.ods');
    });
  });

  // ============================================================================
  // TESTS DE VALIDATION
  // ============================================================================

  describe('File Validation', () => {
    it('should reject null or undefined buffer', async () => {
      await expect(parser.parseWorkbook(null as any))
        .rejects.toThrow('Invalid input: buffer is required');
      
      await expect(parser.parseWorkbook(undefined as any))
        .rejects.toThrow('Invalid input: buffer is required');
    });

    it('should reject empty buffer', async () => {
      const emptyBuffer = Buffer.from([]);
      await expect(parser.parseWorkbook(emptyBuffer))
        .rejects.toThrow('Invalid input: buffer is empty');
    });

    it('should reject buffer exceeding max file size', async () => {
      const smallParser = new ExcelParserService({ maxFileSize: 100 });
      const largeBuffer = Buffer.alloc(200);
      
      await expect(smallParser.parseWorkbook(largeBuffer))
        .rejects.toThrow('File size exceeds maximum allowed');
    });

    it('should reject invalid file format (not Excel)', async () => {
      const invalidBuffer = Buffer.from('This is not an Excel file');
      
      await expect(parser.parseWorkbook(invalidBuffer))
        .rejects.toThrow(/Invalid file format|corrupted/i);
    });

    it('should validate MIME type when provided', () => {
      expect(parser.isValidMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
      expect(parser.isValidMimeType('application/vnd.ms-excel')).toBe(true);
      expect(parser.isValidMimeType('text/csv')).toBe(true);
      expect(parser.isValidMimeType('application/pdf')).toBe(false);
      expect(parser.isValidMimeType('image/png')).toBe(false);
    });

    it('should detect file type from magic bytes', () => {
      // XLSX magic bytes (PK zip signature)
      const xlsxMagic = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
      expect(parser.detectFileType(xlsxMagic)).toBe('xlsx');
      
      // XLS magic bytes (OLE2 signature)
      const xlsMagic = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
      expect(parser.detectFileType(xlsMagic)).toBe('xls');
      
      // CSV (text)
      const csvContent = Buffer.from('Name,Age,City\nJohn,25,Paris');
      expect(parser.detectFileType(csvContent)).toBe('csv');
    });
  });

  // ============================================================================
  // TESTS DE PARSING BASIQUE
  // ============================================================================

  describe('Basic Parsing', () => {
    let testWorkbook: XLSX.WorkBook;
    let testBuffer: Buffer;

    beforeEach(() => {
      // Créer un workbook de test en mémoire
      testWorkbook = XLSX.utils.book_new();
      
      const data = [
        ['Nom', 'Age', 'Ville', 'Salaire'],
        ['Alice', 30, 'Paris', 45000],
        ['Bob', 25, 'Lyon', 38000],
        ['Charlie', 35, 'Marseille', 52000],
        ['Diana', 28, 'Bordeaux', 41000]
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(testWorkbook, worksheet, 'Employees');
      
      testBuffer = XLSX.write(testWorkbook, { type: 'buffer', bookType: 'xlsx' });
    });

    it('should parse a simple Excel file', async () => {
      const result = await parser.parseWorkbook(testBuffer);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.sheets).toHaveLength(1);
      expect(result.metadata).toBeDefined();
    });

    it('should extract sheet names correctly', async () => {
      const result = await parser.parseWorkbook(testBuffer);
      
      expect(result.sheets[0].name).toBe('Employees');
    });

    it('should extract headers correctly', async () => {
      const result = await parser.parseWorkbook(testBuffer);
      const sheet = result.sheets[0];
      
      expect(sheet.headers).toEqual(['Nom', 'Age', 'Ville', 'Salaire']);
    });

    it('should extract all rows correctly', async () => {
      const result = await parser.parseWorkbook(testBuffer);
      const sheet = result.sheets[0];
      
      expect(sheet.rows).toHaveLength(4); // 4 data rows (excluding header)
      expect(sheet.rows[0]).toEqual({ Nom: 'Alice', Age: 30, Ville: 'Paris', Salaire: 45000 });
      expect(sheet.rows[3]).toEqual({ Nom: 'Diana', Age: 28, Ville: 'Bordeaux', Salaire: 41000 });
    });

    it('should provide correct row count in metadata', async () => {
      const result = await parser.parseWorkbook(testBuffer);
      
      expect(result.metadata.totalRows).toBe(4);
      expect(result.metadata.totalSheets).toBe(1);
    });

    it('should include column count in metadata', async () => {
      const result = await parser.parseWorkbook(testBuffer);
      
      expect(result.metadata.totalColumns).toBe(4);
    });

    it('should include parsing timestamp', async () => {
      const before = Date.now();
      const result = await parser.parseWorkbook(testBuffer);
      const after = Date.now();
      
      expect(result.metadata.parsedAt).toBeDefined();
      const parsedTime = new Date(result.metadata.parsedAt).getTime();
      expect(parsedTime).toBeGreaterThanOrEqual(before);
      expect(parsedTime).toBeLessThanOrEqual(after);
    });
  });

  // ============================================================================
  // TESTS MULTI-FEUILLES
  // ============================================================================

  describe('Multi-Sheet Parsing', () => {
    let multiSheetBuffer: Buffer;

    beforeEach(() => {
      const workbook = XLSX.utils.book_new();
      
      // Feuille 1: Ventes
      const salesData = [
        ['Produit', 'Quantité', 'Prix'],
        ['Widget A', 100, 29.99],
        ['Widget B', 50, 49.99]
      ];
      const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Ventes');
      
      // Feuille 2: Clients
      const clientsData = [
        ['ID', 'Nom', 'Email'],
        [1, 'Client A', 'a@test.com'],
        [2, 'Client B', 'b@test.com'],
        [3, 'Client C', 'c@test.com']
      ];
      const clientsSheet = XLSX.utils.aoa_to_sheet(clientsData);
      XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clients');
      
      // Feuille 3: Statistiques
      const statsData = [
        ['Métrique', 'Valeur'],
        ['CA Total', 5499.50],
        ['Marge', 0.35]
      ];
      const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistiques');
      
      multiSheetBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    });

    it('should parse all sheets in a multi-sheet workbook', async () => {
      const result = await parser.parseWorkbook(multiSheetBuffer);
      
      expect(result.sheets).toHaveLength(3);
      expect(result.metadata.totalSheets).toBe(3);
    });

    it('should preserve sheet order', async () => {
      const result = await parser.parseWorkbook(multiSheetBuffer);
      
      expect(result.sheets[0].name).toBe('Ventes');
      expect(result.sheets[1].name).toBe('Clients');
      expect(result.sheets[2].name).toBe('Statistiques');
    });

    it('should parse each sheet with correct data', async () => {
      const result = await parser.parseWorkbook(multiSheetBuffer);
      
      // Ventes
      expect(result.sheets[0].rows).toHaveLength(2);
      expect(result.sheets[0].headers).toContain('Produit');
      
      // Clients
      expect(result.sheets[1].rows).toHaveLength(3);
      expect(result.sheets[1].headers).toContain('Email');
      
      // Statistiques
      expect(result.sheets[2].rows).toHaveLength(2);
      expect(result.sheets[2].headers).toContain('Métrique');
    });

    it('should allow filtering specific sheets', async () => {
      const result = await parser.parseWorkbook(multiSheetBuffer, {
        sheets: ['Ventes', 'Statistiques']
      });
      
      expect(result.sheets).toHaveLength(2);
      expect(result.sheets.map(s => s.name)).toEqual(['Ventes', 'Statistiques']);
    });

    it('should handle sheet index selection', async () => {
      const result = await parser.parseWorkbook(multiSheetBuffer, {
        sheetIndices: [0, 2]
      });
      
      expect(result.sheets).toHaveLength(2);
      expect(result.sheets[0].name).toBe('Ventes');
      expect(result.sheets[1].name).toBe('Statistiques');
    });

    it('should ignore non-existent sheet names gracefully', async () => {
      const result = await parser.parseWorkbook(multiSheetBuffer, {
        sheets: ['Ventes', 'NonExistent']
      });
      
      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].name).toBe('Ventes');
      expect(result.warnings).toContain("Sheet 'NonExistent' not found");
    });
  });

  // ============================================================================
  // TESTS CELLULES FUSIONNÉES
  // ============================================================================

  describe('Merged Cells Handling', () => {
    let mergedCellsBuffer: Buffer;

    beforeEach(() => {
      const workbook = XLSX.utils.book_new();
      
      const data = [
        ['Région', '', 'Ventes Q1', 'Ventes Q2'],
        ['Nord', '', 1000, 1200],
        ['Sud', '', 800, 950]
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      
      // Définir les cellules fusionnées (A1:B1 fusionnées)
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // A1:B1
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // A2:B2
        { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }  // A3:B3
      ];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'MergedTest');
      mergedCellsBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    });

    it('should detect merged cells', async () => {
      const result = await parser.parseWorkbook(mergedCellsBuffer);
      const sheet = result.sheets[0];
      
      expect(sheet.mergedCells).toBeDefined();
      expect(sheet.mergedCells.length).toBeGreaterThan(0);
    });

    it('should handle merged cells in data extraction', async () => {
      const result = await parser.parseWorkbook(mergedCellsBuffer, {
        expandMergedCells: true
      });
      
      const sheet = result.sheets[0];
      // La valeur fusionnée doit être propagée
      expect(sheet.rows[0]['Région']).toBe('Nord');
    });

    it('should provide merged cell ranges in metadata', async () => {
      const result = await parser.parseWorkbook(mergedCellsBuffer);
      const sheet = result.sheets[0];
      
      expect(sheet.mergedCells[0]).toMatchObject({
        startRow: expect.any(Number),
        endRow: expect.any(Number),
        startCol: expect.any(Number),
        endCol: expect.any(Number)
      });
    });
  });

  // ============================================================================
  // TESTS FORMULES
  // ============================================================================

  describe('Formula Handling', () => {
    let formulaBuffer: Buffer;

    beforeEach(() => {
      const workbook = XLSX.utils.book_new();
      
      const data = [
        ['A', 'B', 'Somme', 'Moyenne'],
        [10, 20, { f: 'A2+B2', v: 30 }, { f: 'AVERAGE(A2:B2)', v: 15 }],
        [15, 25, { f: 'A3+B3', v: 40 }, { f: 'AVERAGE(A3:B3)', v: 20 }]
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Formulas');
      
      formulaBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    });

    it('should extract calculated values by default', async () => {
      const result = await parser.parseWorkbook(formulaBuffer);
      const sheet = result.sheets[0];
      
      // Par défaut, on obtient les valeurs calculées
      expect(sheet.rows[0]['Somme']).toBe(30);
      expect(sheet.rows[0]['Moyenne']).toBe(15);
    });

    it('should optionally preserve formula strings', async () => {
      const result = await parser.parseWorkbook(formulaBuffer, {
        preserveFormulas: true
      });
      
      const sheet = result.sheets[0];
      expect(sheet.formulas).toBeDefined();
      expect(sheet.formulas['C2']).toBe('A2+B2');
    });

    it('should identify columns containing formulas', async () => {
      const result = await parser.parseWorkbook(formulaBuffer, {
        preserveFormulas: true
      });
      
      const sheet = result.sheets[0];
      expect(sheet.columnsWithFormulas).toContain('Somme');
      expect(sheet.columnsWithFormulas).toContain('Moyenne');
    });
  });

  // ============================================================================
  // TESTS DÉTECTION DE HEADER
  // ============================================================================

  describe('Header Detection', () => {
    it('should auto-detect header row in standard format', async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['ID', 'Name', 'Value'],
        [1, 'Item A', 100],
        [2, 'Item B', 200]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer);
      
      expect(result.sheets[0].headerRow).toBe(0);
      expect(result.sheets[0].headers).toEqual(['ID', 'Name', 'Value']);
    });

    it('should detect header row when data starts after empty rows', async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['', '', ''],
        ['', '', ''],
        ['ID', 'Name', 'Value'],
        [1, 'Item A', 100]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer, { autoDetectHeader: true });
      
      expect(result.sheets[0].headerRow).toBe(2);
      expect(result.sheets[0].headers).toEqual(['ID', 'Name', 'Value']);
    });

    it('should allow manual header row specification', async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['Report Title'],
        ['Generated: 2025'],
        ['ID', 'Name', 'Value'],
        [1, 'Item A', 100]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer, { headerRow: 2 });
      
      expect(result.sheets[0].headers).toEqual(['ID', 'Name', 'Value']);
      expect(result.sheets[0].rows).toHaveLength(1);
    });

    it('should handle files without headers', async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        [1, 'Item A', 100],
        [2, 'Item B', 200]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer, { hasHeaders: false });
      
      expect(result.sheets[0].headers).toEqual(['Column_A', 'Column_B', 'Column_C']);
      expect(result.sheets[0].rows).toHaveLength(2);
    });
  });

  // ============================================================================
  // TESTS TYPES DE DONNÉES
  // ============================================================================

  describe('Data Type Detection', () => {
    let typedDataBuffer: Buffer;

    beforeEach(() => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['StringCol', 'NumberCol', 'DateCol', 'BoolCol', 'CurrencyCol', 'PercentCol'],
        ['Hello', 42, new Date('2024-01-15'), true, 1500.50, 0.75],
        ['World', 3.14, new Date('2024-06-20'), false, 2300.00, 0.25],
        ['Test', -100, new Date('2024-12-01'), true, 500.75, 0.50]
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(data, { cellDates: true });
      XLSX.utils.book_append_sheet(workbook, worksheet, 'TypedData');
      typedDataBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    });

    it('should detect column data types', async () => {
      const result = await parser.parseWorkbook(typedDataBuffer, {
        detectTypes: true
      });
      
      const sheet = result.sheets[0];
      expect(sheet.columnTypes).toBeDefined();
      expect(sheet.columnTypes['StringCol']).toBe('string');
      expect(sheet.columnTypes['NumberCol']).toBe('number');
      expect(sheet.columnTypes['BoolCol']).toBe('boolean');
    });

    it('should detect date columns', async () => {
      const result = await parser.parseWorkbook(typedDataBuffer, {
        detectTypes: true
      });
      
      const sheet = result.sheets[0];
      expect(sheet.columnTypes['DateCol']).toBe('date');
    });

    it('should provide type statistics', async () => {
      const result = await parser.parseWorkbook(typedDataBuffer, {
        detectTypes: true
      });
      
      const sheet = result.sheets[0];
      expect(sheet.typeStats).toBeDefined();
      expect(sheet.typeStats.numericColumns).toContain('NumberCol');
      expect(sheet.typeStats.dateColumns).toContain('DateCol');
      expect(sheet.typeStats.textColumns).toContain('StringCol');
    });

    it('should handle mixed type columns', async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['MixedCol'],
        [100],
        ['Text'],
        [200],
        ['More Text']
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mixed');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer, { detectTypes: true });
      
      expect(result.sheets[0].columnTypes['MixedCol']).toBe('mixed');
    });
  });

  // ============================================================================
  // TESTS CSV
  // ============================================================================

  describe('CSV Parsing', () => {
    it('should parse CSV with comma separator', async () => {
      const csvContent = 'Name,Age,City\nAlice,30,Paris\nBob,25,Lyon';
      const buffer = Buffer.from(csvContent);
      
      const result = await parser.parseWorkbook(buffer, { fileType: 'csv' });
      
      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].headers).toEqual(['Name', 'Age', 'City']);
      expect(result.sheets[0].rows).toHaveLength(2);
    });

    it('should auto-detect semicolon separator', async () => {
      const csvContent = 'Name;Age;City\nAlice;30;Paris\nBob;25;Lyon';
      const buffer = Buffer.from(csvContent);
      
      const result = await parser.parseWorkbook(buffer, { fileType: 'csv' });
      
      expect(result.sheets[0].headers).toEqual(['Name', 'Age', 'City']);
      expect(result.sheets[0].detectedSeparator).toBe(';');
    });

    it('should auto-detect tab separator', async () => {
      const csvContent = 'Name\tAge\tCity\nAlice\t30\tParis';
      const buffer = Buffer.from(csvContent);
      
      const result = await parser.parseWorkbook(buffer, { fileType: 'csv' });
      
      expect(result.sheets[0].detectedSeparator).toBe('\t');
    });

    it('should handle quoted fields with separators inside', async () => {
      const csvContent = 'Name,Description,Price\n"Widget, Premium","Best widget, ever",29.99';
      const buffer = Buffer.from(csvContent);
      
      const result = await parser.parseWorkbook(buffer, { fileType: 'csv' });
      
      expect(result.sheets[0].rows[0]['Name']).toBe('Widget, Premium');
      expect(result.sheets[0].rows[0]['Description']).toBe('Best widget, ever');
    });

    it('should handle different encodings', async () => {
      const csvContent = 'Nom,Prénom,Ville\nDupont,Rémi,Montréal';
      const buffer = Buffer.from(csvContent, 'utf-8');
      
      const result = await parser.parseWorkbook(buffer, { 
        fileType: 'csv',
        encoding: 'utf-8'
      });
      
      expect(result.sheets[0].rows[0]['Prénom']).toBe('Rémi');
      expect(result.sheets[0].rows[0]['Ville']).toBe('Montréal');
    });
  });

  // ============================================================================
  // TESTS PERFORMANCE ET LIMITES
  // ============================================================================

  describe('Performance and Limits', () => {
    it('should handle large datasets efficiently', async () => {
      const workbook = XLSX.utils.book_new();
      
      // Générer 10000 lignes
      const data = [['ID', 'Value', 'Category']];
      for (let i = 0; i < 10000; i++) {
        data.push([i, Math.random() * 1000, `Cat${i % 10}`]);
      }
      
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'LargeData');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const startTime = Date.now();
      const result = await parser.parseWorkbook(buffer);
      const endTime = Date.now();
      
      expect(result.sheets[0].rows).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(5000); // Moins de 5 secondes
    });

    it('should respect maxRows limit', async () => {
      const workbook = XLSX.utils.book_new();
      const data = [['ID']];
      for (let i = 0; i < 1000; i++) {
        data.push([i]);
      }
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const limitedParser = new ExcelParserService({ maxRows: 100 });
      const result = await limitedParser.parseWorkbook(buffer);
      
      expect(result.sheets[0].rows.length).toBeLessThanOrEqual(100);
      expect(result.metadata.truncated).toBe(true);
      expect(result.metadata.originalRowCount).toBe(1000);
    });

    it('should provide parsing time in metadata', async () => {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([['A'], [1]]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer);
      
      expect(result.metadata.parsingTimeMs).toBeDefined();
      expect(result.metadata.parsingTimeMs).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TESTS EXTRACTION DE PLAGES
  // ============================================================================

  describe('Range Extraction', () => {
    let testBuffer: Buffer;

    beforeEach(() => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['A', 'B', 'C', 'D', 'E'],
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10],
        [11, 12, 13, 14, 15],
        [16, 17, 18, 19, 20]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'RangeTest');
      testBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    });

    it('should extract specific column range', async () => {
      const result = await parser.parseWorkbook(testBuffer, {
        columns: ['B', 'C', 'D']
      });
      
      expect(result.sheets[0].headers).toEqual(['B', 'C', 'D']);
      expect(Object.keys(result.sheets[0].rows[0])).toHaveLength(3);
    });

    it('should extract specific row range', async () => {
      const result = await parser.parseWorkbook(testBuffer, {
        startRow: 1,
        endRow: 2
      });
      
      expect(result.sheets[0].rows).toHaveLength(2);
      expect(result.sheets[0].rows[0]['A']).toBe(1);
      expect(result.sheets[0].rows[1]['A']).toBe(6);
    });

    it('should extract using Excel-style range notation', async () => {
      const result = await parser.parseWorkbook(testBuffer, {
        range: 'B2:D4'
      });
      
      expect(result.sheets[0].rows).toHaveLength(3);
      expect(result.sheets[0].headers).toEqual(['B', 'C', 'D']);
    });
  });

  // ============================================================================
  // TESTS GESTION D'ERREURS
  // ============================================================================

  describe('Error Handling', () => {
    it('should provide detailed error for corrupted files', async () => {
      const corruptedBuffer = Buffer.from('PK\x03\x04corrupted data here');
      
      try {
        await parser.parseWorkbook(corruptedBuffer);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('PARSE_ERROR');
        expect(error.message).toContain('corrupted');
      }
    });

    it('should handle sheets with no data gracefully', async () => {
      const workbook = XLSX.utils.book_new();
      const emptySheet = XLSX.utils.aoa_to_sheet([]);
      XLSX.utils.book_append_sheet(workbook, emptySheet, 'Empty');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer);
      
      expect(result.sheets[0].rows).toHaveLength(0);
      expect(result.sheets[0].isEmpty).toBe(true);
    });

    it('should handle special characters in sheet names', async () => {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([['A'], [1]]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Données été 2024!');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer);
      
      expect(result.sheets[0].name).toBe('Données été 2024!');
    });

    it('should handle null and undefined values in cells', async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['A', 'B', 'C'],
        [1, null, 3],
        [4, undefined, 6]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Nulls');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer);
      
      expect(result.sheets[0].rows[0]['B']).toBeNull();
      expect(result.sheets[0].rows[1]['B']).toBeNull();
    });
  });

  // ============================================================================
  // TESTS MÉTADONNÉES AVANCÉES
  // ============================================================================

  describe('Advanced Metadata', () => {
    it('should extract file properties when available', async () => {
      const workbook = XLSX.utils.book_new();
      workbook.Props = {
        Title: 'Test Report',
        Author: 'Test Author',
        Company: 'Test Company',
        CreatedDate: new Date('2024-01-01')
      };
      const worksheet = XLSX.utils.aoa_to_sheet([['A'], [1]]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Test');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer);
      
      expect(result.metadata.properties).toBeDefined();
      expect(result.metadata.properties.title).toBe('Test Report');
      expect(result.metadata.properties.author).toBe('Test Author');
    });

    it('should provide summary statistics for each sheet', async () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ['Value'],
        [10],
        [20],
        [30],
        [null],
        [50]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Stats');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      const result = await parser.parseWorkbook(buffer, { includeStats: true });
      
      expect(result.sheets[0].stats).toBeDefined();
      expect(result.sheets[0].stats.nullCount).toBe(1);
      expect(result.sheets[0].stats.filledCells).toBe(4);
    });
  });
});

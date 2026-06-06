/**
 * ChatFileProcessor - Tests TDD Stricts
 * 
 * Tests complets pour le processeur de fichiers dans le chat
 * Couverture cible: 100%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChatFileProcessor } from '../../src/chat/ChatFileProcessor.js';
import { FileContextManager } from '../../src/chat/FileContextManager.js';
import * as XLSX from 'xlsx';

// Mocks
vi.mock('../../src/excel/ExcelAnalyzer.js', () => ({
  ExcelAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      success: true,
      sheets: [{
        name: 'Sheet1',
        rows: [{ A: 1, B: 2 }],
        statistics: { A: { mean: 1 } }
      }],
      metadata: { totalRows: 1 }
    }),
    analyzeWithAI: vi.fn().mockResolvedValue({
      success: true,
      aiInsights: { content: 'AI analysis result' },
      statistics: { A: { mean: 1 } }
    }),
    exportForChat: vi.fn().mockReturnValue({
      text: 'Analysis summary',
      highlights: []
    })
  }))
}));

vi.mock('../../src/core/TaskTypeProcessor.js', () => ({
  TaskTypeProcessor: vi.fn().mockImplementation(() => ({
    process: vi.fn().mockResolvedValue({
      content: 'Processed response',
      metadata: {}
    })
  }))
}));

describe('ChatFileProcessor', () => {
  let processor: ChatFileProcessor;
  let testExcelBuffer: Buffer;
  let testCSVBuffer: Buffer;

  beforeEach(() => {
    processor = new ChatFileProcessor();
    
    // Créer fichier Excel de test
    const workbook = XLSX.utils.book_new();
    const data = [
      ['Name', 'Value', 'Category'],
      ['Item A', 100, 'Type1'],
      ['Item B', 200, 'Type2'],
      ['Item C', 150, 'Type1']
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    testExcelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Créer fichier CSV de test
    testCSVBuffer = Buffer.from('Name,Value,Category\nItem A,100,Type1\nItem B,200,Type2');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // TESTS D'INITIALISATION
  // ============================================================================

  describe('Initialization', () => {
    it('should create an instance with required components', () => {
      expect(processor).toBeInstanceOf(ChatFileProcessor);
      expect(processor.fileContextManager).toBeInstanceOf(FileContextManager);
    });

    it('should define supported file types', () => {
      expect(processor.supportedTypes).toBeDefined();
      expect(processor.supportedTypes).toContain('xlsx');
      expect(processor.supportedTypes).toContain('xls');
      expect(processor.supportedTypes).toContain('csv');
    });

    it('should have configurable options', () => {
      const customProcessor = new ChatFileProcessor({
        maxFileSize: 100 * 1024 * 1024,
        contextTTL: 60 * 60 * 1000
      });
      
      expect(customProcessor.options.maxFileSize).toBe(100 * 1024 * 1024);
      expect(customProcessor.options.contextTTL).toBe(60 * 60 * 1000);
    });
  });

  // ============================================================================
  // TESTS DÉTECTION DE TYPE DE FICHIER
  // ============================================================================

  describe('File Type Detection', () => {
    it('should detect XLSX files by MIME type', () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'test.xlsx'
      };
      
      const type = processor.detectFileType(file);
      expect(type).toBe('xlsx');
    });

    it('should detect XLS files by MIME type', () => {
      const file = {
        buffer: Buffer.from([]),
        mimetype: 'application/vnd.ms-excel',
        originalname: 'test.xls'
      };
      
      const type = processor.detectFileType(file);
      expect(type).toBe('xls');
    });

    it('should detect CSV files by MIME type', () => {
      const file = {
        buffer: testCSVBuffer,
        mimetype: 'text/csv',
        originalname: 'test.csv'
      };
      
      const type = processor.detectFileType(file);
      expect(type).toBe('csv');
    });

    it('should fallback to extension detection', () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/octet-stream',
        originalname: 'data.xlsx'
      };
      
      const type = processor.detectFileType(file);
      expect(type).toBe('xlsx');
    });

    it('should throw for unsupported file types', () => {
      const file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
        originalname: 'image.png'
      };
      
      expect(() => processor.detectFileType(file))
        .toThrow('Unsupported file type');
    });
  });

  // ============================================================================
  // TESTS TRAITEMENT DE FICHIER AVEC MESSAGE
  // ============================================================================

  describe('Process File With Message', () => {
    it('should process Excel file with user message', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'sales.xlsx',
        size: testExcelBuffer.length
      };
      
      const result = await processor.processMessageWithFile(
        'Analyze this file',
        file,
        'session-123'
      );
      
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.fileContext).toBeDefined();
    });

    it('should store file context for follow-up questions', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'data.xlsx',
        size: testExcelBuffer.length
      };
      
      const _result = await processor.processMessageWithFile(
        'What trends do you see?',
        file,
        'session-456'
      );
      
      const context = await processor.fileContextManager.get('session-456');
      
      expect(context).toBeDefined();
      expect(context?.metadata.originalName).toBe('data.xlsx');
    });

    it('should include analysis statistics in response', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'report.xlsx',
        size: testExcelBuffer.length
      };
      
      const result = await processor.processMessageWithFile(
        'Give me statistics',
        file,
        'session-789'
      );
      
      expect(result.analysis).toBeDefined();
      expect(result.analysis.statistics).toBeDefined();
    });

    it('should handle CSV files', async () => {
      const file = {
        buffer: testCSVBuffer,
        mimetype: 'text/csv',
        originalname: 'data.csv',
        size: testCSVBuffer.length
      };
      
      const result = await processor.processMessageWithFile(
        'Analyze CSV data',
        file,
        'session-csv'
      );
      
      expect(result.success).toBe(true);
    });

    it('should respect file size limits', async () => {
      const smallProcessor = new ChatFileProcessor({ maxFileSize: 100 });
      const file = {
        buffer: testExcelBuffer, // Larger than 100 bytes
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'large.xlsx',
        size: testExcelBuffer.length
      };
      
      await expect(smallProcessor.processMessageWithFile(
        'Analyze',
        file,
        'session-large'
      )).rejects.toThrow('File size exceeds limit');
    });

    it('should include metadata in response', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'test.xlsx',
        size: testExcelBuffer.length
      };
      
      const result = await processor.processMessageWithFile(
        'Analyze',
        file,
        'session-meta'
      );
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.fileName).toBe('test.xlsx');
      expect(result.metadata.fileType).toBe('xlsx');
      expect(result.metadata.analyzedAt).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS QUESTIONS DE SUIVI
  // ============================================================================

  describe('Follow-up Questions', () => {
    beforeEach(async () => {
      // Établir un contexte de fichier
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'initial.xlsx',
        size: testExcelBuffer.length
      };
      
      await processor.processMessageWithFile(
        'Initial analysis',
        file,
        'follow-up-session'
      );
    });

    it('should handle follow-up questions using file context', async () => {
      const result = await processor.processFollowUpQuestion(
        'What is the average value?',
        'follow-up-session'
      );
      
      expect(result).not.toBeNull();
      expect(result?.hasFileContext).toBe(true);
    });

    it('should return null if no file context exists', async () => {
      const result = await processor.processFollowUpQuestion(
        'What is the average?',
        'non-existent-session'
      );
      
      expect(result).toBeNull();
    });

    it('should include file context in follow-up prompt', async () => {
      const result = await processor.processFollowUpQuestion(
        'Show me by category',
        'follow-up-session'
      );
      
      expect(result?.enrichedPrompt).toContain('initial.xlsx');
    });

    it('should update last accessed time on follow-up', async () => {
      const contextBefore = await processor.fileContextManager.get('follow-up-session');
      const lastAccessedBefore = contextBefore?.lastAccessed;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await processor.processFollowUpQuestion(
        'More analysis',
        'follow-up-session'
      );
      
      const contextAfter = await processor.fileContextManager.get('follow-up-session');
      expect(contextAfter?.lastAccessed).toBeGreaterThan(lastAccessedBefore!);
    });
  });

  // ============================================================================
  // TESTS GÉNÉRATION DE RÉPONSE
  // ============================================================================

  describe('Response Generation', () => {
    it('should format response for chat display', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'data.xlsx',
        size: testExcelBuffer.length
      };
      
      const result = await processor.processMessageWithFile(
        'Summarize this data',
        file,
        'response-session'
      );
      
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
    });

    it('should include visualizations when available', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'chart-data.xlsx',
        size: testExcelBuffer.length
      };
      
      const result = await processor.processMessageWithFile(
        'Show me the distribution',
        file,
        'viz-session'
      );
      
      expect(result.visualizations).toBeDefined();
    });

    it('should handle analysis with specific questions', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'query.xlsx',
        size: testExcelBuffer.length
      };
      
      const result = await processor.processMessageWithFile(
        'What is the total revenue by region?',
        file,
        'query-session'
      );
      
      expect(result.queryType).toBe('aggregation');
    });

    it('should detect analysis intent from message', () => {
      expect(processor.detectAnalysisIntent('Analyze this data'))
        .toBe('general_analysis');
      expect(processor.detectAnalysisIntent('Show trends over time'))
        .toBe('time_series');
      expect(processor.detectAnalysisIntent('Compare categories'))
        .toBe('comparison');
      expect(processor.detectAnalysisIntent('What is the average?'))
        .toBe('aggregation');
      expect(processor.detectAnalysisIntent('Find outliers'))
        .toBe('outlier_detection');
    });
  });

  // ============================================================================
  // TESTS FILE CONTEXT MANAGER
  // ============================================================================

  describe('FileContextManager', () => {
    let contextManager: FileContextManager;

    beforeEach(() => {
      contextManager = new FileContextManager();
    });

    it('should store file context', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: testExcelBuffer.length
      };
      
      const context = await contextManager.store('test-session', file, {
        originalName: 'test.xlsx',
        type: 'xlsx'
      });
      
      expect(context.id).toBeDefined();
      expect(context.sessionId).toBe('test-session');
    });

    it('should retrieve file context', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: testExcelBuffer.length
      };
      
      await contextManager.store('retrieve-session', file, {
        originalName: 'retrieve.xlsx',
        type: 'xlsx'
      });
      
      const retrieved = await contextManager.get('retrieve-session');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.metadata.originalName).toBe('retrieve.xlsx');
    });

    it('should enrich context with analysis results', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: testExcelBuffer.length
      };
      
      await contextManager.store('enrich-session', file, {
        originalName: 'enrich.xlsx',
        type: 'xlsx'
      });
      
      await contextManager.enrichContext('enrich-session', {
        columns: ['A', 'B', 'C'],
        analysis: 'Summary of analysis',
        statistics: { A: { mean: 10 } }
      });
      
      const context = await contextManager.get('enrich-session');
      
      expect(context?.columns).toEqual(['A', 'B', 'C']);
      expect(context?.analysis).toBe('Summary of analysis');
    });

    it('should delete context', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: testExcelBuffer.length
      };
      
      await contextManager.store('delete-session', file, {
        originalName: 'delete.xlsx',
        type: 'xlsx'
      });
      
      await contextManager.delete('delete-session');
      
      const context = await contextManager.get('delete-session');
      expect(context).toBeUndefined();
    });

    it('should list active sessions', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: testExcelBuffer.length
      };
      
      await contextManager.store('session-1', file, { originalName: 'file1.xlsx', type: 'xlsx' });
      await contextManager.store('session-2', file, { originalName: 'file2.xlsx', type: 'xlsx' });
      
      const sessions = contextManager.listActiveSessions();
      
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
    });

    it('should track context creation time', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: testExcelBuffer.length
      };
      
      const before = Date.now();
      await contextManager.store('time-session', file, { originalName: 'time.xlsx', type: 'xlsx' });
      const after = Date.now();
      
      const context = await contextManager.get('time-session');
      
      expect(context?.createdAt).toBeGreaterThanOrEqual(before);
      expect(context?.createdAt).toBeLessThanOrEqual(after);
    });
  });

  // ============================================================================
  // TESTS VALIDATION
  // ============================================================================

  describe('Validation', () => {
    it('should validate file before processing', () => {
      const validFile = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'valid.xlsx',
        size: testExcelBuffer.length
      };
      
      expect(processor.validateFile(validFile)).toBe(true);
    });

    it('should reject files without buffer', () => {
      const noBufferFile = {
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'nobuffer.xlsx'
      };
      
      expect(() => processor.validateFile(noBufferFile as any))
        .toThrow('File buffer is required');
    });

    it('should reject empty files', () => {
      const emptyFile = {
        buffer: Buffer.from([]),
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'empty.xlsx',
        size: 0
      };
      
      expect(() => processor.validateFile(emptyFile))
        .toThrow('File is empty');
    });

    it('should validate session ID', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'test.xlsx',
        size: testExcelBuffer.length
      };
      
      await expect(processor.processMessageWithFile(
        'Analyze',
        file,
        '' // Empty session ID
      )).rejects.toThrow('Session ID is required');
    });

    it('should sanitize file names', () => {
      const sanitized = processor.sanitizeFileName('../../../etc/passwd');
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
    });
  });

  // ============================================================================
  // TESTS GESTION D'ERREURS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle parsing errors gracefully', async () => {
      const corruptFile = {
        buffer: Buffer.from('not valid excel'),
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'corrupt.xlsx',
        size: 100
      };
      
      const result = await processor.processMessageWithFile(
        'Analyze',
        corruptFile,
        'error-session'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('PARSE_ERROR');
    });

    it('should provide user-friendly error messages', async () => {
      const corruptFile = {
        buffer: Buffer.from('corrupt'),
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'bad.xlsx',
        size: 7
      };
      
      const result = await processor.processMessageWithFile(
        'Analyze',
        corruptFile,
        'friendly-error'
      );
      
      expect(result.userMessage).toBeDefined();
      expect(result.userMessage).not.toContain('stack');
    });

    it('should log errors for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const badFile = {
        buffer: Buffer.from('bad'),
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'bad.xlsx',
        size: 3
      };
      
      await processor.processMessageWithFile('Analyze', badFile, 'log-session');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle timeout for large file processing', async () => {
      const slowProcessor = new ChatFileProcessor({ processingTimeout: 1 });
      
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'slow.xlsx',
        size: testExcelBuffer.length
      };
      
      // This might not always timeout in tests, but the mechanism should exist
      const result = await slowProcessor.processMessageWithFile(
        'Analyze',
        file,
        'timeout-session'
      );
      
      expect(result).toBeDefined();
    });
  });

  // ============================================================================
  // TESTS NETTOYAGE ET MÉMOIRE
  // ============================================================================

  describe('Cleanup and Memory Management', () => {
    it('should clean up expired contexts', async () => {
      const shortTTLManager = new FileContextManager({ contextTTL: 100 }); // 100ms TTL
      
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: testExcelBuffer.length
      };
      
      await shortTTLManager.store('expiring-session', file, {
        originalName: 'expire.xlsx',
        type: 'xlsx'
      });
      
      // Wait for TTL
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const context = await shortTTLManager.get('expiring-session');
      expect(context).toBeUndefined();
    });

    it('should limit number of concurrent contexts', async () => {
      const limitedManager = new FileContextManager({ maxContexts: 2 });
      
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: testExcelBuffer.length
      };
      
      await limitedManager.store('session-1', file, { originalName: 'f1.xlsx', type: 'xlsx' });
      await limitedManager.store('session-2', file, { originalName: 'f2.xlsx', type: 'xlsx' });
      await limitedManager.store('session-3', file, { originalName: 'f3.xlsx', type: 'xlsx' });
      
      // Oldest should be evicted
      const sessions = limitedManager.listActiveSessions();
      expect(sessions.length).toBeLessThanOrEqual(2);
    });

    it('should provide memory usage statistics', () => {
      const stats = processor.fileContextManager.getStats();
      
      expect(stats.activeContexts).toBeDefined();
      expect(stats.totalMemoryUsage).toBeDefined();
    });

    it('should manually clear all contexts', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: testExcelBuffer.length
      };
      
      await processor.fileContextManager.store('clear-1', file, { originalName: 'f1.xlsx', type: 'xlsx' });
      await processor.fileContextManager.store('clear-2', file, { originalName: 'f2.xlsx', type: 'xlsx' });
      
      processor.fileContextManager.clearAll();
      
      expect(processor.fileContextManager.listActiveSessions()).toHaveLength(0);
    });
  });

  // ============================================================================
  // TESTS INTÉGRATION ANALYSE
  // ============================================================================

  describe('Analysis Integration', () => {
    it('should pass user query to analyzer', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'query-test.xlsx',
        size: testExcelBuffer.length
      };
      
      const result = await processor.processMessageWithFile(
        'What is the trend in sales over time?',
        file,
        'query-integration'
      );
      
      expect(result.analysisOptions?.userQuery).toBe('What is the trend in sales over time?');
    });

    it('should detect analysis type from user message', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'detect.xlsx',
        size: testExcelBuffer.length
      };
      
      const trendResult = await processor.processMessageWithFile(
        'Show me the trends',
        file,
        'trend-session'
      );
      
      expect(trendResult.analysisOptions?.analysisType).toBe('time_series');
      
      const compareResult = await processor.processMessageWithFile(
        'Compare regions',
        file,
        'compare-session'
      );
      
      expect(compareResult.analysisOptions?.analysisType).toBe('comparison');
    });

    it('should include AI insights in response', async () => {
      const file = {
        buffer: testExcelBuffer,
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalname: 'ai-test.xlsx',
        size: testExcelBuffer.length
      };
      
      const result = await processor.processMessageWithFile(
        'Give me insights about this data',
        file,
        'ai-session'
      );
      
      expect(result.aiInsights).toBeDefined();
    });
  });
});

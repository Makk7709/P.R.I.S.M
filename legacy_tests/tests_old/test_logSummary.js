const LogSummary = require('../evolution/logSummary');
const fs = require('node:fs');
const path = require('node:path');

jest.mock('fs');
jest.mock('path');

describe('LogSummary', () => {
  let logSummary;
  const mockLogPath = '/mock/path/logs/summary.log';

  beforeEach(() => {
    logSummary = new LogSummary();
    path.join.mockReturnValue(mockLogPath);
    fs.appendFileSync.mockClear();
  });

  test('should add log entry with timestamp', () => {
    const entry = {
      type: 'TEST',
      message: 'Test message'
    };
    logSummary.addLogEntry(entry);
    expect(logSummary.logs).toHaveLength(1);
    expect(logSummary.logs[0]).toHaveProperty('timestamp');
    expect(logSummary.logs[0].type).toBe('TEST');
  });

  test('should generate summary with correct format', () => {
    logSummary.addLogEntry({
      type: 'TEST',
      message: 'Test message'
    });

    const summary = logSummary.generateSummary();
    
    expect(summary).toHaveProperty('startTime');
    expect(summary).toHaveProperty('endTime');
    expect(summary).toHaveProperty('duration');
    expect(summary).toHaveProperty('totalEntries');
    expect(summary.entries).toHaveLength(1);
  });

  test('should write summary to file', () => {
    logSummary.addLogEntry({
      type: 'TEST',
      message: 'Test message'
    });

    logSummary.generateSummary();
    
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      mockLogPath,
      expect.stringContaining('"type":"TEST"')
    );
  });

  test('should log prompt correctly', () => {
    const prompt = 'Test prompt';
    logSummary.logPrompt(prompt);
    
    expect(logSummary.logs[0].type).toBe('PROMPT');
    expect(logSummary.logs[0].data).toBe(prompt);
  });

  test('should log model response correctly', () => {
    const model = 'test-model';
    const response = 'Test response';
    logSummary.logModelResponse(model, response);
    
    expect(logSummary.logs[0].type).toBe('MODEL_RESPONSE');
    expect(logSummary.logs[0].data).toBe(response);
  });

  test('should log validation correctly', () => {
    const type = 'TEST_VALIDATION';
    const result = { valid: true };
    logSummary.logValidation(type, result);
    
    expect(logSummary.logs[0].type).toBe('VALIDATION');
    expect(logSummary.logs[0].data).toEqual(result);
  });

  test('should log error correctly', () => {
    const error = new Error('Test error');
    logSummary.logError(error);
    
    expect(logSummary.logs[0].type).toBe('ERROR');
    expect(logSummary.logs[0].data).toBe(error);
  });
}); 
/**
 * PRISM Excel Module - Export Principal
 * 
 * Module complet d'analyse de fichiers Excel pour PRISM.
 * 
 * @module src/excel
 */

export { ExcelParserService } from './ExcelParserService.js';
export { StatisticalEngine } from './StatisticalEngine.js';
export { DataTypeDetector, DataType, TypeConfidence } from './DataTypeDetector.js';
export { ExcelAnalyzer } from './ExcelAnalyzer.js';

// Export par défaut
export { ExcelAnalyzer as default } from './ExcelAnalyzer.js';

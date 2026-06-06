/**
 * ExcelParserService - Service de parsing de fichiers Excel
 * 
 * Service complet pour le parsing de fichiers Excel complexes.
 * Supporte: XLSX, XLS, CSV, ODS
 * Fonctionnalités: multi-feuilles, cellules fusionnées, formules, détection de types
 * 
 * @module src/excel/ExcelParserService
 */

import * as XLSX from 'xlsx';
import { DataTypeDetector } from './DataTypeDetector.js';

/**
 * Magic bytes pour détection de format
 */
const MAGIC_BYTES = {
  XLSX: [0x50, 0x4B, 0x03, 0x04], // PK (ZIP)
  XLS: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] // OLE2
};

/**
 * Types MIME supportés
 */
const SUPPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'text/csv',
  'application/csv',
  'text/plain', // csv parfois
  'application/vnd.oasis.opendocument.spreadsheet' // ods
];

/**
 * ExcelParserService - Classe principale de parsing
 */
export class ExcelParserService {
  /**
   * @param {Object} options - Options de configuration
   * @param {number} options.maxFileSize - Taille maximale en bytes (défaut: 50MB)
   * @param {number} options.maxRows - Nombre maximum de lignes (défaut: 1M)
   * @param {number} options.maxSheets - Nombre maximum de feuilles (défaut: 50)
   */
  constructor(options = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
      maxRows: options.maxRows || 1000000,
      maxSheets: options.maxSheets || 50,
      defaultEncoding: options.defaultEncoding || 'utf-8',
      ...options
    };
    
    this.supportedFormats = ['.xlsx', '.xls', '.csv', '.ods'];
    this.typeDetector = new DataTypeDetector();
  }

  /**
   * Parse un workbook Excel depuis un buffer
   * @param {Buffer} buffer - Buffer du fichier
   * @param {Object} options - Options de parsing
   * @returns {Promise<Object>} Résultat du parsing
   */
  async parseWorkbook(buffer, options = {}) {
    const startTime = Date.now();
    const mergedOptions = { ...this.options, ...options };
    const warnings = [];

    // Validation
    this._validateBuffer(buffer, mergedOptions);

    try {
      // Déterminer le type de fichier
      const fileType = options.fileType || this.detectFileType(buffer);
      
      // Parser selon le type
      let workbook;
      if (fileType === 'csv') {
        workbook = this._parseCSV(buffer, mergedOptions);
      } else {
        workbook = XLSX.read(buffer, {
          type: 'buffer',
          cellDates: true,
          cellFormula: mergedOptions.preserveFormulas || false,
          cellStyles: false,
          sheetRows: mergedOptions.maxRows
        });
      }

      // Extraire les propriétés du fichier
      const properties = this._extractProperties(workbook);

      // Filtrer les feuilles si spécifié
      let sheetNames = workbook.SheetNames;
      
      if (mergedOptions.sheets) {
        const requestedSheets = mergedOptions.sheets;
        const foundSheets = sheetNames.filter(name => requestedSheets.includes(name));
        const notFound = requestedSheets.filter(name => !sheetNames.includes(name));
        
        notFound.forEach(name => warnings.push(`Sheet '${name}' not found`));
        sheetNames = foundSheets;
      }
      
      if (mergedOptions.sheetIndices) {
        sheetNames = mergedOptions.sheetIndices
          .filter(i => i < workbook.SheetNames.length)
          .map(i => workbook.SheetNames[i]);
      }

      // Parser chaque feuille
      const sheets = [];
      let totalRows = 0;

      for (const sheetName of sheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = this._parseSheet(worksheet, sheetName, mergedOptions);
        
        totalRows += sheetData.rows.length;
        
        // Vérifier la limite de lignes
        if (totalRows > mergedOptions.maxRows) {
          sheetData.truncated = true;
          sheetData.originalRowCount = sheetData.rows.length;
          sheetData.rows = sheetData.rows.slice(0, mergedOptions.maxRows - (totalRows - sheetData.rows.length));
        }
        
        sheets.push(sheetData);
      }

      // Calculer les métadonnées
      const totalColumns = sheets.reduce((max, s) => Math.max(max, s.headers?.length || 0), 0);
      const parsingTimeMs = Date.now() - startTime;

      return {
        success: true,
        sheets,
        metadata: {
          totalRows: sheets.reduce((sum, s) => sum + s.rows.length, 0),
          totalSheets: sheets.length,
          totalColumns,
          parsedAt: new Date().toISOString(),
          parsingTimeMs,
          fileType,
          truncated: totalRows > mergedOptions.maxRows,
          originalRowCount: totalRows > mergedOptions.maxRows ? totalRows : undefined,
          properties
        },
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      // Gestion d'erreur détaillée
      const errorDetails = {
        code: 'PARSE_ERROR',
        message: error.message,
        details: error.stack
      };
      
      if (error.message.includes('password')) {
        errorDetails.code = 'PASSWORD_PROTECTED';
        errorDetails.message = 'Le fichier est protégé par mot de passe';
      } else if (error.message.includes('corrupt') || error.message.includes('Invalid')) {
        errorDetails.code = 'CORRUPTED_FILE';
        errorDetails.message = 'Le fichier semble corrompu ou dans un format invalide';
      }
      
      throw Object.assign(new Error(errorDetails.message), errorDetails);
    }
  }

  /**
   * Valide le buffer d'entrée
   * @private
   */
  _validateBuffer(buffer, options) {
    if (!buffer) {
      throw new Error('Invalid input: buffer is required');
    }
    
    if (!(buffer instanceof Buffer)) {
      throw new Error('Invalid input: buffer must be a Buffer instance');
    }
    
    if (buffer.length === 0) {
      throw new Error('Invalid input: buffer is empty');
    }
    
    if (buffer.length > options.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed (${options.maxFileSize} bytes)`);
    }
  }

  /**
   * Détecte le type de fichier depuis les magic bytes
   * @param {Buffer} buffer - Buffer du fichier
   * @returns {string} Type de fichier détecté
   */
  detectFileType(buffer) {
    if (buffer.length < 4) {
      return 'csv'; // Probablement un petit fichier texte
    }

    // Vérifier XLSX (ZIP)
    if (this._matchMagicBytes(buffer, MAGIC_BYTES.XLSX)) {
      return 'xlsx';
    }

    // Vérifier XLS (OLE2)
    if (this._matchMagicBytes(buffer, MAGIC_BYTES.XLS)) {
      return 'xls';
    }

    // Vérifier si c'est du texte (CSV)
    const sample = buffer.slice(0, 1000).toString('utf-8');
    if (this._looksLikeCSV(sample)) {
      return 'csv';
    }

    return 'xlsx'; // Par défaut, essayer comme xlsx
  }

  /**
   * Compare les magic bytes
   * @private
   */
  _matchMagicBytes(buffer, magic) {
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Vérifie si le contenu ressemble à du CSV
   * @private
   */
  _looksLikeCSV(sample) {
    // Compter les séparateurs potentiels
    const commaCount = (sample.match(/,/g) || []).length;
    const semicolonCount = (sample.match(/;/g) || []).length;
    const tabCount = (sample.match(/\t/g) || []).length;
    
    // S'il y a des séparateurs récurrents, c'est probablement du CSV
    const lineCount = (sample.match(/\n/g) || []).length;
    if (lineCount > 0) {
      const avgCommas = commaCount / lineCount;
      const avgSemicolons = semicolonCount / lineCount;
      const avgTabs = tabCount / lineCount;
      
      return avgCommas > 1 || avgSemicolons > 1 || avgTabs > 1;
    }
    
    return false;
  }

  /**
   * Valide un type MIME
   * @param {string} mimeType - Type MIME à valider
   * @returns {boolean} True si valide
   */
  isValidMimeType(mimeType) {
    return SUPPORTED_MIME_TYPES.includes(mimeType);
  }

  /**
   * Parse un fichier CSV
   * @private
   */
  _parseCSV(buffer, options) {
    const content = buffer.toString(options.encoding || 'utf-8');
    
    // Détecter le séparateur
    const separator = this._detectCSVSeparator(content);
    
    const workbook = XLSX.read(content, {
      type: 'string',
      FS: separator,
      cellDates: true
    });
    
    // Stocker le séparateur détecté
    workbook._detectedSeparator = separator;
    
    return workbook;
  }

  /**
   * Détecte le séparateur CSV
   * @private
   */
  _detectCSVSeparator(content) {
    const firstLine = content.split('\n')[0] || '';
    
    const counts = {
      ',': (firstLine.match(/,/g) || []).length,
      ';': (firstLine.match(/;/g) || []).length,
      '\t': (firstLine.match(/\t/g) || []).length
    };
    
    let maxSep = ',';
    let maxCount = counts[','];
    
    for (const [sep, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxSep = sep;
      }
    }
    
    return maxSep;
  }

  /**
   * Parse une feuille de calcul
   * @private
   */
  _parseSheet(worksheet, sheetName, options) {
    // Obtenir la plage de données
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Gérer les feuilles vides
    if (!worksheet['!ref']) {
      return {
        name: sheetName,
        headers: [],
        rows: [],
        isEmpty: true,
        headerRow: 0
      };
    }

    // Déterminer la ligne d'en-tête
    const headerRow = this._resolveHeaderRow(worksheet, range, options);

    // Extraire les en-têtes (et éventuel filtre de colonnes)
    const resolvedHeaders = this._resolveHeaders(worksheet, range, headerRow, options);
    let headers = resolvedHeaders.headers;
    const columnIndices = resolvedHeaders.columnIndices;

    // Déterminer les bornes de lignes de données
    let { startRow, endRow } = this._resolveRowRange(range, headerRow, options);

    // Gérer la notation de plage Excel (surcharge en-têtes + bornes)
    if (options.range) {
      const override = this._applyExcelRangeNotation(worksheet, options);
      headers = override.headers;
      startRow = override.startRow;
      endRow = override.endRow;
    }

    // Extraire les lignes
    const rows = this._extractRows(worksheet, headers, startRow, endRow, range, options, columnIndices);

    // Extraire les cellules fusionnées
    const mergedCells = this._extractMergedCells(worksheet);

    // Données dérivées optionnelles (formules, types, stats)
    const derived = this._buildDerivedSheetData(worksheet, rows, headers, startRow, endRow, options);

    return {
      name: sheetName,
      headers,
      rows,
      headerRow,
      mergedCells,
      formulas: derived.formulas,
      columnsWithFormulas: derived.columnsWithFormulas,
      columnTypes: derived.columnTypes,
      typeStats: derived.typeStats,
      stats: derived.stats,
      isEmpty: rows.length === 0,
      detectedSeparator: worksheet._detectedSeparator
    };
  }

  /**
   * Détermine la ligne d'en-tête (auto-détection si demandée).
   * @private
   */
  _resolveHeaderRow(worksheet, range, options) {
    const headerRow = options.headerRow ?? 0;
    if (options.autoDetectHeader) {
      return this._detectHeaderRow(worksheet, range);
    }
    return headerRow;
  }

  /**
   * Extrait les en-têtes et applique l'éventuel filtre de colonnes.
   * @private
   */
  _resolveHeaders(worksheet, range, headerRow, options) {
    let headers;
    if (options.hasHeaders === false) {
      // Générer des noms de colonnes
      headers = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        headers.push(`Column_${XLSX.utils.encode_col(col)}`);
      }
    } else {
      headers = this._extractHeaders(worksheet, headerRow, range, options);
    }

    let columnIndices = null;
    if (options.columns) {
      columnIndices = options.columns.map(col => headers.indexOf(col)).filter(i => i !== -1);
      headers = columnIndices.map(i => headers[i]);
    }

    return { headers, columnIndices };
  }

  /**
   * Calcule les bornes de lignes de données à partir des options.
   * @private
   */
  _resolveRowRange(range, headerRow, options) {
    let startRow = options.hasHeaders === false ? range.s.r : headerRow + 1;
    let endRow = range.e.r;

    if (options.startRow !== undefined) {
      startRow = options.startRow;
    }
    if (options.endRow !== undefined) {
      endRow = Math.min(options.endRow, range.e.r);
    }

    return { startRow, endRow };
  }

  /**
   * Applique la notation de plage Excel (ex: "A1:C10") : recalcule en-têtes et bornes.
   * @private
   */
  _applyExcelRangeNotation(worksheet, options) {
    const rangeRef = XLSX.utils.decode_range(options.range);
    let startRow = rangeRef.s.r;
    const endRow = rangeRef.e.r;

    const headers = [];
    for (let col = rangeRef.s.c; col <= rangeRef.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: rangeRef.s.r, c: col });
      const cell = worksheet[cellRef];
      headers.push(cell ? this._getCellValue(cell) : `Column_${col}`);
    }
    startRow++; // Passer l'en-tête

    return { headers, startRow, endRow };
  }

  /**
   * Construit les données dérivées optionnelles (formules, types, stats).
   * @private
   */
  _buildDerivedSheetData(worksheet, rows, headers, startRow, endRow, options) {
    let formulas = null;
    let columnsWithFormulas = [];
    if (options.preserveFormulas) {
      const formulaData = this._extractFormulas(worksheet, headers, startRow, endRow);
      formulas = formulaData.formulas;
      columnsWithFormulas = formulaData.columnsWithFormulas;
    }

    let columnTypes = null;
    let typeStats = null;
    if (options.detectTypes !== false) {
      const typeData = this._detectColumnTypes(rows, headers);
      columnTypes = typeData.types;
      typeStats = typeData.stats;
    }

    let stats = null;
    if (options.includeStats) {
      stats = this._computeSheetStats(rows, headers);
    }

    return { formulas, columnsWithFormulas, columnTypes, typeStats, stats };
  }

  /**
   * Détecte automatiquement la ligne d'en-tête
   * @private
   */
  _detectHeaderRow(worksheet, range) {
    for (let row = range.s.r; row <= Math.min(range.e.r, 10); row++) {
      let nonEmptyCount = 0;
      let totalCells = 0;
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellRef];
        totalCells++;
        
        if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
          nonEmptyCount++;
        }
      }
      
      // Si plus de 50% des cellules sont remplies, c'est probablement l'en-tête
      if (nonEmptyCount / totalCells > 0.5) {
        return row;
      }
    }
    
    return 0;
  }

  /**
   * Extrait les en-têtes
   * @private
   */
  _extractHeaders(worksheet, headerRow, range, _options) {
    const headers = [];
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: col });
      const cell = worksheet[cellRef];
      
      let headerValue = cell ? this._getCellValue(cell) : null;
      
      if (headerValue === null || headerValue === '') {
        headerValue = `Column_${XLSX.utils.encode_col(col)}`;
      }
      
      // S'assurer que les en-têtes sont uniques
      let uniqueHeader = headerValue;
      let counter = 1;
      while (headers.includes(uniqueHeader)) {
        uniqueHeader = `${headerValue}_${counter}`;
        counter++;
      }
      
      headers.push(uniqueHeader);
    }
    
    return headers;
  }

  /**
   * Extrait les lignes de données
   * @private
   */
  _extractRows(worksheet, headers, startRow, endRow, range, options, columnIndices) {
    const rows = [];
    const cols = columnIndices || headers.map((_, i) => range.s.c + i);

    for (let rowIdx = startRow; rowIdx <= endRow; rowIdx++) {
      const { row, hasData } = this._extractRowCells(worksheet, headers, rowIdx, cols, options);

      // Ne pas inclure les lignes complètement vides
      if (hasData) {
        rows.push(row);
      }
    }
    
    return rows;
  }

  /**
   * Extrait les cellules d'une ligne donnée et indique si la ligne contient des données.
   * @private
   */
  _extractRowCells(worksheet, headers, rowIdx, cols, options) {
    const row = {};
    let hasData = false;

    for (let i = 0; i < headers.length; i++) {
      const col = cols[i];
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: col });
      const cell = worksheet[cellRef];

      let value = cell ? this._getCellValue(cell) : null;

      // Gérer les cellules fusionnées si demandé
      if (value === null && options.expandMergedCells && worksheet['!merges']) {
        value = this._getMergedCellValue(worksheet, rowIdx, col);
      }

      row[headers[i]] = value;
      if (value !== null && value !== '') {
        hasData = true;
      }
    }

    return { row, hasData };
  }

  /**
   * Obtient la valeur d'une cellule
   * @private
   */
  _getCellValue(cell) {
    if (!cell) return null;
    
    // Date
    if (cell.t === 'd') {
      return cell.v;
    }
    
    // Valeur formatée disponible
    if (cell.w !== undefined) {
      // Pour les dates, retourner la valeur Date native si possible
      if (cell.t === 'n' && cell.z && (cell.z.includes('d') || cell.z.includes('m') || cell.z.includes('y'))) {
        return cell.v;
      }
    }
    
    // Boolean
    if (cell.t === 'b') {
      return cell.v;
    }
    
    // Erreur
    if (cell.t === 'e') {
      return null;
    }
    
    return cell.v;
  }

  /**
   * Obtient la valeur d'une cellule fusionnée
   * @private
   */
  _getMergedCellValue(worksheet, row, col) {
    const merges = worksheet['!merges'] || [];
    
    for (const merge of merges) {
      if (row >= merge.s.r && row <= merge.e.r && col >= merge.s.c && col <= merge.e.c) {
        // Retourner la valeur de la cellule principale
        const mainCellRef = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
        const mainCell = worksheet[mainCellRef];
        return mainCell ? this._getCellValue(mainCell) : null;
      }
    }
    
    return null;
  }

  /**
   * Extrait les cellules fusionnées
   * @private
   */
  _extractMergedCells(worksheet) {
    const merges = worksheet['!merges'] || [];
    
    return merges.map(merge => ({
      startRow: merge.s.r,
      endRow: merge.e.r,
      startCol: merge.s.c,
      endCol: merge.e.c,
      range: XLSX.utils.encode_range(merge)
    }));
  }

  /**
   * Extrait les formules
   * @private
   */
  _extractFormulas(worksheet, headers, startRow, endRow) {
    const formulas = {};
    const columnsWithFormulas = new Set();
    
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < headers.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellRef];
        
        if (cell && cell.f) {
          formulas[cellRef] = cell.f;
          columnsWithFormulas.add(headers[col]);
        }
      }
    }
    
    return {
      formulas,
      columnsWithFormulas: Array.from(columnsWithFormulas)
    };
  }

  /**
   * Détecte les types de colonnes
   * @private
   */
  _detectColumnTypes(rows, headers) {
    if (rows.length === 0) {
      return { types: {}, stats: {} };
    }

    const types = {};
    const stats = {
      numericColumns: [],
      dateColumns: [],
      textColumns: [],
      booleanColumns: []
    };

    for (const header of headers) {
      const values = rows.map(row => row[header]);
      const detection = this.typeDetector.detectType(values);
      
      types[header] = detection.type;
      
      // Classifier
      if (['integer', 'float', 'currency', 'percentage'].includes(detection.type)) {
        stats.numericColumns.push(header);
      } else if (['date', 'datetime'].includes(detection.type)) {
        stats.dateColumns.push(header);
      } else if (detection.type === 'boolean') {
        stats.booleanColumns.push(header);
      } else if (detection.type === 'string' || detection.type === 'mixed') {
        stats.textColumns.push(header);
      }
    }

    return { types, stats };
  }

  /**
   * Calcule les statistiques de base d'une feuille
   * @private
   */
  _computeSheetStats(rows, headers) {
    let nullCount = 0;
    let filledCells = 0;
    const totalCells = rows.length * headers.length;

    for (const row of rows) {
      for (const header of headers) {
        if (row[header] === null || row[header] === undefined) {
          nullCount++;
        } else {
          filledCells++;
        }
      }
    }

    return {
      nullCount,
      filledCells,
      totalCells,
      fillRate: filledCells / totalCells
    };
  }

  /**
   * Extrait les propriétés du workbook
   * @private
   */
  _extractProperties(workbook) {
    if (!workbook.Props) return {};
    
    return {
      title: workbook.Props.Title,
      author: workbook.Props.Author,
      company: workbook.Props.Company,
      created: workbook.Props.CreatedDate,
      modified: workbook.Props.ModifiedDate,
      lastAuthor: workbook.Props.LastAuthor
    };
  }
}

export default ExcelParserService;

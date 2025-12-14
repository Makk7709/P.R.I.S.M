/**
 * DataTypeDetector - Détection automatique des types de données
 * 
 * Module de détection intelligente des types de données pour fichiers Excel.
 * Supporte la détection de: strings, numbers, dates, currencies, percentages,
 * emails, URLs, phones, IDs, et types mixtes.
 * 
 * @module src/excel/DataTypeDetector
 */

/**
 * Types de données supportés
 */
export const DataType = {
  STRING: 'string',
  INTEGER: 'integer',
  FLOAT: 'float',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DATETIME: 'datetime',
  TIME: 'time',
  CURRENCY: 'currency',
  PERCENTAGE: 'percentage',
  EMAIL: 'email',
  URL: 'url',
  PHONE: 'phone',
  POSTAL_CODE: 'postal_code',
  ID: 'id',
  UUID: 'uuid',
  MIXED: 'mixed',
  NULL: 'null',
  UNKNOWN: 'unknown'
};

/**
 * Niveaux de confiance
 */
export const TypeConfidence = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Patterns de détection
 */
const PATTERNS = {
  // Dates
  ISO8601: /^\d{4}-\d{2}-\d{2}$/,
  ISO8601_DATETIME: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/,
  DD_MM_YYYY: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
  MM_DD_YYYY: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
  TIME: /^(\d{1,2}):(\d{2})(:\d{2})?$/,
  FRENCH_DATE: /^\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}$/i,
  
  // Monnaie
  EUR: /^[\d\s]+,\d{2}\s*€$/,
  EUR_ALT: /^€\s*[\d\s]+[,.]?\d*$/,
  USD: /^\$[\d,]+\.?\d*$/,
  GBP: /^£[\d,]+\.?\d*$/,
  CURRENCY_CODE: /^[\d,.\s]+\s*(EUR|USD|GBP|CHF|CAD)$/i,
  
  // Pourcentages
  PERCENTAGE: /^-?[\d,.\s]+\s*%$/,
  
  // Contact
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/[^\s]+$/,
  PHONE_FR: /^(\+33|0)\s*[1-9](\s*\d{2}){4}$/,
  PHONE_INTL: /^\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,9}$/,
  
  // IDs
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ALPHANUMERIC_ID: /^[A-Z]{2,}\d+$/i,
  
  // Codes postaux
  POSTAL_FR: /^\d{5}$/,
  
  // Boolean
  BOOLEAN_TRUE: /^(true|yes|oui|1|vrai)$/i,
  BOOLEAN_FALSE: /^(false|no|non|0|faux)$/i
};

/**
 * DataTypeDetector - Classe principale de détection de types
 */
export class DataTypeDetector {
  /**
   * @param {Object} options - Options de configuration
   * @param {number} options.sampleSize - Nombre d'échantillons pour la détection (défaut: 100)
   * @param {number} options.confidenceThreshold - Seuil de confiance (défaut: 0.8)
   */
  constructor(options = {}) {
    this.options = {
      sampleSize: options.sampleSize || 100,
      confidenceThreshold: options.confidenceThreshold || 0.8,
      checkExcelDates: options.checkExcelDates || false,
      checkDecimalPercentage: options.checkDecimalPercentage || false,
      checkBinaryBoolean: options.checkBinaryBoolean || false,
      locale: options.locale || 'auto',
      ...options
    };
  }

  /**
   * Détecte le type d'un tableau de valeurs
   * @param {Array} values - Tableau de valeurs à analyser
   * @param {Object} options - Options supplémentaires
   * @returns {Object} Résultat de détection avec type, confiance et statistiques
   */
  detectType(values, options = {}) {
    const mergedOptions = { ...this.options, ...options };
    
    if (!Array.isArray(values) || values.length === 0) {
      return {
        type: DataType.NULL,
        confidence: 1,
        stats: { count: 0, emptyCount: 0 }
      };
    }

    // Filtrer les valeurs nulles/undefined
    const validValues = values.filter(v => v !== null && v !== undefined);
    const nullCount = values.length - validValues.length;
    
    if (validValues.length === 0) {
      return {
        type: DataType.NULL,
        confidence: 1,
        stats: { count: values.length, emptyCount: values.length, nullCount }
      };
    }

    // Échantillonnage si nécessaire
    const sampleValues = this._getSample(validValues, mergedOptions.sampleSize);
    
    // Analyser chaque valeur
    const typeAnalysis = this._analyzeValues(sampleValues, mergedOptions);
    
    // Déterminer le type dominant
    const result = this._determineType(typeAnalysis, mergedOptions);
    
    // Ajouter les statistiques
    result.stats = {
      count: values.length,
      validCount: validValues.length,
      nullCount,
      emptyCount: validValues.filter(v => v === '').length,
      sampled: sampleValues.length < validValues.length,
      sampleSize: sampleValues.length
    };

    // Ajouter les valeurs extraites si applicable
    if (result.type === DataType.CURRENCY || result.type === DataType.PERCENTAGE) {
      result.extractedValues = this._extractNumericValues(sampleValues, result.type);
      if (result.type === DataType.PERCENTAGE) {
        result.normalizedValues = result.extractedValues.map(v => v / 100);
      }
    }

    // Suggérer des conversions
    result.suggestedConversion = this._suggestConversion(result, sampleValues);

    return result;
  }

  /**
   * Analyse une colonne complète
   * @param {Object} column - Objet colonne avec name et values
   * @param {Object} options - Options supplémentaires
   * @returns {Object} Analyse complète de la colonne
   */
  analyzeColumn(column, options = {}) {
    const { name, values } = column;
    const mergedOptions = { ...this.options, ...options };
    
    const typeResult = this.detectType(values, mergedOptions);
    
    // Calculs additionnels
    const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined));
    const cardinality = uniqueValues.size;
    const cardinalityRatio = cardinality / values.filter(v => v !== null).length;
    
    // Détection catégorielle
    const isCategorical = cardinalityRatio < 0.1 && cardinality <= 50;
    
    // Détection clé potentielle
    const isUnique = cardinality === values.filter(v => v !== null).length;
    const isPotentialKey = isUnique && typeResult.type !== DataType.STRING;
    
    // Détection constante
    const isConstant = cardinality === 1;
    
    // Statistiques numériques si applicable
    let stats = null;
    if ([DataType.INTEGER, DataType.FLOAT, DataType.CURRENCY, DataType.PERCENTAGE].includes(typeResult.type)) {
      const numericValues = this._extractNumericValues(
        values.filter(v => v !== null && v !== undefined),
        typeResult.type
      );
      stats = this._computeNumericStats(numericValues);
    }

    return {
      columnName: name,
      type: typeResult.type,
      confidence: typeResult.confidence,
      cardinality,
      cardinalityRatio,
      uniqueValues: cardinality,
      isCategorical,
      categories: isCategorical ? Array.from(uniqueValues).sort() : undefined,
      isUnique,
      isPotentialKey,
      isConstant,
      constantValue: isConstant ? Array.from(uniqueValues)[0] : undefined,
      stats,
      nullRatio: typeResult.stats.nullCount / values.length,
      ...typeResult,
      sampled: mergedOptions.sampleSize < values.length,
      sampleSize: Math.min(mergedOptions.sampleSize, values.length)
    };
  }

  /**
   * Analyse plusieurs colonnes
   * @param {Array} columns - Tableau d'objets colonne
   * @param {Object} options - Options supplémentaires
   * @returns {Array|Object} Résultats d'analyse
   */
  analyzeColumns(columns, options = {}) {
    const results = columns.map(col => this.analyzeColumn(col, options));
    
    if (options.detectRelationships) {
      const relationships = this._detectRelationships(columns, results);
      return {
        columns: results,
        relationships,
        potentialForeignKeys: relationships.foreignKeys || []
      };
    }
    
    return results;
  }

  /**
   * Échantillonnage des valeurs
   * @private
   */
  _getSample(values, sampleSize) {
    if (values.length <= sampleSize) {
      return values;
    }
    
    // Échantillonnage stratifié
    const step = Math.floor(values.length / sampleSize);
    const sample = [];
    for (let i = 0; i < values.length && sample.length < sampleSize; i += step) {
      sample.push(values[i]);
    }
    return sample;
  }

  /**
   * Analyse les valeurs et compte les types
   * @private
   */
  _analyzeValues(values, options) {
    const typeCounts = {};
    const typeDetails = {};
    
    for (const value of values) {
      const detected = this._detectSingleValue(value, options);
      typeCounts[detected.type] = (typeCounts[detected.type] || 0) + 1;
      
      if (detected.details) {
        if (!typeDetails[detected.type]) {
          typeDetails[detected.type] = {};
        }
        for (const [key, val] of Object.entries(detected.details)) {
          typeDetails[detected.type][key] = val;
        }
      }
    }
    
    return { typeCounts, typeDetails, total: values.length };
  }

  /**
   * Détecte le type d'une valeur unique
   * @private
   */
  _detectSingleValue(value, options) {
    // Chaîne vide
    if (value === '') {
      return { type: DataType.STRING, details: { empty: true } };
    }

    // Boolean natif
    if (typeof value === 'boolean') {
      return { type: DataType.BOOLEAN };
    }

    // Nombre natif
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        return { type: DataType.UNKNOWN };
      }
      
      // Vérifier si c'est une date Excel
      if (options.checkExcelDates && value > 25569 && value < 60000) {
        return { type: DataType.DATE, details: { dateFormat: 'EXCEL_SERIAL' } };
      }
      
      // Vérifier si c'est un pourcentage décimal
      if (options.checkDecimalPercentage && value >= 0 && value <= 1) {
        return { type: DataType.PERCENTAGE, details: { percentageFormat: 'decimal' } };
      }
      
      // Vérifier si c'est un boolean binaire
      if (options.checkBinaryBoolean && (value === 0 || value === 1)) {
        return { type: DataType.BOOLEAN, details: { booleanFormat: 'binary' } };
      }
      
      return { type: Number.isInteger(value) ? DataType.INTEGER : DataType.FLOAT };
    }

    // Date native
    if (value instanceof Date) {
      return { type: DataType.DATE };
    }

    // Chaîne de caractères - analyse avancée
    if (typeof value === 'string') {
      return this._detectStringType(value, options);
    }

    return { type: DataType.UNKNOWN };
  }

  /**
   * Détecte le type d'une chaîne
   * @private
   */
  _detectStringType(str, options) {
    const trimmed = str.trim();
    
    // Boolean string
    if (PATTERNS.BOOLEAN_TRUE.test(trimmed)) {
      const format = trimmed.toLowerCase() === 'oui' ? 'oui_non' : 
                     trimmed.toLowerCase() === 'yes' ? 'yes_no' : 'true_false';
      return { type: DataType.BOOLEAN, details: { booleanFormat: format } };
    }
    if (PATTERNS.BOOLEAN_FALSE.test(trimmed)) {
      const format = trimmed.toLowerCase() === 'non' ? 'oui_non' : 
                     trimmed.toLowerCase() === 'no' ? 'yes_no' : 'true_false';
      return { type: DataType.BOOLEAN, details: { booleanFormat: format } };
    }

    // UUID
    if (PATTERNS.UUID.test(trimmed)) {
      return { type: DataType.UUID };
    }

    // Email
    if (PATTERNS.EMAIL.test(trimmed)) {
      return { type: DataType.EMAIL };
    }

    // URL
    if (PATTERNS.URL.test(trimmed)) {
      return { type: DataType.URL };
    }

    // Téléphone
    if (PATTERNS.PHONE_FR.test(trimmed)) {
      return { type: DataType.PHONE, details: { phoneFormat: 'FR' } };
    }
    if (PATTERNS.PHONE_INTL.test(trimmed)) {
      return { type: DataType.PHONE, details: { phoneFormat: 'INTERNATIONAL' } };
    }

    // Code postal français
    if (PATTERNS.POSTAL_FR.test(trimmed)) {
      return { type: DataType.POSTAL_CODE, details: { postalFormat: 'FR' } };
    }

    // Dates
    if (PATTERNS.ISO8601_DATETIME.test(trimmed)) {
      return { type: DataType.DATETIME, details: { dateFormat: 'ISO8601', hasTimeComponent: true } };
    }
    if (PATTERNS.ISO8601.test(trimmed)) {
      return { type: DataType.DATE, details: { dateFormat: 'ISO8601' } };
    }
    if (PATTERNS.FRENCH_DATE.test(trimmed)) {
      return { type: DataType.DATE, details: { dateFormat: 'DD_MONTH_YYYY_FR' } };
    }
    if (PATTERNS.DD_MM_YYYY.test(trimmed)) {
      const match = trimmed.match(PATTERNS.DD_MM_YYYY);
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      if (day <= 12 && month <= 12) {
        // Ambigu - pourrait être DD/MM ou MM/DD
        return { type: DataType.DATE, details: { dateFormat: 'DD/MM/YYYY', ambiguous: true } };
      }
      if (day > 12) {
        return { type: DataType.DATE, details: { dateFormat: 'DD/MM/YYYY' } };
      }
      if (month > 12) {
        return { type: DataType.DATE, details: { dateFormat: 'MM/DD/YYYY' } };
      }
    }
    if (PATTERNS.TIME.test(trimmed)) {
      return { type: DataType.TIME };
    }

    // Monnaie
    if (PATTERNS.EUR.test(trimmed) || PATTERNS.EUR_ALT.test(trimmed)) {
      return { type: DataType.CURRENCY, details: { currencySymbol: '€', currencyCode: 'EUR' } };
    }
    if (PATTERNS.USD.test(trimmed)) {
      return { type: DataType.CURRENCY, details: { currencySymbol: '$', currencyCode: 'USD' } };
    }
    if (PATTERNS.GBP.test(trimmed)) {
      return { type: DataType.CURRENCY, details: { currencySymbol: '£', currencyCode: 'GBP' } };
    }
    if (PATTERNS.CURRENCY_CODE.test(trimmed)) {
      const code = trimmed.match(/EUR|USD|GBP|CHF|CAD/i)?.[0]?.toUpperCase();
      return { type: DataType.CURRENCY, details: { currencyCode: code } };
    }

    // Pourcentage
    if (PATTERNS.PERCENTAGE.test(trimmed)) {
      return { type: DataType.PERCENTAGE };
    }

    // Nombre
    const numericParsed = this._parseNumericString(trimmed, options);
    if (numericParsed.isNumeric) {
      return { 
        type: numericParsed.isInteger ? DataType.INTEGER : DataType.FLOAT,
        details: { 
          parsedAs: 'string_to_number',
          numberFormat: numericParsed.format,
          hasScientificNotation: numericParsed.scientific,
          hasNegatives: numericParsed.value < 0
        }
      };
    }

    // ID alphanumérique
    if (PATTERNS.ALPHANUMERIC_ID.test(trimmed)) {
      return { type: DataType.ID, details: { idType: 'alphanumeric' } };
    }

    // Par défaut: string
    return { type: DataType.STRING };
  }

  /**
   * Parse une chaîne numérique
   * @private
   */
  _parseNumericString(str, options) {
    // Notation scientifique
    if (/^-?[\d.]+[eE][+-]?\d+$/.test(str)) {
      const val = parseFloat(str);
      return { 
        isNumeric: !isNaN(val), 
        value: val, 
        isInteger: false, 
        scientific: true 
      };
    }

    // Format français (espace comme séparateur milliers, virgule décimale)
    const frenchMatch = str.match(/^-?([\d\s]+),(\d+)$/);
    if (frenchMatch) {
      const val = parseFloat(str.replace(/\s/g, '').replace(',', '.'));
      return { 
        isNumeric: !isNaN(val), 
        value: val, 
        isInteger: false, 
        format: 'FR' 
      };
    }

    // Format allemand (point séparateur milliers, virgule décimale)
    const germanMatch = str.match(/^-?([\d.]+),(\d+)$/);
    if (germanMatch) {
      const val = parseFloat(str.replace(/\./g, '').replace(',', '.'));
      return { 
        isNumeric: !isNaN(val), 
        value: val, 
        isInteger: false, 
        format: 'DE' 
      };
    }

    // Format standard (virgule séparateur milliers, point décimal)
    const standardMatch = str.match(/^-?([\d,]+)\.?(\d*)$/);
    if (standardMatch) {
      const val = parseFloat(str.replace(/,/g, ''));
      const isInteger = !str.includes('.') || str.endsWith('.00');
      return { 
        isNumeric: !isNaN(val), 
        value: val, 
        isInteger,
        format: 'US' 
      };
    }

    // Nombre simple
    const simpleVal = parseFloat(str);
    if (!isNaN(simpleVal) && str.trim() === simpleVal.toString()) {
      return { 
        isNumeric: true, 
        value: simpleVal, 
        isInteger: Number.isInteger(simpleVal) 
      };
    }

    return { isNumeric: false };
  }

  /**
   * Détermine le type final basé sur l'analyse
   * @private
   */
  _determineType(analysis, options) {
    const { typeCounts, typeDetails, total } = analysis;
    
    // Trouver le type dominant
    let maxCount = 0;
    let dominantType = DataType.STRING;
    
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }
    
    const confidence = maxCount / total;
    const details = typeDetails[dominantType] || {};
    
    // Vérifier si c'est un type mixte
    const typeCount = Object.keys(typeCounts).length;
    if (typeCount > 1 && confidence < options.confidenceThreshold) {
      return {
        type: DataType.MIXED,
        confidence,
        dominantType,
        dominantConfidence: confidence,
        mixedTypes: Object.keys(typeCounts),
        typeDistribution: typeCounts,
        ...details
      };
    }
    
    // Vérifier si c'est un ID séquentiel
    if (dominantType === DataType.INTEGER && this._isSequentialId(analysis)) {
      return {
        type: DataType.ID,
        confidence,
        idType: 'sequential',
        ...details
      };
    }
    
    return {
      type: dominantType,
      confidence,
      typeDistribution: typeCounts,
      ...details
    };
  }

  /**
   * Vérifie si les entiers sont des IDs séquentiels
   * @private
   */
  _isSequentialId(analysis) {
    // Simplifié: vérifie juste si le type dominant est INTEGER avec haute confiance
    return analysis.typeCounts[DataType.INTEGER] === analysis.total;
  }

  /**
   * Extrait les valeurs numériques
   * @private
   */
  _extractNumericValues(values, type) {
    return values.map(v => {
      if (typeof v === 'number') return v;
      if (typeof v !== 'string') return null;
      
      let cleaned = v;
      
      // Nettoyer selon le type
      if (type === DataType.CURRENCY) {
        cleaned = v.replace(/[€$£\s]/g, '').replace(',', '.');
      } else if (type === DataType.PERCENTAGE) {
        cleaned = v.replace(/%\s*/g, '').replace(',', '.');
      } else {
        cleaned = v.replace(/\s/g, '').replace(',', '.');
      }
      
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }).filter(v => v !== null);
  }

  /**
   * Calcule les statistiques numériques de base
   * @private
   */
  _computeNumericStats(values) {
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      sum,
      count: values.length
    };
  }

  /**
   * Suggère une conversion de type
   * @private
   */
  _suggestConversion(result, values) {
    if (result.type === DataType.STRING) {
      // Vérifier si conversion en nombre possible
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;
      if (numericCount / values.length > 0.9) {
        const hasDecimals = values.some(v => String(v).includes('.'));
        return {
          targetType: hasDecimals ? DataType.FLOAT : DataType.INTEGER,
          safe: true,
          conversionRate: numericCount / values.length
        };
      }
    }
    
    if (result.dateFormat) {
      return {
        targetType: DataType.DATE,
        parser: result.dateFormat,
        safe: true
      };
    }
    
    return null;
  }

  /**
   * Détecte les relations entre colonnes
   * @private
   */
  _detectRelationships(columns, results) {
    const foreignKeys = [];
    
    for (let i = 0; i < results.length; i++) {
      const col = results[i];
      // Une colonne avec faible cardinalité et valeurs répétées pourrait être une FK
      if (!col.isUnique && col.cardinality > 1 && col.cardinalityRatio < 0.5) {
        foreignKeys.push(col.columnName);
      }
    }
    
    return { foreignKeys };
  }
}

export default DataTypeDetector;

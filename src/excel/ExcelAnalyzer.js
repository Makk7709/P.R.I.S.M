/**
 * ExcelAnalyzer - Orchestrateur d'analyse Excel avec intégration IA
 *
 * Module principal qui combine parsing, détection de types et analyse statistique
 * avec intégration au TaskTypeProcessor pour génération d'insights IA.
 *
 * @module src/excel/ExcelAnalyzer
 */

import { ExcelParserService } from './ExcelParserService.js';
import { StatisticalEngine } from './StatisticalEngine.js';
import { DataTypeDetector } from './DataTypeDetector.js';
import { getTrustContext, CriticalityLevel } from '../core/TrustContext.js';

// Import dynamique pour éviter les dépendances circulaires
let HybridOrchestrator = null;
let TaskTypeProcessor = null;

/**
 * ExcelAnalyzer - Classe principale d'orchestration
 *
 * Utilise le Consensus pour les cas ambigus:
 * - Détection de format de date (DD/MM vs MM/DD)
 * - Classification de types de données mixtes
 * - Interprétation de données ambiguës
 */
export class ExcelAnalyzer {
  /**
   * @param {Object} options - Options de configuration
   */
  constructor(options = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024,
      enableAI: options.enableAI !== false,
      detailedStats: options.detailedStats || false,
      useConsensusForAmbiguous: options.useConsensusForAmbiguous !== false, // ✅ NOUVEAU
      consensusThreshold: options.consensusThreshold || 0.7, // Seuil d'ambiguïté
      ...options,
    };

    this.parser = new ExcelParserService({
      maxFileSize: this.options.maxFileSize,
    });
    this.statsEngine = new StatisticalEngine();
    this.typeDetector = new DataTypeDetector();
    this.trustContext = getTrustContext();

    // Seuil pour validation TrustContext (10MB)
    this.trustContextFileSizeThreshold = 10 * 1024 * 1024;

    // Mots-clés sensibles déclenchant validation
    this.sensitiveKeywords = [
      'confidential',
      'secret',
      'private',
      'internal',
      'classified',
      'restricted',
      'proprietary',
      'personal',
    ];

    // Orchestrateurs chargés paresseusement (S7059: pas d'opération asynchrone
    // dans le constructeur — l'initialisation est déclenchée par
    // ensureInitialized(), elle-même appelée par analyze()/analyzeWithAI()).
    this.hybridOrchestrator = null;
    this.taskProcessor = null;
    this._initPromise = null;
    this._initialized = false;
  }

  /**
   * Attend que l'initialisation soit terminée (déclenche le chargement
   * paresseux des orchestrateurs au premier appel).
   * @returns {Promise<void>}
   */
  async ensureInitialized() {
    if (this._initialized) return;
    if (!this._initPromise) {
      this._initPromise = this._loadOrchestrators();
    }
    await this._initPromise;
  }

  /**
   * Charge les orchestrateurs dynamiquement
   * @private
   */
  async _loadOrchestrators() {
    try {
      if (!HybridOrchestrator) {
        const module = await import('../orchestrator/HybridOrchestrator.js');
        HybridOrchestrator = module.HybridOrchestrator;
      }
      this.hybridOrchestrator = new HybridOrchestrator();
      console.log('[ExcelAnalyzer] HybridOrchestrator loaded - Consensus available');
    } catch (err) {
      console.warn('[ExcelAnalyzer] HybridOrchestrator not available:', err.message);
    }

    try {
      if (!TaskTypeProcessor) {
        const module = await import('../core/TaskTypeProcessor.js');
        TaskTypeProcessor = module.TaskTypeProcessor;
      }
      this.taskProcessor = new TaskTypeProcessor();
      console.log('[ExcelAnalyzer] TaskTypeProcessor loaded - AI insights available');
    } catch (err) {
      console.warn('[ExcelAnalyzer] TaskTypeProcessor not available:', err.message);
    }

    this._initialized = true;
  }

  /**
   * Analyse complète d'un fichier Excel
   * @param {Buffer} buffer - Buffer du fichier
   * @param {Object|string} optionsOrUserQuery - Options d'analyse ou query utilisateur
   * @param {Object} options - Options d'analyse (si deuxième paramètre)
   * @returns {Promise<Object>} Résultats de l'analyse
   */
  async analyze(buffer, optionsOrUserQuery = {}, options = {}) {
    // S7059: les orchestrateurs sont chargés paresseusement; on garantit qu'ils
    // sont prêts avant la résolution d'ambiguïtés par Consensus (comportement
    // équivalent à l'ancien chargement « eager » lancé dans le constructeur).
    await this.ensureInitialized();

    const { userQuery, mergedOptions } = this._resolveAnalyzeArgs(optionsOrUserQuery, options);

    const warnings = [];
    const startTime = Date.now();
    const fileSize = buffer ? buffer.length : 0;

    try {
      // ✨ ÉTAPE 0: Validation TrustContext pour fichiers volumineux ou requêtes sensibles
      const needsTrustContextValidation = this._needsTrustContextValidation(fileSize, userQuery);
      if (needsTrustContextValidation) {
        await this._runTrustContextGate(fileSize, userQuery, mergedOptions);
      }

      // 1. Parser le fichier
      const parsedData = await this.parser.parseWorkbook(buffer, {
        sheets: mergedOptions.sheets,
        sheetIndices: mergedOptions.sheetIndices,
        detectTypes: true,
        includeStats: true,
      });

      if (!parsedData.success) {
        throw new Error('Parsing failed');
      }

      // ✨ Détecter colonnes sensibles après parsing
      await this._validateSensitiveColumns(
        parsedData,
        needsTrustContextValidation,
        fileSize,
        userQuery
      );

      // 2. Analyser chaque feuille
      const { analyzedSheets, allNumericData } = await this._analyzeAllSheets(
        parsedData,
        mergedOptions
      );

      // 3-12. Dériver les analyses optionnelles (corrélations, résumé, qualité…)
      const derived = this._buildDerivedResults(
        analyzedSheets,
        parsedData,
        mergedOptions,
        allNumericData
      );

      const analysisTime = Date.now() - startTime;

      return {
        success: true,
        sheets: analyzedSheets,
        parsedData,
        metadata: {
          ...parsedData.metadata,
          analysisTimeMs: analysisTime,
        },
        ...derived,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'ANALYSIS_ERROR',
          message: error.message,
          details: error.details || error.stack,
        },
      };
    }
  }

  /**
   * Normalise les arguments surchargés analyze(buffer, userQuery) /
   * analyze(buffer, options).
   * @private
   */
  _resolveAnalyzeArgs(optionsOrUserQuery, options) {
    if (typeof optionsOrUserQuery === 'string') {
      return {
        userQuery: optionsOrUserQuery,
        mergedOptions: { ...this.options, ...options },
      };
    }
    const mergedOptions = { ...this.options, ...optionsOrUserQuery, ...options };
    return { userQuery: mergedOptions.userQuery || '', mergedOptions };
  }

  /**
   * Indique si la validation TrustContext est requise (taille ou mot-clé sensible).
   * @private
   */
  _needsTrustContextValidation(fileSize, userQuery) {
    return (
      fileSize >= this.trustContextFileSizeThreshold ||
      this.sensitiveKeywords.some((keyword) => userQuery.toLowerCase().includes(keyword))
    );
  }

  /**
   * Demande l'approbation TrustContext (fichier volumineux / requête sensible).
   * Rejette par sécurité en cas d'erreur.
   * @private
   */
  async _runTrustContextGate(fileSize, userQuery, mergedOptions) {
    try {
      const approval = await this.trustContext.requestApproval({
        action: 'excel_analysis',
        fileSize: fileSize,
        fileName: mergedOptions.filename || 'unknown.xlsx',
        userQuery: userQuery,
        criticality:
          fileSize >= 20 * 1024 * 1024 ? CriticalityLevel.HIGH : CriticalityLevel.MEDIUM,
      });

      if (!approval.approved) {
        throw new Error(
          `Excel analysis rejected by TrustContext: ${approval.reason || 'File size or content requires approval'}`
        );
      }
    } catch (error) {
      console.error('[ExcelAnalyzer] TrustContext validation failed:', error.message);
      throw new Error(`Security validation failed: ${error.message}`);
    }
  }

  /**
   * Validation TrustContext additionnelle si des colonnes sensibles sont
   * détectées (et qu'aucune validation n'a déjà eu lieu).
   * @private
   */
  async _validateSensitiveColumns(parsedData, needsTrustContextValidation, fileSize, userQuery) {
    if (!(parsedData.sheets && parsedData.sheets.length > 0)) return;

    const sensitiveColumns = this._detectSensitiveColumns(parsedData.sheets[0]);
    if (!(sensitiveColumns.length > 0 && !needsTrustContextValidation)) return;

    try {
      const approval = await this.trustContext.validateCriticalDecision({
        action: 'excel_analysis_sensitive_columns',
        fileSize: fileSize,
        sensitiveColumns: sensitiveColumns,
        userQuery: userQuery,
        criticality: CriticalityLevel.MEDIUM,
      });

      if (!approval.approved) {
        throw new Error(
          `Analysis rejected: file contains sensitive columns (${sensitiveColumns.join(', ')})`
        );
      }
    } catch (error) {
      console.error(
        '[ExcelAnalyzer] TrustContext validation for sensitive columns failed:',
        error.message
      );
      throw error;
    }
  }

  /**
   * Analyse chaque feuille du workbook, résout les ambiguïtés via Consensus si
   * activé, et collecte les données numériques pour les corrélations globales.
   * @private
   */
  async _analyzeAllSheets(parsedData, mergedOptions) {
    const analyzedSheets = [];
    const allNumericData = {};

    for (const sheet of parsedData.sheets) {
      const analyzedSheet = await this._analyzeSheet(sheet, mergedOptions);

      if (this.options.useConsensusForAmbiguous && analyzedSheet.ambiguousColumns?.length > 0) {
        const resolutions = await this._resolveAmbiguitiesWithConsensus(
          sheet,
          analyzedSheet.ambiguousColumns,
          mergedOptions
        );
        analyzedSheet.ambiguousResolutions = resolutions;
        this._applyAmbiguityResolutions(analyzedSheet, resolutions);
      }

      analyzedSheets.push(analyzedSheet);

      for (const col of analyzedSheet.typeStats?.numericColumns || []) {
        const key = `${sheet.name}.${col}`;
        allNumericData[key] = sheet.rows.map((r) => r[col]).filter((v) => !isNaN(v) && v !== null);
      }
    }

    return { analyzedSheets, allNumericData };
  }

  /**
   * Construit les analyses dérivées optionnelles (étapes 3-12) à partir des
   * feuilles analysées et des options.
   * @private
   */
  _buildDerivedResults(analyzedSheets, parsedData, mergedOptions, allNumericData) {
    // 3. Corrélations entre colonnes numériques
    let correlations = null;
    if (mergedOptions.computeCorrelations && Object.keys(allNumericData).length >= 2) {
      correlations = this.statsEngine.correlationMatrix(allNumericData).matrix;
    }

    // 4. Corrélations fortes
    const strongCorrelations = correlations ? this._findStrongCorrelations(correlations) : [];

    // 5. Analyse temporelle
    const timeSeries =
      mergedOptions.timeSeriesAnalysis && mergedOptions.dateColumn
        ? this._analyzeTimeSeries(analyzedSheets, mergedOptions)
        : null;

    // 6. GroupBy
    const groupedAnalysis = mergedOptions.groupBy
      ? this._performGroupBy(parsedData.sheets, mergedOptions)
      : null;

    // 7. Pivot table
    const pivotTable = mergedOptions.pivotTable
      ? this._createPivotTable(parsedData.sheets[0], mergedOptions.pivotTable)
      : null;

    // 8. Résumé et profils de colonnes
    const summary = mergedOptions.generateSummary
      ? this._generateSummary(analyzedSheets, parsedData.metadata)
      : null;
    const columnProfiles = mergedOptions.profileColumns
      ? this._generateColumnProfiles(analyzedSheets)
      : null;

    // 9. Qualité des données
    const dataQuality = mergedOptions.checkDataQuality
      ? this._checkDataQuality(analyzedSheets)
      : null;

    // 10. Agrégations personnalisées
    const customResults = mergedOptions.customAggregations
      ? this._computeCustomAggregations(parsedData.sheets[0], mergedOptions.customAggregations)
      : null;

    // 11. Relations entre feuilles
    const relationships =
      mergedOptions.detectRelationships && parsedData.sheets.length > 1
        ? this._detectSheetRelationships(parsedData.sheets)
        : null;

    // 12. Fusion de feuilles
    const mergedData = mergedOptions.mergeSheets
      ? this._mergeSheets(parsedData.sheets, mergedOptions.mergeSheets)
      : null;

    return {
      correlations,
      strongCorrelations,
      timeSeries,
      groupedAnalysis,
      pivotTable,
      summary,
      columnProfiles,
      dataQuality,
      customResults,
      relationships,
      mergedData,
    };
  }

  /**
   * Analyse avec génération d'insights IA
   */
  async analyzeWithAI(buffer, userQuery = 'Analyze this data') {
    // ✨ S'assurer que les orchestrateurs sont initialisés AVANT l'analyse
    await this.ensureInitialized();

    console.log('[ExcelAnalyzer] analyzeWithAI called with query:', userQuery);
    console.log('[ExcelAnalyzer] TaskProcessor available:', !!this.taskProcessor);

    // Analyse de base
    const analysis = await this.analyze(buffer, {
      generateSummary: true,
      computeCorrelations: true,
      detectOutliers: true,
      checkDataQuality: true,
    });

    if (!analysis.success) {
      return {
        ...analysis,
        aiInsights: null,
        aiError: 'Analysis failed before AI processing',
      };
    }

    // Préparer le prompt pour l'IA
    const aiPrompt = this._formatForAI(analysis, userQuery);

    let aiInsights = null;
    let aiError = null;
    let recommendations = [];

    if (this.options.enableAI) {
      try {
        aiInsights = await this._getAIInsights(aiPrompt, userQuery);
        recommendations = this._extractRecommendations(aiInsights);
      } catch (error) {
        aiError = error.message;
      }
    }

    return {
      ...analysis,
      aiPrompt,
      aiInsights,
      aiError,
      recommendations,
    };
  }

  /**
   * Analyse avec une requête spécifique
   */
  async analyzeWithQuery(buffer, query) {
    const analysis = await this.analyze(buffer, {
      generateSummary: true,
      computeCorrelations: true,
    });

    if (!analysis.success) {
      return analysis;
    }

    // Interpréter la requête
    const queryResult = this._interpretQuery(query, analysis);

    return {
      ...analysis,
      query,
      queryResult,
    };
  }

  /**
   * Analyse une feuille individuelle
   * @private
   */
  async _analyzeSheet(sheet, options) {
    const result = {
      name: sheet.name,
      headers: sheet.headers,
      rowCount: sheet.rows.length,
      columnCount: sheet.headers.length,
      isEmpty: sheet.isEmpty,
      hasTimeData: false,
      dateColumns: [],
      columnTypes: sheet.columnTypes || {},
      typeStats: sheet.typeStats || { numericColumns: [], dateColumns: [], textColumns: [] },
      statistics: {},
      categoricalAnalysis: {},
      distributions: {},
      outliers: {},
      ambiguousColumns: [], // ✅ NOUVEAU: Colonnes avec types ambigus
    };

    if (sheet.isEmpty) {
      return result;
    }

    this._detectAmbiguousColumns(sheet, result);
    this._computeNumericStatistics(sheet, options, result);
    this._computeCategoricalAnalysis(sheet, result);
    this._detectDateColumns(sheet, result);

    // Stocker les données brutes pour le profiling (référence interne)
    result.rows = sheet.rows;
    result._rawData = sheet.rows;

    return result;
  }

  /**
   * Détecte les colonnes au type ambigu (_analyzeSheet).
   * @private
   */
  _detectAmbiguousColumns(sheet, result) {
    for (const header of sheet.headers) {
      const values = sheet.rows.map((r) => r[header]).filter((v) => v !== null && v !== undefined);
      if (values.length === 0) continue;

      const detection = this.typeDetector.detectType(values);
      if (this._isAmbiguousType(detection)) {
        result.ambiguousColumns.push({
          column: header,
          detectedType: detection.type,
          confidence: detection.confidence,
          ambiguityType: this._classifyAmbiguity(detection),
          sampleValues: values.slice(0, 5),
          possibleTypes: detection.mixedTypes || [detection.type],
          details: detection,
        });
      }
    }
  }

  /**
   * Calcule statistiques descriptives / outliers / distributions des colonnes
   * numériques (_analyzeSheet).
   * @private
   */
  _computeNumericStatistics(sheet, options, result) {
    for (const col of sheet.typeStats?.numericColumns || []) {
      const values = sheet.rows.map((r) => r[col]).filter((v) => !isNaN(v) && v !== null);
      if (values.length === 0) continue;

      result.statistics[col] = this.statsEngine.descriptiveStats(values);

      if (options.detectOutliers) {
        result.outliers[col] = this.statsEngine.detectOutliers(values);
      }

      if (options.analyzeDistributions) {
        result.distributions[col] = {
          histogram: this.statsEngine.histogram(values),
          normalityTest: this.statsEngine.normalityTest(values),
        };
      }
    }
  }

  /**
   * Construit l'analyse catégorielle enrichie des colonnes texte (_analyzeSheet).
   * @private
   */
  _computeCategoricalAnalysis(sheet, result) {
    for (const col of sheet.typeStats?.textColumns || []) {
      const values = sheet.rows.map((r) => r[col]).filter((v) => v !== null && v !== undefined);
      if (values.length === 0) continue;

      const freqTable = this.statsEngine.frequencyTable(values, { sortBy: 'count' });

      const frequencies = {};
      let mode = null;
      let maxCount = 0;

      for (const [value, data] of Object.entries(freqTable)) {
        const count = data.count || data;
        frequencies[value] = count;
        if (count > maxCount) {
          maxCount = count;
          mode = value;
        }
      }

      const topValues = Object.entries(frequencies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }));

      result.categoricalAnalysis[col] = {
        frequencies,
        uniqueCount: Object.keys(frequencies).length,
        mode,
        modeCount: maxCount,
        topValues,
        total: values.length,
        entropy: this.statsEngine.entropy ? this.statsEngine.entropy(values) : null,
      };
    }
  }

  /**
   * Marque les colonnes de date et active hasTimeData (_analyzeSheet).
   * @private
   */
  _detectDateColumns(sheet, result) {
    for (const col of sheet.typeStats?.dateColumns || []) {
      result.hasTimeData = true;
      result.dateColumns.push(col);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÉSOLUTION D'AMBIGUÏTÉS VIA CONSENSUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Vérifie si un type détecté est ambigu
   * @private
   */
  _isAmbiguousType(detection) {
    // Type mixte
    if (detection.type === 'mixed') return true;

    // Confiance faible
    if (detection.confidence < this.options.consensusThreshold) return true;

    // Date avec format ambigu (DD/MM vs MM/DD)
    if (detection.type === 'date' && detection.ambiguous) return true;

    // Type avec plusieurs interprétations possibles
    if (detection.mixedTypes && detection.mixedTypes.length > 1) return true;

    return false;
  }

  /**
   * Classifie le type d'ambiguïté
   * @private
   */
  _classifyAmbiguity(detection) {
    if (detection.ambiguous && detection.dateFormat) {
      return 'DATE_FORMAT'; // DD/MM vs MM/DD
    }
    if (detection.type === 'mixed') {
      return 'MIXED_TYPES'; // Plusieurs types mélangés
    }
    if (detection.confidence < 0.5) {
      return 'LOW_CONFIDENCE'; // Confiance très faible
    }
    return 'UNCERTAIN'; // Autre type d'incertitude
  }

  /**
   * Résout les ambiguïtés via le Consensus multi-IA
   * @private
   */
  async _resolveAmbiguitiesWithConsensus(sheet, ambiguousColumns, _options) {
    const resolutions = [];

    if (!this.hybridOrchestrator) {
      console.log('[ExcelAnalyzer] Consensus not available, using heuristics');
      return this._resolveAmbiguitiesWithHeuristics(sheet, ambiguousColumns);
    }

    for (const ambiguity of ambiguousColumns) {
      console.log(
        `[ExcelAnalyzer] Resolving ambiguity for column "${ambiguity.column}" via Consensus`
      );

      // Construire le prompt pour le consensus
      const prompt = this._buildAmbiguityResolutionPrompt(ambiguity, sheet);

      try {
        // Utiliser le HybridOrchestrator avec forceConsensus
        const consensusResult = await this.hybridOrchestrator.process(prompt, 'analyse', {
          forceConsensus: true,
          context: {
            dataAnalysis: true,
            ambiguityResolution: true,
            columnName: ambiguity.column,
          },
        });

        // Extraire la décision du consensus
        const resolution = this._parseConsensusResolution(consensusResult, ambiguity);
        resolutions.push(resolution);

        console.log(
          `[ExcelAnalyzer] Consensus resolution for "${ambiguity.column}":`,
          resolution.resolvedType
        );
      } catch (error) {
        console.warn(`[ExcelAnalyzer] Consensus failed for "${ambiguity.column}":`, error.message);
        // Fallback sur heuristiques
        const heuristicResolution = this._resolveWithHeuristic(ambiguity, sheet);
        resolutions.push(heuristicResolution);
      }
    }

    return resolutions;
  }

  /**
   * Construit le prompt pour la résolution d'ambiguïté
   * @private
   */
  _buildAmbiguityResolutionPrompt(ambiguity, _sheet) {
    const sampleData = ambiguity.sampleValues.map((v) => `"${v}"`).join(', ');

    return `
ANALYSE D'AMBIGUÏTÉ DE DONNÉES - DÉCISION CRITIQUE

Colonne: "${ambiguity.column}"
Type détecté: ${ambiguity.detectedType}
Confiance: ${(ambiguity.confidence * 100).toFixed(1)}%
Type d'ambiguïté: ${ambiguity.ambiguityType}

Échantillon de données:
${sampleData}

Types possibles: ${ambiguity.possibleTypes.join(', ')}

${
  ambiguity.ambiguityType === 'DATE_FORMAT'
    ? `
ATTENTION: Format de date ambigu!
- Format DD/MM/YYYY (européen): jour/mois/année
- Format MM/DD/YYYY (américain): mois/jour/année

Analysez les valeurs pour déterminer le format correct.
Si le premier nombre > 12, c'est probablement le jour (format européen).
`
    : ''
}

${
  ambiguity.ambiguityType === 'MIXED_TYPES'
    ? `
ATTENTION: Types de données mélangés!
Déterminez le type principal et si les valeurs non-conformes sont:
- Des erreurs de saisie
- Des valeurs spéciales (N/A, null, etc.)
- Un vrai mélange intentionnel
`
    : ''
}

Répondez avec la décision finale au format:
TYPE_RÉSOLU: [type]
CONFIANCE: [0-100]%
RAISON: [explication courte]
ACTION_RECOMMANDÉE: [conversion/filtrage/aucune]
`;
  }

  /**
   * Parse la réponse du consensus
   * @private
   */
  _parseConsensusResolution(result, ambiguity) {
    const content = result.content || '';

    // Extraire le type résolu
    const typeMatch = content.match(/TYPE_RÉSOLU:\s*(\w+)/i);
    const confidenceMatch = content.match(/CONFIANCE:\s*(\d+)/);
    const reasonMatch = content.match(/RAISON:\s*(.+?)(?=\n|$)/i);
    const actionMatch = content.match(/ACTION_RECOMMANDÉE:\s*(.+?)(?=\n|$)/i);

    return {
      column: ambiguity.column,
      originalType: ambiguity.detectedType,
      resolvedType: typeMatch ? typeMatch[1].toLowerCase() : ambiguity.detectedType,
      confidence: confidenceMatch
        ? Number.parseInt(confidenceMatch[1]) / 100
        : ambiguity.confidence,
      reason: reasonMatch ? reasonMatch[1].trim() : 'Consensus decision',
      action: actionMatch ? actionMatch[1].trim().toLowerCase() : 'none',
      method: 'consensus',
      consensusUsed: result.metadata?.consensusUsed || true,
    };
  }

  /**
   * Résout les ambiguïtés avec des heuristiques simples (fallback)
   * @private
   */
  _resolveAmbiguitiesWithHeuristics(sheet, ambiguousColumns) {
    return ambiguousColumns.map((ambiguity) => this._resolveWithHeuristic(ambiguity, sheet));
  }

  /**
   * Résolution heuristique pour une colonne
   * @private
   */
  _resolveWithHeuristic(ambiguity, _sheet) {
    let resolvedType = ambiguity.detectedType;
    let confidence = ambiguity.confidence;
    let reason = 'Heuristic resolution';

    // Heuristique pour les dates
    if (ambiguity.ambiguityType === 'DATE_FORMAT') {
      // Vérifier si des valeurs ont le premier nombre > 12 (donc c'est le jour)
      const values = ambiguity.sampleValues;
      const hasHighFirstNumber = values.some((v) => {
        const match = String(v).match(/^(\d{1,2})[/-]/);
        return match && Number.parseInt(match[1]) > 12;
      });

      if (hasHighFirstNumber) {
        resolvedType = 'date';
        reason = 'Format DD/MM détecté (premier nombre > 12)';
        confidence = 0.85;
      } else {
        // Par défaut, assumer le format local
        resolvedType = 'date';
        reason = 'Format de date assumé selon locale par défaut';
        confidence = 0.6;
      }
    }

    // Heuristique pour les types mixtes
    if (ambiguity.ambiguityType === 'MIXED_TYPES') {
      // Utiliser le type dominant
      resolvedType = ambiguity.details?.dominantType || ambiguity.detectedType;
      reason = `Type dominant utilisé: ${resolvedType}`;
      confidence = ambiguity.details?.dominantConfidence || 0.7;
    }

    return {
      column: ambiguity.column,
      originalType: ambiguity.detectedType,
      resolvedType,
      confidence,
      reason,
      action: 'none',
      method: 'heuristic',
      consensusUsed: false,
    };
  }

  /**
   * Applique les résolutions d'ambiguïtés au sheet analysé
   * @private
   */
  _applyAmbiguityResolutions(analyzedSheet, resolutions) {
    for (const resolution of resolutions) {
      // Mettre à jour le type de la colonne
      if (analyzedSheet.columnTypes[resolution.column]) {
        analyzedSheet.columnTypes[resolution.column] = resolution.resolvedType;
      }

      // Mettre à jour les stats de type
      if (resolution.resolvedType === 'date' || resolution.resolvedType === 'datetime') {
        if (!analyzedSheet.typeStats.dateColumns.includes(resolution.column)) {
          analyzedSheet.typeStats.dateColumns.push(resolution.column);
          analyzedSheet.hasTimeData = true;
        }
      }
    }
  }

  /**
   * Trouve les corrélations fortes
   * @private
   */
  _findStrongCorrelations(correlations, threshold = 0.7) {
    const strong = [];
    const seen = new Set();

    for (const col1 of Object.keys(correlations)) {
      for (const col2 of Object.keys(correlations[col1])) {
        this._collectStrongCorrelation(correlations, col1, col2, threshold, seen, strong);
      }
    }

    return strong.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /** Collecte une paire de corrélation forte (dedup, seuil). Iso-comportement :
   * logique extraite de `_findStrongCorrelations`. @private */
  _collectStrongCorrelation(correlations, col1, col2, threshold, seen, strong) {
    if (col1 === col2) return;

    const key = [col1, col2].sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);

    const corr = correlations[col1][col2];
    if (Math.abs(corr) >= threshold) {
      strong.push({
        column1: col1,
        column2: col2,
        correlation: corr,
        strength: Math.abs(corr) >= 0.9 ? 'very_strong' : 'strong',
        direction: corr > 0 ? 'positive' : 'negative',
      });
    }
  }

  /**
   * Analyse les séries temporelles
   * @private
   */
  _analyzeTimeSeries(sheets, options) {
    const result = {};
    const sheet = sheets[0]; // Utiliser la première feuille

    if (!sheet || !sheet.typeStats?.numericColumns) {
      return null;
    }

    for (const col of sheet.typeStats.numericColumns) {
      // Récupérer les données depuis parsedData
      // (simplifié - en production, accéder aux vraies données)
      const stats = sheet.statistics[col];
      if (!stats) continue;

      result[col] = {
        trend: this.statsEngine.detectTrend([stats.min, stats.mean, stats.max]),
        growthRate: stats.mean > 0 ? (stats.max - stats.min) / stats.mean : null,
      };

      if (options.movingAverageWindow) {
        // Nécessite accès aux données brutes
        result[col].movingAverage = [];
      }

      if (options.forecastPeriods) {
        result[col].forecast = {
          predictions: [],
          method: 'linear_extrapolation',
        };
      }
    }

    return result;
  }

  /**
   * Effectue un GroupBy
   * @private
   */
  _performGroupBy(sheets, options) {
    const sheet = sheets[0];
    if (!sheet || !sheet.rows) return null;

    const groupCol = options.groupBy;
    const aggregations = options.aggregations || ['sum', 'mean', 'count'];
    const result = {};

    // Grouper les données
    const groups = {};
    for (const row of sheet.rows) {
      const key = row[groupCol];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    }

    // Calculer les agrégations pour chaque groupe
    for (const [groupKey, rows] of Object.entries(groups)) {
      result[groupKey] = { count: rows.length };

      // Pour chaque colonne numérique
      for (const col of sheet.typeStats?.numericColumns || []) {
        if (col === groupCol) continue;

        const _values = rows.map((r) => r[col]).filter((v) => !isNaN(v));
        result[groupKey][col] = {};

        for (const agg of aggregations) {
          result[groupKey][col][agg] =
            this.statsEngine.groupBy(
              rows.map((r) => ({ [col]: r[col] })),
              col,
              col,
              agg
            )[undefined] || null;
        }
      }
    }

    return result;
  }

  /**
   * Crée un tableau croisé dynamique
   * @private
   */
  _createPivotTable(sheet, config) {
    if (!sheet || !sheet.rows) return null;

    return this.statsEngine.pivotTable(
      sheet.rows,
      config.rowField,
      config.columnField,
      config.valueField,
      config.aggregation || 'sum'
    );
  }

  /**
   * Génère un résumé
   * @private
   */
  _generateSummary(sheets, metadata) {
    const totalNumericCols = sheets.reduce(
      (sum, s) => sum + (s.typeStats?.numericColumns?.length || 0),
      0
    );
    const totalCategoricalCols = sheets.reduce(
      (sum, s) => sum + (s.typeStats?.textColumns?.length || 0),
      0
    );

    // Générer les différentes sections du résumé
    const keyInsights = this._generateKeyInsights(sheets);
    const patterns = this._identifyPatterns(sheets);
    const topPerformers = this._identifyTopPerformers(sheets);
    const recommendations = this._generateRecommendations(sheets, keyInsights, patterns);
    const highlights = this._generateHighlights(sheets);

    return {
      totalRows: metadata.totalRows,
      totalColumns: metadata.totalColumns,
      totalSheets: sheets.length,
      numericColumnCount: totalNumericCols,
      categoricalColumnCount: totalCategoricalCols,
      hasTimeData: sheets.some((s) => s.hasTimeData),
      keyInsights,
      patterns,
      topPerformers,
      recommendations,
      highlights,
      observations: patterns, // Alias pour compatibilité
    };
  }

  /**
   * Génère les insights clés
   * @private
   */
  _generateKeyInsights(sheets) {
    const insights = [];

    for (const sheet of sheets) {
      insights.push(...this._statisticsInsights(sheet));
      insights.push(...this._outlierInsights(sheet));
      insights.push(...this._categoricalDominanceInsights(sheet));
    }

    return insights.slice(0, 15);
  }

  /**
   * Insights dérivés des statistiques numériques d'une feuille.
   * @private
   */
  _statisticsInsights(sheet) {
    const insights = [];
    for (const [col, stats] of Object.entries(sheet.statistics || {})) {
      this._collectColumnStatInsights(col, stats, insights);
    }
    return insights;
  }

  /** Insights statistiques pour une colonne (asymétrie, variabilité, moyenne vs
   * médiane). Iso-comportement : logique extraite de `_statisticsInsights`. @private */
  _collectColumnStatInsights(col, stats, insights) {
    if (stats.skewness && Math.abs(stats.skewness) > 1) {
      insights.push(
        `La colonne "${col}" montre une asymétrie ${stats.skewness > 0 ? 'à droite (queue longue vers les hautes valeurs)' : 'à gauche (queue longue vers les basses valeurs)'}`
      );
    }
    if (stats.coefficientOfVariation && stats.coefficientOfVariation > 100) {
      insights.push(
        `La colonne "${col}" présente une forte variabilité (CV: ${stats.coefficientOfVariation.toFixed(1)}%)`
      );
    }
    if (stats.mean && stats.median) {
      const ratio = stats.mean / stats.median;
      if (ratio > 1.5) {
        insights.push(
          `La colonne "${col}" a une moyenne significativement supérieure à la médiane, suggérant des valeurs extrêmes hautes`
        );
      }
    }
  }

  /**
   * Insights dérivés des valeurs aberrantes d'une feuille.
   * @private
   */
  _outlierInsights(sheet) {
    const insights = [];
    if (sheet.outliers) {
      for (const [col, outlierData] of Object.entries(sheet.outliers)) {
        if (outlierData && outlierData.outliers?.length > 0) {
          insights.push(
            `${outlierData.outliers.length} valeur(s) aberrante(s) détectée(s) dans "${col}"`
          );
        }
      }
    }
    return insights;
  }

  /**
   * Insights de dominance catégorielle d'une feuille.
   * @private
   */
  _categoricalDominanceInsights(sheet) {
    const insights = [];
    for (const [col, catData] of Object.entries(sheet.categoricalAnalysis || {})) {
      const freq = catData.frequencies || {};
      const values = Object.values(freq);
      const total = values.reduce((a, b) => a + b, 0);
      const max = Math.max(...values);

      if (total > 0 && max / total > 0.6) {
        const dominant = Object.entries(freq).find(([_, v]) => v === max)?.[0];
        insights.push(
          `La catégorie "${dominant}" domine dans "${col}" (${((max / total) * 100).toFixed(0)}%)`
        );
      }
    }
    return insights;
  }

  /**
   * Identifie les patterns dans les données
   * @private
   */
  _identifyPatterns(sheets) {
    const patterns = [];

    for (const sheet of sheets) {
      patterns.push(...this._sheetPatterns(sheet));
    }

    return patterns.slice(0, 10);
  }

  /**
   * Identifie les patterns d'une feuille (numériques, temporels, catégoriels, concentration).
   * @private
   */
  _sheetPatterns(sheet) {
    const patterns = [];

    // Pattern: colonnes corrélées
    const numericCols = sheet.typeStats?.numericColumns || [];
    if (numericCols.length >= 2) {
      patterns.push(
        `${numericCols.length} colonnes numériques identifiées pour analyse statistique`
      );
    }

    // Pattern: données temporelles
    if (sheet.hasTimeData) {
      patterns.push('Données temporelles détectées - analyse de tendances possible');
    }

    // Pattern: répartition catégorielle
    const catCols = Object.keys(sheet.categoricalAnalysis || {});
    if (catCols.length > 0) {
      patterns.push(`${catCols.length} dimension(s) catégorielle(s) pour segmentation`);
    }

    // Pattern: concentration des données
    for (const [col, stats] of Object.entries(sheet.statistics || {})) {
      if (stats.standardDeviation && stats.mean && stats.mean !== 0) {
        const cv = (stats.standardDeviation / Math.abs(stats.mean)) * 100;
        if (cv < 20) {
          patterns.push(`Données très concentrées autour de la moyenne pour "${col}"`);
        }
      }
    }

    return patterns;
  }

  /**
   * Identifie les top performers
   * @private
   */
  _identifyTopPerformers(sheets) {
    const topPerformers = [];

    for (const sheet of sheets) {
      this._collectNumericTopPerformers(sheet, topPerformers);
      this._collectCategoricalTopPerformers(sheet, topPerformers);
    }

    return topPerformers.slice(0, 10);
  }

  /** Top performers numériques (max ≫ moyenne). Iso : extrait de
   * `_identifyTopPerformers`. @private */
  _collectNumericTopPerformers(sheet, topPerformers) {
    for (const [col, stats] of Object.entries(sheet.statistics || {})) {
      if (stats.max !== undefined && stats.mean !== undefined && stats.max > stats.mean * 2) {
        topPerformers.push(
          `Valeur maximale exceptionnelle dans "${col}": ${this._formatNumber(stats.max)} (2x la moyenne)`
        );
      }
    }
  }

  /** Top performers catégoriels (valeur la plus fréquente). Iso : extrait de
   * `_identifyTopPerformers`. @private */
  _collectCategoricalTopPerformers(sheet, topPerformers) {
    for (const [col, catData] of Object.entries(sheet.categoricalAnalysis || {})) {
      const topVals = catData.topValues || [];
      if (topVals.length > 0 && topVals[0]?.count > 0) {
        topPerformers.push(`Top "${col}": ${topVals[0].value} (${topVals[0].count} occurrences)`);
      }
    }
  }

  /**
   * Génère des recommandations actionnables
   * @private
   */
  _generateRecommendations(sheets, insights, _patterns) {
    const recommendations = [];

    // Recommandation basée sur les outliers
    const hasOutliers = sheets.some((s) =>
      Object.values(s.outliers || {}).some((o) => o && o.outliers?.length > 0)
    );
    if (hasOutliers) {
      recommendations.push(
        'Vous devriez investiguer les valeurs aberrantes détectées pour vérifier leur validité'
      );
    }

    // Recommandation basée sur les données temporelles
    const hasTimeData = sheets.some((s) => s.hasTimeData);
    if (hasTimeData) {
      recommendations.push(
        'Vous pourriez analyser les tendances temporelles pour identifier des patterns saisonniers'
      );
    }

    // Recommandation basée sur la variabilité
    const hasHighVariability = insights.some(
      (i) => i.includes('variabilité') || i.includes('variability')
    );
    if (hasHighVariability) {
      recommendations.push(
        'La forte variabilité suggère de segmenter les données par catégorie pour une analyse plus fine'
      );
    }

    // Recommandation générale
    const numericCount = sheets.reduce(
      (sum, s) => sum + (s.typeStats?.numericColumns?.length || 0),
      0
    );
    if (numericCount >= 3) {
      recommendations.push(
        'Avec plusieurs colonnes numériques, une analyse de corrélation pourrait révéler des relations intéressantes'
      );
    }

    return recommendations;
  }

  /**
   * Génère les highlights
   * @private
   */
  _generateHighlights(sheets) {
    const highlights = [];

    for (const sheet of sheets) {
      // Highlight: statistiques remarquables
      for (const [col, stats] of Object.entries(sheet.statistics || {})) {
        if (stats.sum !== undefined && stats.sum > 0) {
          highlights.push({
            type: 'sum',
            column: col,
            value: stats.sum,
            label: `Total ${col}: ${this._formatNumber(stats.sum)}`,
          });
        }
      }

      // Highlight: catégories principales
      for (const [col, catData] of Object.entries(sheet.categoricalAnalysis || {})) {
        const uniqueCount = catData.uniqueCount || Object.keys(catData.frequencies || {}).length;
        highlights.push({
          type: 'categorical',
          column: col,
          uniqueCount,
          label: `${col}: ${uniqueCount} valeurs uniques`,
        });
      }
    }

    return highlights.slice(0, 10);
  }

  /**
   * Génère les profils de colonnes
   * @private
   */
  _generateColumnProfiles(sheets) {
    const profiles = {};

    for (const sheet of sheets) {
      // Accéder aux données brutes pour calculer les profils
      const rows = sheet.rows || (sheet._rawData ? sheet._rawData : []);

      for (const header of sheet.headers) {
        profiles[header] = this._buildColumnProfile(sheet, header, rows);
      }
    }

    return profiles;
  }

  /**
   * Construit le profil statistique d'une colonne (nulls, unicité, top valeurs).
   * @private
   */
  _buildColumnProfile(sheet, header, rows) {
    // Collecter les valeurs de la colonne
    const values = rows.map((r) => r[header]);
    const nonNullValues = values.filter((v) => v !== null && v !== undefined && v !== '');

    // Calculer les valeurs uniques
    const uniqueSet = new Set(nonNullValues.map((v) => String(v)));

    // Trouver les top valeurs pour les catégorielles
    const valueCounts = {};
    for (const v of nonNullValues) {
      const key = String(v);
      valueCounts[key] = (valueCounts[key] || 0) + 1;
    }
    const topValues = Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));

    return {
      type: sheet.columnTypes[header] || 'unknown',
      statistics: sheet.statistics?.[header] || null,
      nullCount: values.length - nonNullValues.length,
      uniqueCount: uniqueSet.size,
      totalCount: values.length,
      nullPercentage:
        values.length > 0 ? ((values.length - nonNullValues.length) / values.length) * 100 : 0,
      sampleValues: nonNullValues.slice(0, 5),
      topValues,
      frequency: sheet.categoricalAnalysis?.[header]?.frequencies || valueCounts,
    };
  }

  /**
   * Vérifie la qualité des données de manière exhaustive
   * @private
   */
  _checkDataQuality(sheets) {
    const acc = {
      totalCells: 0,
      nullCells: 0,
      filledCells: 0,
      issues: [],
      missingValues: {},
      duplicateCount: 0,
      seenRows: new Set(),
    };

    for (const sheet of sheets) {
      const rows = sheet.rows || (sheet._rawData ? sheet._rawData : []);
      acc.totalCells += sheet.rowCount * sheet.columnCount;

      this._accumulateColumnNullStats(sheet, rows, acc);
      this._accumulateDuplicateRows(rows, acc);
      acc.issues.push(...this._collectOutlierIssues(sheet));
    }

    // Calculer le score de complétude en pourcentage
    const completeness = acc.totalCells > 0 ? (acc.filledCells / acc.totalCells) * 100 : 100;

    return {
      totalCells: acc.totalCells,
      filledCells: acc.filledCells,
      nullCells: acc.nullCells,
      completeness,
      completenessScore: completeness / 100,
      missingValues: acc.missingValues,
      duplicates: {
        count: acc.duplicateCount,
        percentage:
          acc.seenRows.size > 0
            ? (acc.duplicateCount / (acc.seenRows.size + acc.duplicateCount)) * 100
            : 0,
      },
      issues: acc.issues,
      qualityScore: this._calculateQualityScore(completeness, acc.duplicateCount, acc.issues.length),
    };
  }

  /**
   * Accumule les statistiques de valeurs nulles/remplies par colonne.
   * @private
   */
  _accumulateColumnNullStats(sheet, rows, acc) {
    for (const header of sheet.headers) {
      let nullsInCol = 0;

      for (const row of rows) {
        const value = row[header];
        if (value === null || value === undefined || value === '') {
          nullsInCol++;
          acc.nullCells++;
        } else {
          acc.filledCells++;
        }
      }

      acc.missingValues[header] = nullsInCol;
    }
  }

  /**
   * Détecte et compte les lignes dupliquées (mise à jour de l'accumulateur).
   * @private
   */
  _accumulateDuplicateRows(rows, acc) {
    for (const row of rows) {
      // Créer une clé unique pour la ligne
      const rowKey = JSON.stringify(row);
      if (acc.seenRows.has(rowKey)) {
        acc.duplicateCount++;
      } else {
        acc.seenRows.add(rowKey);
      }
    }
  }

  /**
   * Collecte les problèmes liés aux valeurs aberrantes d'une feuille.
   * @private
   */
  _collectOutlierIssues(sheet) {
    const issues = [];
    for (const [col, outlierData] of Object.entries(sheet.outliers || {})) {
      if (outlierData && outlierData.outliers?.length > 0) {
        issues.push({
          type: 'outliers',
          column: col,
          count: outlierData.outliers.length,
          severity: outlierData.outliers.length > 5 ? 'high' : 'low',
        });
      }
    }
    return issues;
  }

  /**
   * Calcule un score de qualité global
   * @private
   */
  _calculateQualityScore(completeness, duplicates, issueCount) {
    let score = completeness;

    // Pénalité pour doublons (max -10 points)
    score -= Math.min(duplicates * 2, 10);

    // Pénalité pour issues (max -10 points)
    score -= Math.min(issueCount * 2, 10);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calcule les agrégations personnalisées
   * @private
   */
  _computeCustomAggregations(sheet, aggregations) {
    if (!sheet || !sheet.rows) return null;

    const results = {};

    for (const [name, config] of Object.entries(aggregations)) {
      const values = sheet.rows.map((r) => r[config.column]).filter((v) => !isNaN(v) && v !== null);

      switch (config.operation) {
        case 'sum':
          results[name] = values.reduce((a, b) => a + b, 0);
          break;
        case 'mean':
          results[name] =
            values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
          break;
        case 'count':
          results[name] = values.length;
          break;
        case 'min':
          results[name] = values.length > 0 ? Math.min(...values) : null;
          break;
        case 'max':
          results[name] = values.length > 0 ? Math.max(...values) : null;
          break;
      }
    }

    return results;
  }

  /**
   * Détecte les relations entre feuilles
   * @private
   */
  /**
   * Détecte les colonnes contenant des données sensibles
   * @private
   * @param {Object} sheet - Sheet analysé
   * @returns {string[]} Liste des noms de colonnes sensibles
   */
  _detectSensitiveColumns(sheet) {
    if (!sheet || !sheet.headers || sheet.headers.length === 0) {
      return [];
    }

    const sensitivePatterns = [
      { pattern: /email|e-mail|mail|@/i, type: 'email' },
      { pattern: /phone|tel|mobile|gsm|portable/i, type: 'phone' },
      { pattern: /ssn|social|security|numero.*secu|nss/i, type: 'ssn' },
      { pattern: /passport|passeport|id.*card|carte.*identite/i, type: 'passport' },
      { pattern: /credit.*card|carte.*credit|card.*number|numero.*carte/i, type: 'credit_card' },
      { pattern: /iban|account.*number|numero.*compte/i, type: 'iban' },
      { pattern: /password|mot.*passe|pwd/i, type: 'password' },
      { pattern: /address|adresse|street|rue/i, type: 'address' },
    ];

    const sensitiveColumns = [];

    for (const header of sheet.headers) {
      const headerLower = String(header).toLowerCase();

      for (const { pattern, _type } of sensitivePatterns) {
        if (pattern.test(headerLower)) {
          sensitiveColumns.push(header);
          break;
        }
      }
    }

    return [...new Set(sensitiveColumns)]; // Dédupliquer
  }

  _detectSheetRelationships(sheets) {
    const commonColumns = [];
    const allHeaders = new Map();

    for (const sheet of sheets) {
      for (const header of sheet.headers) {
        if (!allHeaders.has(header)) {
          allHeaders.set(header, []);
        }
        allHeaders.get(header).push(sheet.name);
      }
    }

    for (const [header, sheetNames] of allHeaders) {
      if (sheetNames.length > 1) {
        commonColumns.push(header);
      }
    }

    return { commonColumns };
  }

  /**
   * Fusionne les feuilles
   * @private
   */
  _mergeSheets(sheets, config) {
    if (sheets.length < 2) return null;

    const onColumn = config.on;
    const how = config.how || 'inner';

    // Simplifié: fusionner les deux premières feuilles
    const sheet1 = sheets[0];
    const sheet2 = sheets[1];

    const allColumns = [...new Set([...sheet1.headers, ...sheet2.headers])];

    return {
      columns: allColumns,
      mergeColumn: onColumn,
      mergeType: how,
    };
  }

  /**
   * Formate les données pour l'IA - INCLUT TOUTES LES DONNÉES BRUTES
   * @private
   */
  _formatForAI(analysis, userQuery) {
    const _summary = analysis.summary || {};
    const sheet = analysis.sheets?.[0] || {};
    const rows = sheet.rows || sheet._rawData || [];
    const headers = sheet.headers || [];

    // ✨ CRITIQUE: Construire un prompt avec TOUTES les données brutes
    let prompt = `## DONNÉES DU FICHIER EXCEL (à utiliser pour répondre)

### Informations générales
- Nombre de lignes: ${rows.length}
- Colonnes: ${headers.join(', ')}

`;

    // ✨ INCLURE TOUTES LES DONNÉES BRUTES (jusqu'à 100 lignes)
    prompt += this._formatRawDataTable(headers, rows);

    // ✨ AJOUTER DES AGRÉGATIONS PAR COLONNE pour aider l'IA
    prompt += this._formatColumnAggregations(headers, rows);

    prompt += `
## Question de l'utilisateur
"${userQuery}"

## INSTRUCTIONS ABSOLUES
1. Utilise UNIQUEMENT les données ci-dessus
2. NE JAMAIS inventer de noms de clients, produits ou chiffres
3. Cite les valeurs EXACTES trouvées dans les données
4. Si une donnée n'existe pas, dis clairement "Cette information n'est pas dans le fichier"
5. Pour identifier le "meilleur" client ou produit, additionne les valeurs numériques par catégorie
`;

    console.log('[ExcelAnalyzer] Prompt length:', prompt.length);
    console.log('[ExcelAnalyzer] Data rows included:', Math.min(rows.length, 100));

    return prompt;
  }

  /**
   * Construit la section "données brutes" du prompt IA (max 100 lignes).
   * @private
   */
  _formatRawDataTable(headers, rows) {
    if (rows.length === 0 || headers.length === 0) {
      return '';
    }

    let out = `### DONNÉES COMPLÈTES DU FICHIER\n\n`;

    // Header
    out += `| ${headers.join(' | ')} |\n`;
    out += `| ${headers.map(() => '---').join(' | ')} |\n`;

    // Toutes les lignes (max 100 pour éviter prompt trop long)
    const maxRows = Math.min(rows.length, 100);
    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];
      const values = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        return String(val).substring(0, 50);
      });
      out += `| ${values.join(' | ')} |\n`;
    }

    if (rows.length > 100) {
      out += `\n... et ${rows.length - 100} lignes supplémentaires\n`;
    }

    return out;
  }

  /**
   * Construit la section "agrégations par colonne" du prompt IA.
   * @private
   */
  _formatColumnAggregations(headers, rows) {
    let out = `\n### AGRÉGATIONS PAR COLONNE\n`;

    for (const header of headers) {
      const values = rows
        .map((r) => r[header])
        .filter((v) => v !== null && v !== undefined && v !== '');

      // Vérifier si c'est numérique
      const numericValues = values.map((v) => Number.parseFloat(v)).filter((v) => !isNaN(v));

      if (numericValues.length > values.length * 0.5) {
        out += this._formatNumericColumnAggregation(header, numericValues);
      } else if (values.length > 0) {
        out += this._formatCategoricalColumnAggregation(header, headers, rows, values);
      }
    }

    return out;
  }

  /**
   * Agrégation d'une colonne numérique (somme, moyenne, min/max).
   * @private
   */
  _formatNumericColumnAggregation(header, numericValues) {
    const sum = numericValues.reduce((a, b) => a + b, 0);
    const avg = sum / numericValues.length;
    const max = Math.max(...numericValues);
    const min = Math.min(...numericValues);
    let out = `\n**${header}** (numérique):\n`;
    out += `  - Somme totale: ${sum.toFixed(2)}\n`;
    out += `  - Moyenne: ${avg.toFixed(2)}\n`;
    out += `  - Max: ${max}, Min: ${min}\n`;
    return out;
  }

  /**
   * Agrégation d'une colonne catégorielle (top valeurs + sommes associées).
   * @private
   */
  _formatCategoricalColumnAggregation(header, headers, rows, values) {
    const counts = {};
    for (const v of values) {
      const key = String(v);
      counts[key] = (counts[key] || 0) + 1;
    }

    // Calculer sommes par catégorie si il y a des colonnes numériques
    const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    let out = `\n**${header}** (catégoriel - ${Object.keys(counts).length} valeurs uniques):\n`;
    for (const [val, count] of sortedCounts.slice(0, 15)) {
      out += `  - "${val}": ${count} fois${this._relatedNumericSums(rows, header, val, headers)}\n`;
    }
    return out;
  }

  /**
   * Calcule les sommes des autres colonnes numériques pour une valeur catégorielle donnée.
   * @private
   */
  _relatedNumericSums(rows, header, val, headers) {
    let sumInfo = '';
    for (const otherHeader of headers) {
      if (otherHeader !== header) {
        const relatedValues = rows
          .filter((r) => String(r[header]) === val)
          .map((r) => Number.parseFloat(r[otherHeader]))
          .filter((v) => !isNaN(v));

        if (relatedValues.length > 0) {
          const total = relatedValues.reduce((a, b) => a + b, 0);
          sumInfo += ` | ${otherHeader}: ${total.toFixed(2)}`;
        }
      }
    }
    return sumInfo;
  }

  /**
   * Obtient les insights IA
   * @private
   */
  async _getAIInsights(prompt, userQuery) {
    console.log('[ExcelAnalyzer] _getAIInsights called');
    console.log('[ExcelAnalyzer] User query:', userQuery);

    // ✨ NOUVEAU: Utiliser directement OpenAI GPT pour l'analyse de données
    // Perplexity n'est pas adapté pour les données structurées
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      try {
        console.log('[ExcelAnalyzer] Using OpenAI GPT for data analysis...');

        const cleanedPrompt = this._cleanPromptForAI(prompt, userQuery);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Plus rapide et moins cher pour l'analyse
            messages: [
              {
                role: 'system',
                content:
                  'Tu es un analyste de données expert. Réponds en français de manière concise et précise. Utilise les données fournies pour répondre directement à la question.',
              },
              {
                role: 'user',
                content: cleanedPrompt,
              },
            ],
            max_tokens: 500,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        console.log(
          '[ExcelAnalyzer] ✅ OpenAI response received:',
          `${content.substring(0, 100)}...`
        );

        return {
          content,
          metadata: { model: 'gpt-4o-mini', provider: 'openai' },
        };
      } catch (error) {
        console.error('[ExcelAnalyzer] OpenAI error:', error.message);
        // Continuer avec fallback
      }
    }

    // Fallback si pas d'OpenAI
    console.warn('[ExcelAnalyzer] No AI provider available - using fallback');

    return {
      content: `Analyse basée sur les données:

${this._generateBasicInsights(prompt, userQuery)}

Pour une analyse IA plus approfondie, configurez OPENAI_API_KEY.`,
      metadata: { model: 'fallback', reason: 'No AI provider configured' },
    };
  }

  /**
   * Génère des insights basiques sans IA
   * @private
   */
  _generateBasicInsights(prompt, _userQuery) {
    // Extraire les informations clés du prompt
    const insights = [];

    // Chercher les top performers dans le prompt
    const topMatch = prompt.match(/Top\s+"([^"]+)":\s+([^(]+)\((\d+)/gi);
    if (topMatch) {
      topMatch.forEach((match) => {
        insights.push(`• ${match.replace(/Top\s+"/, '**').replace('":', '** meilleur:')}`);
      });
    }

    // Chercher les statistiques de lignes/colonnes
    const rowMatch = prompt.match(/Lignes totales:\s*(\d+)/i);
    const colMatch = prompt.match(/Colonnes:\s*(\d+)/i);
    if (rowMatch || colMatch) {
      insights.push(`• Données: ${rowMatch?.[1] || '?'} lignes, ${colMatch?.[1] || '?'} colonnes`);
    }

    return insights.length > 0
      ? insights.join('\n')
      : 'Consultez les statistiques détaillées ci-dessus.';
  }

  /**
   * Nettoie le prompt - NE SUPPRIME RIEN, juste tronque si trop long
   * @private
   */
  _cleanPromptForAI(prompt, userQuery) {
    // ✨ IMPORTANT: Garder le maximum de données pour l'IA
    const maxLength = 12000; // Assez grand pour les fichiers complexes

    // Si le prompt est dans la limite, le garder tel quel
    if (prompt.length <= maxLength) {
      console.log('[ExcelAnalyzer] Prompt kept as-is, length:', prompt.length);
      return prompt;
    }

    // Si trop long, tronquer mais garder la question
    console.log('[ExcelAnalyzer] Prompt truncated from', prompt.length, 'to', maxLength);

    let truncated = prompt.substring(0, maxLength - 500);

    // S'assurer que la question est incluse à la fin
    truncated += `

## Question de l'utilisateur
"${userQuery}"

IMPORTANT: Réponds en utilisant UNIQUEMENT les données ci-dessus. Ne jamais inventer.`;

    return truncated;
  }

  /**
   * Extrait les recommandations
   * @private
   */
  _extractRecommendations(aiInsights) {
    if (!aiInsights || !aiInsights.content) {
      return [];
    }

    // Extraire les lignes qui ressemblent à des recommandations
    const lines = aiInsights.content.split('\n');
    const recommendations = lines.filter(
      (line) =>
        line.includes('recommand') ||
        line.includes('suggest') ||
        line.includes('should') ||
        line.match(/^\d+\.\s/)
    );

    return recommendations.slice(0, 5);
  }

  /**
   * Interprète une requête utilisateur
   * @private
   */
  _interpretQuery(query, analysis) {
    const lowerQuery = query.toLowerCase();
    const sheet = analysis.sheets?.[0];

    if (!sheet) return null;

    // Détecter le type de requête
    if (
      lowerQuery.includes('average') ||
      lowerQuery.includes('mean') ||
      lowerQuery.includes('moyenne')
    ) {
      // Calculer les moyennes par groupe si possible
      const result = {};
      for (const [col, stats] of Object.entries(sheet.statistics || {})) {
        result[col] = stats.mean;
      }
      return result;
    }

    if (lowerQuery.includes('by') && analysis.groupedAnalysis) {
      return analysis.groupedAnalysis;
    }

    return { message: 'Query interpreted but no specific result generated' };
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  /**
   * Exporte les résultats en JSON
   */
  exportToJSON(analysis) {
    return JSON.stringify(analysis, null, 2);
  }

  /**
   * Exporte pour affichage dans le chat
   */
  exportForChat(analysis, _options = {}) {
    const summary = analysis.summary || {};
    const sheet = analysis.sheets?.[0];
    const dataQuality = analysis.dataQuality || {};

    const text = [
      `# 📊 Analyse Détaillée du Fichier\n\n`,
      this._chatOverviewSection(analysis, summary, dataQuality),
      this._chatColumnStructureSection(sheet),
      this._chatNumericStatsSection(sheet),
      this._chatCategoricalSection(sheet),
      this._chatCorrelationsSection(analysis),
      this._chatOutliersSection(sheet),
      this._chatDataQualitySection(dataQuality),
      this._chatInsightsSection(summary),
    ].join('');

    return {
      text,
      highlights: summary.keyInsights || [],
      recommendations: summary.recommendations || [],
      patterns: summary.patterns || [],
    };
  }

  /**
   * SECTION 1: Vue d'ensemble (exportForChat).
   * @private
   */
  _chatOverviewSection(analysis, summary, dataQuality) {
    let text = `## 📋 Vue d'ensemble\n\n`;
    text += `| Métrique | Valeur |\n|---|---|\n`;
    text += `| **Lignes** | ${summary.totalRows || analysis.metadata?.totalRows || 0} |\n`;
    text += `| **Colonnes** | ${summary.totalColumns || analysis.metadata?.totalColumns || 0} |\n`;
    text += `| **Feuilles** | ${summary.totalSheets || 1} |\n`;

    if (dataQuality.completeness !== undefined) {
      text += `| **Complétude** | ${dataQuality.completeness.toFixed(1)}% |\n`;
    }
    if (dataQuality.duplicates?.count > 0) {
      text += `| **Doublons** | ${dataQuality.duplicates.count} |\n`;
    }
    text += `\n`;
    return text;
  }

  /**
   * SECTION 2: Structure des colonnes (exportForChat).
   * @private
   */
  _chatColumnStructureSection(sheet) {
    if (!(sheet?.headers && sheet?.columnTypes)) return '';

    let text = `## 📑 Structure des Colonnes\n\n`;
    text += `| Colonne | Type | Description |\n|---|---|---|\n`;

    for (const header of sheet.headers) {
      const type = sheet.columnTypes[header] || 'unknown';
      const typeEmoji = this._getTypeEmoji(type);
      const description = this._getColumnDescription(header, type, sheet);
      text += `| **${header}** | ${typeEmoji} ${type} | ${description} |\n`;
    }
    text += `\n`;
    return text;
  }

  /**
   * SECTION 3: Statistiques numériques détaillées (exportForChat).
   * @private
   */
  _chatNumericStatsSection(sheet) {
    if (!(sheet?.statistics && Object.keys(sheet.statistics).length > 0)) return '';

    let text = `## 📈 Statistiques Numériques\n\n`;

    for (const [col, stats] of Object.entries(sheet.statistics)) {
      text += `### ${col}\n`;
      text += `| Mesure | Valeur |\n|---|---|\n`;
      text += `| Nombre de valeurs | ${stats.count || 0} |\n`;
      text += `| Moyenne | ${this._formatNumber(stats.mean)} |\n`;
      text += `| Médiane | ${this._formatNumber(stats.median)} |\n`;
      text += `| Écart-type | ${this._formatNumber(stats.standardDeviation)} |\n`;
      text += `| Minimum | ${this._formatNumber(stats.min)} |\n`;
      text += `| Maximum | ${this._formatNumber(stats.max)} |\n`;

      if (stats.quartiles?.Q1 !== undefined && stats.quartiles?.Q3 !== undefined) {
        text += `| Q1 (25%) | ${this._formatNumber(stats.quartiles.Q1)} |\n`;
        text += `| Q3 (75%) | ${this._formatNumber(stats.quartiles.Q3)} |\n`;
        text += `| IQR | ${this._formatNumber(stats.interquartileRange)} |\n`;
      }

      if (stats.sum !== undefined) {
        text += `| Somme totale | ${this._formatNumber(stats.sum)} |\n`;
      }
      text += `\n`;
    }
    return text;
  }

  /**
   * SECTION 4: Analyse catégorielle (exportForChat).
   * @private
   */
  _chatCategoricalSection(sheet) {
    if (!(sheet?.categoricalAnalysis && Object.keys(sheet.categoricalAnalysis).length > 0)) {
      return '';
    }

    let text = `## 🏷️ Analyse Catégorielle\n\n`;

    for (const [col, catData] of Object.entries(sheet.categoricalAnalysis)) {
      text += `### ${col}\n`;
      text += `- **Valeurs uniques**: ${catData.uniqueCount || Object.keys(catData.frequencies || {}).length}\n`;
      text += `- **Valeur dominante**: ${catData.mode || 'N/A'}\n\n`;

      const frequencies = catData.frequencies || {};
      const sortedFreq = Object.entries(frequencies)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 5);

      if (sortedFreq.length > 0) {
        text += `| Valeur | Fréquence | % |\n|---|---|---|\n`;
        const total = Object.values(frequencies).reduce((a, b) => Number(a) + Number(b), 0);
        for (const [val, count] of sortedFreq) {
          const pct = total > 0 ? ((Number(count) / total) * 100).toFixed(1) : '0';
          text += `| ${val} | ${count} | ${pct}% |\n`;
        }
        text += `\n`;
      }
    }
    return text;
  }

  /**
   * SECTION 5: Corrélations fortes (exportForChat).
   * @private
   */
  _chatCorrelationsSection(analysis) {
    if (!(analysis.strongCorrelations?.length > 0)) return '';

    let text = `## 🔗 Corrélations Significatives\n\n`;
    text += `| Colonne 1 | Colonne 2 | Corrélation | Force |\n|---|---|---|---|\n`;

    for (const corr of analysis.strongCorrelations.slice(0, 10)) {
      const absCorr = Math.abs(corr.correlation);
      let strength = '🟡 Modérée';
      if (absCorr > 0.8) strength = '🔴 Très forte';
      else if (absCorr > 0.6) strength = '🟠 Forte';
      text += `| ${corr.column1} | ${corr.column2} | ${corr.correlation.toFixed(3)} | ${strength} |\n`;
    }
    text += `\n`;
    return text;
  }

  /**
   * SECTION 6: Valeurs aberrantes détectées (exportForChat).
   * @private
   */
  _chatOutliersSection(sheet) {
    if (!sheet?.outliers) return '';

    const outlierCols = Object.entries(sheet.outliers).filter(
      ([_, data]) => data && data.outliers?.length > 0
    );

    if (outlierCols.length === 0) return '';

    let text = `## ⚠️ Valeurs Aberrantes Détectées\n\n`;

    for (const [col, data] of outlierCols) {
      const outlierData = data;
      text += `### ${col}\n`;
      text += `- **Méthode**: ${outlierData.method || 'IQR'}\n`;
      text += `- **Nombre d'outliers**: ${outlierData.outliers?.length || 0}\n`;

      if (outlierData.bounds) {
        text += `- **Limites**: [${this._formatNumber(outlierData.bounds.lower)}, ${this._formatNumber(outlierData.bounds.upper)}]\n`;
      }

      if (outlierData.outliers?.length > 0) {
        text += `- **Valeurs**: ${outlierData.outliers
          .slice(0, 5)
          .map((v) => this._formatNumber(v.value || v))
          .join(', ')}${outlierData.outliers.length > 5 ? '...' : ''}\n`;
      }
      text += `\n`;
    }
    return text;
  }

  /**
   * SECTION 7: Qualité des données (exportForChat).
   * @private
   */
  _chatDataQualitySection(dataQuality) {
    if (!(dataQuality && Object.keys(dataQuality).length > 0)) return '';

    let text = `## ✅ Qualité des Données\n\n`;

    if (dataQuality.completeness !== undefined) {
      let qualityIcon = '🔴';
      if (dataQuality.completeness >= 95) qualityIcon = '🟢';
      else if (dataQuality.completeness >= 80) qualityIcon = '🟡';
      text += `- **Complétude globale**: ${qualityIcon} ${dataQuality.completeness.toFixed(1)}%\n`;
    }

    text += this._chatMissingValuesLine(dataQuality);
    text += this._chatDuplicatesLine(dataQuality);
    text += `\n`;
    return text;
  }

  /** Ligne « valeurs manquantes » de la section qualité. Iso : extrait de
   * `_chatDataQualitySection`. @private */
  _chatMissingValuesLine(dataQuality) {
    if (!dataQuality.missingValues) return '';
    const missingCols = Object.entries(dataQuality.missingValues).filter(
      ([_, count]) => Number(count) > 0
    );
    if (missingCols.length === 0) return `- **Valeurs manquantes**: Aucune ✓\n`;
    let text = `- **Valeurs manquantes**:\n`;
    for (const [col, count] of missingCols) {
      text += `  - ${col}: ${count} valeurs manquantes\n`;
    }
    return text;
  }

  /** Ligne « doublons » de la section qualité. Iso : extrait de
   * `_chatDataQualitySection`. @private */
  _chatDuplicatesLine(dataQuality) {
    if (!dataQuality.duplicates) return '';
    if (dataQuality.duplicates.count > 0) {
      return `- **Doublons détectés**: ${dataQuality.duplicates.count} lignes\n`;
    }
    return `- **Doublons**: Aucun ✓\n`;
  }

  /**
   * SECTION 8: Insights et recommandations (exportForChat).
   * @private
   */
  _chatInsightsSection(summary) {
    if (
      !(
        summary.keyInsights?.length > 0 ||
        summary.recommendations?.length > 0 ||
        summary.patterns?.length > 0
      )
    ) {
      return '';
    }

    let text = `## 💡 Insights & Recommandations\n\n`;

    if (summary.patterns?.length > 0) {
      text += `### Patterns identifiés\n`;
      for (const pattern of summary.patterns) {
        text += `- ${pattern}\n`;
      }
      text += `\n`;
    }

    if (summary.keyInsights?.length > 0) {
      text += `### Observations clés\n`;
      for (const insight of summary.keyInsights) {
        text += `- ${insight}\n`;
      }
      text += `\n`;
    }

    if (summary.recommendations?.length > 0) {
      text += `### Recommandations\n`;
      for (const rec of summary.recommendations) {
        text += `- 📌 ${rec}\n`;
      }
      text += `\n`;
    }

    if (summary.topPerformers?.length > 0) {
      text += `### Top performers\n`;
      for (const top of summary.topPerformers) {
        text += `- 🏆 ${top}\n`;
      }
      text += `\n`;
    }
    return text;
  }

  /**
   * Helper: emoji pour le type de colonne
   * @private
   */
  _getTypeEmoji(type) {
    const typeEmojis = {
      string: '📝',
      integer: '🔢',
      float: '📊',
      number: '📊',
      date: '📅',
      datetime: '📅',
      boolean: '✅',
      currency: '💰',
      percentage: '📈',
      email: '📧',
      url: '🔗',
      phone: '📞',
      id: '🆔',
      uuid: '🆔',
    };
    return typeEmojis[type] || '📋';
  }

  /**
   * Helper: description de colonne
   * @private
   */
  _getColumnDescription(header, type, sheet) {
    const stats = sheet.statistics?.[header];
    const catData = sheet.categoricalAnalysis?.[header];

    if (stats) {
      return `min=${this._formatNumber(stats.min)}, max=${this._formatNumber(stats.max)}, moy=${this._formatNumber(stats.mean)}`;
    }

    if (catData) {
      const uniqueCount = catData.uniqueCount || Object.keys(catData.frequencies || {}).length;
      return `${uniqueCount} valeurs uniques`;
    }

    return '';
  }

  /**
   * Helper: formatage des nombres
   * @private
   */
  _formatNumber(value) {
    if (value === undefined || value === null) return 'N/A';
    if (typeof value !== 'number') return String(value);
    if (Number.isInteger(value)) return value.toLocaleString('fr-FR');
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Exporte en Markdown
   */
  exportToMarkdown(analysis) {
    const summary = analysis.summary || {};
    const sheet = analysis.sheets?.[0];

    let md = `# Rapport d'Analyse Excel\n\n`;
    md += `## Résumé\n\n`;
    md += `| Métrique | Valeur |\n|---|---|\n`;
    md += `| Lignes | ${summary.totalRows || 0} |\n`;
    md += `| Colonnes | ${summary.totalColumns || 0} |\n`;
    md += `| Feuilles | ${summary.totalSheets || 1} |\n\n`;

    if (sheet?.statistics) {
      md += `## Statistiques\n\n`;
      md += `| Colonne | Moyenne | Min | Max | Écart-type |\n|---|---|---|---|---|\n`;

      for (const [col, stats] of Object.entries(sheet.statistics)) {
        md += `| ${col} | ${stats.mean?.toFixed(2)} | ${stats.min} | ${stats.max} | ${stats.standardDeviation?.toFixed(2)} |\n`;
      }
    }

    return md;
  }
}

export default ExcelAnalyzer;

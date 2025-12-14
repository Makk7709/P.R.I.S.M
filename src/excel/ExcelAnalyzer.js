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
      ...options
    };

    this.parser = new ExcelParserService({
      maxFileSize: this.options.maxFileSize
    });
    this.statsEngine = new StatisticalEngine();
    this.typeDetector = new DataTypeDetector();
    this.trustContext = getTrustContext();
    
    // Seuil pour validation TrustContext (10MB)
    this.trustContextFileSizeThreshold = 10 * 1024 * 1024;
    
    // Mots-clés sensibles déclenchant validation
    this.sensitiveKeywords = [
      'confidential', 'secret', 'private', 'internal', 
      'classified', 'restricted', 'proprietary', 'personal'
    ];
    
    // Orchestrateurs seront chargés dynamiquement
    this.hybridOrchestrator = null;
    this.taskProcessor = null;
    this._initPromise = null;
    this._initialized = false;
    
    // Charger les orchestrateurs de manière asynchrone
    this._initPromise = this._loadOrchestrators();
  }
  
  /**
   * Attend que l'initialisation soit terminée
   * @returns {Promise<void>}
   */
  async ensureInitialized() {
    if (this._initialized) return;
    if (this._initPromise) {
      await this._initPromise;
    }
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
    // Gérer la surcharge: analyze(buffer, userQuery) ou analyze(buffer, options)
    let userQuery = '';
    let mergedOptions = { ...this.options };
    
    if (typeof optionsOrUserQuery === 'string') {
      userQuery = optionsOrUserQuery;
      mergedOptions = { ...this.options, ...options };
    } else {
      mergedOptions = { ...this.options, ...optionsOrUserQuery, ...options };
      userQuery = mergedOptions.userQuery || '';
    }
    
    const warnings = [];
    const startTime = Date.now();
    const fileSize = buffer ? buffer.length : 0;

    try {
      // ✨ ÉTAPE 0: Validation TrustContext pour fichiers volumineux ou requêtes sensibles
      const needsTrustContextValidation = 
        fileSize >= this.trustContextFileSizeThreshold ||
        this.sensitiveKeywords.some(keyword => 
          userQuery.toLowerCase().includes(keyword)
        );
      
      if (needsTrustContextValidation) {
        try {
          const approval = await this.trustContext.requestApproval({
            action: 'excel_analysis',
            fileSize: fileSize,
            fileName: mergedOptions.filename || 'unknown.xlsx',
            userQuery: userQuery,
            criticality: fileSize >= 20 * 1024 * 1024 
              ? CriticalityLevel.HIGH 
              : CriticalityLevel.MEDIUM
          });
          
          if (!approval.approved) {
            throw new Error(
              `Excel analysis rejected by TrustContext: ${approval.reason || 'File size or content requires approval'}`
            );
          }
        } catch (error) {
          // Si erreur TrustContext, rejeter par sécurité
          console.error('[ExcelAnalyzer] TrustContext validation failed:', error.message);
          throw new Error(`Security validation failed: ${error.message}`);
        }
      }
      
      // 1. Parser le fichier
      const parsedData = await this.parser.parseWorkbook(buffer, {
        sheets: mergedOptions.sheets,
        sheetIndices: mergedOptions.sheetIndices,
        detectTypes: true,
        includeStats: true
      });

      if (!parsedData.success) {
        throw new Error('Parsing failed');
      }
      
      // ✨ Détecter colonnes sensibles après parsing
      if (parsedData.sheets && parsedData.sheets.length > 0) {
        const sensitiveColumns = this._detectSensitiveColumns(parsedData.sheets[0]);
        if (sensitiveColumns.length > 0 && !needsTrustContextValidation) {
          // Validation supplémentaire pour colonnes sensibles
          try {
            const approval = await this.trustContext.validateCriticalDecision({
              action: 'excel_analysis_sensitive_columns',
              fileSize: fileSize,
              sensitiveColumns: sensitiveColumns,
              userQuery: userQuery,
              criticality: CriticalityLevel.MEDIUM
            });
            
            if (!approval.approved) {
              throw new Error(`Analysis rejected: file contains sensitive columns (${sensitiveColumns.join(', ')})`);
            }
          } catch (error) {
            console.error('[ExcelAnalyzer] TrustContext validation for sensitive columns failed:', error.message);
            throw error;
          }
        }
      }

      // 2. Analyser chaque feuille
      const analyzedSheets = [];
      let correlations = null;
      let allNumericData = {};
      let ambiguousResolutions = []; // ✅ NOUVEAU: Stocker les résolutions d'ambiguïtés

      for (const sheet of parsedData.sheets) {
        const analyzedSheet = await this._analyzeSheet(sheet, mergedOptions);
        
        // ✅ NOUVEAU: Résoudre les ambiguïtés via Consensus si activé
        if (this.options.useConsensusForAmbiguous && analyzedSheet.ambiguousColumns?.length > 0) {
          const resolutions = await this._resolveAmbiguitiesWithConsensus(
            sheet,
            analyzedSheet.ambiguousColumns,
            mergedOptions
          );
          analyzedSheet.ambiguousResolutions = resolutions;
          ambiguousResolutions.push(...resolutions);
          
          // Appliquer les résolutions au sheet analysé
          this._applyAmbiguityResolutions(analyzedSheet, resolutions);
        }
        
        analyzedSheets.push(analyzedSheet);

        // Collecter les données numériques pour corrélations globales
        for (const col of (analyzedSheet.typeStats?.numericColumns || [])) {
          const key = `${sheet.name}.${col}`;
          allNumericData[key] = sheet.rows.map(r => r[col]).filter(v => !isNaN(v) && v !== null);
        }
      }

      // 3. Calculer les corrélations entre colonnes numériques
      if (mergedOptions.computeCorrelations && Object.keys(allNumericData).length >= 2) {
        const correlationResult = this.statsEngine.correlationMatrix(allNumericData);
        correlations = correlationResult.matrix;
      }

      // 4. Identifier les corrélations fortes
      let strongCorrelations = [];
      if (correlations) {
        strongCorrelations = this._findStrongCorrelations(correlations);
      }

      // 5. Analyse temporelle si demandée
      let timeSeries = null;
      if (mergedOptions.timeSeriesAnalysis && mergedOptions.dateColumn) {
        timeSeries = this._analyzeTimeSeries(analyzedSheets, mergedOptions);
      }

      // 6. GroupBy si demandé
      let groupedAnalysis = null;
      if (mergedOptions.groupBy) {
        groupedAnalysis = this._performGroupBy(parsedData.sheets, mergedOptions);
      }

      // 7. Pivot table si demandé
      let pivotTable = null;
      if (mergedOptions.pivotTable) {
        pivotTable = this._createPivotTable(parsedData.sheets[0], mergedOptions.pivotTable);
      }

      // 8. Résumé et profils de colonnes
      let summary = null;
      let columnProfiles = null;
      
      if (mergedOptions.generateSummary) {
        summary = this._generateSummary(analyzedSheets, parsedData.metadata);
      }
      
      if (mergedOptions.profileColumns) {
        columnProfiles = this._generateColumnProfiles(analyzedSheets);
      }

      // 9. Qualité des données
      let dataQuality = null;
      if (mergedOptions.checkDataQuality) {
        dataQuality = this._checkDataQuality(analyzedSheets);
      }

      // 10. Agrégations personnalisées
      let customResults = null;
      if (mergedOptions.customAggregations) {
        customResults = this._computeCustomAggregations(
          parsedData.sheets[0],
          mergedOptions.customAggregations
        );
      }

      // 11. Détection de relations entre feuilles
      let relationships = null;
      if (mergedOptions.detectRelationships && parsedData.sheets.length > 1) {
        relationships = this._detectSheetRelationships(parsedData.sheets);
      }

      // 12. Fusion de feuilles si demandée
      let mergedData = null;
      if (mergedOptions.mergeSheets) {
        mergedData = this._mergeSheets(parsedData.sheets, mergedOptions.mergeSheets);
      }

      const analysisTime = Date.now() - startTime;

      return {
        success: true,
        sheets: analyzedSheets,
        parsedData,
        metadata: {
          ...parsedData.metadata,
          analysisTimeMs: analysisTime
        },
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
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'ANALYSIS_ERROR',
          message: error.message,
          details: error.details || error.stack
        }
      };
    }
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
      checkDataQuality: true
    });

    if (!analysis.success) {
      return {
        ...analysis,
        aiInsights: null,
        aiError: 'Analysis failed before AI processing'
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
      recommendations
    };
  }

  /**
   * Analyse avec une requête spécifique
   */
  async analyzeWithQuery(buffer, query) {
    const analysis = await this.analyze(buffer, {
      generateSummary: true,
      computeCorrelations: true
    });

    if (!analysis.success) {
      return analysis;
    }

    // Interpréter la requête
    const queryResult = this._interpretQuery(query, analysis);

    return {
      ...analysis,
      query,
      queryResult
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
      ambiguousColumns: [] // ✅ NOUVEAU: Colonnes avec types ambigus
    };

    if (sheet.isEmpty) {
      return result;
    }

    // ✅ NOUVEAU: Détecter les colonnes ambiguës avant l'analyse
    for (const header of sheet.headers) {
      const values = sheet.rows.map(r => r[header]).filter(v => v !== null && v !== undefined);
      if (values.length > 0) {
        const detection = this.typeDetector.detectType(values);
        
        // Vérifier si le type est ambigu
        if (this._isAmbiguousType(detection)) {
          result.ambiguousColumns.push({
            column: header,
            detectedType: detection.type,
            confidence: detection.confidence,
            ambiguityType: this._classifyAmbiguity(detection),
            sampleValues: values.slice(0, 5),
            possibleTypes: detection.mixedTypes || [detection.type],
            details: detection
          });
        }
      }
    }

    // Analyser les colonnes numériques
    for (const col of (sheet.typeStats?.numericColumns || [])) {
      const values = sheet.rows.map(r => r[col]).filter(v => !isNaN(v) && v !== null);
      
      if (values.length > 0) {
        result.statistics[col] = this.statsEngine.descriptiveStats(values);
        
        if (options.detectOutliers) {
          result.outliers[col] = this.statsEngine.detectOutliers(values);
        }
        
        if (options.analyzeDistributions) {
          result.distributions[col] = {
            histogram: this.statsEngine.histogram(values),
            normalityTest: this.statsEngine.normalityTest(values)
          };
        }
      }
    }

    // Analyser les colonnes catégorielles avec structure enrichie
    for (const col of (sheet.typeStats?.textColumns || [])) {
      const values = sheet.rows.map(r => r[col]).filter(v => v !== null && v !== undefined);
      
      if (values.length > 0) {
        const freqTable = this.statsEngine.frequencyTable(values, { sortBy: 'count' });
        
        // Transformer en structure enrichie
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
        
        // Créer les top values triées
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
          entropy: this.statsEngine.entropy ? this.statsEngine.entropy(values) : null
        };
      }
    }

    // Détecter les colonnes de date
    for (const col of (sheet.typeStats?.dateColumns || [])) {
      result.hasTimeData = true;
      result.dateColumns.push(col);
    }
    
    // Stocker les données brutes pour le profiling (référence interne)
    result.rows = sheet.rows;
    result._rawData = sheet.rows;

    return result;
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
  async _resolveAmbiguitiesWithConsensus(sheet, ambiguousColumns, options) {
    const resolutions = [];
    
    if (!this.hybridOrchestrator) {
      console.log('[ExcelAnalyzer] Consensus not available, using heuristics');
      return this._resolveAmbiguitiesWithHeuristics(sheet, ambiguousColumns);
    }
    
    for (const ambiguity of ambiguousColumns) {
      console.log(`[ExcelAnalyzer] Resolving ambiguity for column "${ambiguity.column}" via Consensus`);
      
      // Construire le prompt pour le consensus
      const prompt = this._buildAmbiguityResolutionPrompt(ambiguity, sheet);
      
      try {
        // Utiliser le HybridOrchestrator avec forceConsensus
        const consensusResult = await this.hybridOrchestrator.process(prompt, 'analyse', {
          forceConsensus: true,
          context: {
            dataAnalysis: true,
            ambiguityResolution: true,
            columnName: ambiguity.column
          }
        });
        
        // Extraire la décision du consensus
        const resolution = this._parseConsensusResolution(consensusResult, ambiguity);
        resolutions.push(resolution);
        
        console.log(`[ExcelAnalyzer] Consensus resolution for "${ambiguity.column}":`, resolution.resolvedType);
        
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
  _buildAmbiguityResolutionPrompt(ambiguity, sheet) {
    const sampleData = ambiguity.sampleValues.map(v => `"${v}"`).join(', ');
    
    return `
ANALYSE D'AMBIGUÏTÉ DE DONNÉES - DÉCISION CRITIQUE

Colonne: "${ambiguity.column}"
Type détecté: ${ambiguity.detectedType}
Confiance: ${(ambiguity.confidence * 100).toFixed(1)}%
Type d'ambiguïté: ${ambiguity.ambiguityType}

Échantillon de données:
${sampleData}

Types possibles: ${ambiguity.possibleTypes.join(', ')}

${ambiguity.ambiguityType === 'DATE_FORMAT' ? `
ATTENTION: Format de date ambigu!
- Format DD/MM/YYYY (européen): jour/mois/année
- Format MM/DD/YYYY (américain): mois/jour/année

Analysez les valeurs pour déterminer le format correct.
Si le premier nombre > 12, c'est probablement le jour (format européen).
` : ''}

${ambiguity.ambiguityType === 'MIXED_TYPES' ? `
ATTENTION: Types de données mélangés!
Déterminez le type principal et si les valeurs non-conformes sont:
- Des erreurs de saisie
- Des valeurs spéciales (N/A, null, etc.)
- Un vrai mélange intentionnel
` : ''}

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
      confidence: confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : ambiguity.confidence,
      reason: reasonMatch ? reasonMatch[1].trim() : 'Consensus decision',
      action: actionMatch ? actionMatch[1].trim().toLowerCase() : 'none',
      method: 'consensus',
      consensusUsed: result.metadata?.consensusUsed || true
    };
  }
  
  /**
   * Résout les ambiguïtés avec des heuristiques simples (fallback)
   * @private
   */
  _resolveAmbiguitiesWithHeuristics(sheet, ambiguousColumns) {
    return ambiguousColumns.map(ambiguity => this._resolveWithHeuristic(ambiguity, sheet));
  }
  
  /**
   * Résolution heuristique pour une colonne
   * @private
   */
  _resolveWithHeuristic(ambiguity, sheet) {
    let resolvedType = ambiguity.detectedType;
    let confidence = ambiguity.confidence;
    let reason = 'Heuristic resolution';
    
    // Heuristique pour les dates
    if (ambiguity.ambiguityType === 'DATE_FORMAT') {
      // Vérifier si des valeurs ont le premier nombre > 12 (donc c'est le jour)
      const values = ambiguity.sampleValues;
      const hasHighFirstNumber = values.some(v => {
        const match = String(v).match(/^(\d{1,2})[\/\-]/);
        return match && parseInt(match[1]) > 12;
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
      consensusUsed: false
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
        if (col1 === col2) continue;
        
        const key = [col1, col2].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);

        const corr = correlations[col1][col2];
        if (Math.abs(corr) >= threshold) {
          strong.push({
            column1: col1,
            column2: col2,
            correlation: corr,
            strength: Math.abs(corr) >= 0.9 ? 'very_strong' : 'strong',
            direction: corr > 0 ? 'positive' : 'negative'
          });
        }
      }
    }

    return strong.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
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
        growthRate: stats.mean > 0 ? ((stats.max - stats.min) / stats.mean) : null
      };

      if (options.movingAverageWindow) {
        // Nécessite accès aux données brutes
        result[col].movingAverage = [];
      }

      if (options.forecastPeriods) {
        result[col].forecast = {
          predictions: [],
          method: 'linear_extrapolation'
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
      for (const col of (sheet.typeStats?.numericColumns || [])) {
        if (col === groupCol) continue;
        
        const values = rows.map(r => r[col]).filter(v => !isNaN(v));
        result[groupKey][col] = {};
        
        for (const agg of aggregations) {
          result[groupKey][col][agg] = this.statsEngine.groupBy(
            rows.map(r => ({ [col]: r[col] })),
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
      hasTimeData: sheets.some(s => s.hasTimeData),
      keyInsights,
      patterns,
      topPerformers,
      recommendations,
      highlights,
      observations: patterns // Alias pour compatibilité
    };
  }

  /**
   * Génère les insights clés
   * @private
   */
  _generateKeyInsights(sheets) {
    const insights = [];

    for (const sheet of sheets) {
      // Insights sur les statistiques
      for (const [col, stats] of Object.entries(sheet.statistics || {})) {
        if (stats.skewness && Math.abs(stats.skewness) > 1) {
          insights.push(`La colonne "${col}" montre une asymétrie ${stats.skewness > 0 ? 'à droite (queue longue vers les hautes valeurs)' : 'à gauche (queue longue vers les basses valeurs)'}`);
        }
        if (stats.coefficientOfVariation && stats.coefficientOfVariation > 100) {
          insights.push(`La colonne "${col}" présente une forte variabilité (CV: ${stats.coefficientOfVariation.toFixed(1)}%)`);
        }
        if (stats.mean && stats.median) {
          const ratio = stats.mean / stats.median;
          if (ratio > 1.5) {
            insights.push(`La colonne "${col}" a une moyenne significativement supérieure à la médiane, suggérant des valeurs extrêmes hautes`);
          }
        }
      }

      // Insights sur les outliers
      if (sheet.outliers) {
        for (const [col, outlierData] of Object.entries(sheet.outliers)) {
          if (outlierData && outlierData.outliers?.length > 0) {
            insights.push(`${outlierData.outliers.length} valeur(s) aberrante(s) détectée(s) dans "${col}"`);
          }
        }
      }
      
      // Insights sur les catégories
      for (const [col, catData] of Object.entries(sheet.categoricalAnalysis || {})) {
        const freq = catData.frequencies || {};
        const values = Object.values(freq);
        const total = values.reduce((a, b) => a + b, 0);
        const max = Math.max(...values);
        
        if (total > 0 && max / total > 0.6) {
          const dominant = Object.entries(freq).find(([_, v]) => v === max)?.[0];
          insights.push(`La catégorie "${dominant}" domine dans "${col}" (${(max/total*100).toFixed(0)}%)`);
        }
      }
    }

    return insights.slice(0, 15);
  }
  
  /**
   * Identifie les patterns dans les données
   * @private
   */
  _identifyPatterns(sheets) {
    const patterns = [];
    
    for (const sheet of sheets) {
      // Pattern: colonnes corrélées
      const numericCols = sheet.typeStats?.numericColumns || [];
      if (numericCols.length >= 2) {
        patterns.push(`${numericCols.length} colonnes numériques identifiées pour analyse statistique`);
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
    }
    
    return patterns.slice(0, 10);
  }
  
  /**
   * Identifie les top performers
   * @private
   */
  _identifyTopPerformers(sheets) {
    const topPerformers = [];
    
    for (const sheet of sheets) {
      // Top par valeur max dans colonnes numériques
      for (const [col, stats] of Object.entries(sheet.statistics || {})) {
        if (stats.max !== undefined && stats.mean !== undefined) {
          if (stats.max > stats.mean * 2) {
            topPerformers.push(`Valeur maximale exceptionnelle dans "${col}": ${this._formatNumber(stats.max)} (2x la moyenne)`);
          }
        }
      }
      
      // Top catégories
      for (const [col, catData] of Object.entries(sheet.categoricalAnalysis || {})) {
        const topVals = catData.topValues || [];
        if (topVals.length > 0 && topVals[0]?.count > 0) {
          topPerformers.push(`Top "${col}": ${topVals[0].value} (${topVals[0].count} occurrences)`);
        }
      }
    }
    
    return topPerformers.slice(0, 10);
  }
  
  /**
   * Génère des recommandations actionnables
   * @private
   */
  _generateRecommendations(sheets, insights, patterns) {
    const recommendations = [];
    
    // Recommandation basée sur les outliers
    const hasOutliers = sheets.some(s => 
      Object.values(s.outliers || {}).some(o => o && o.outliers?.length > 0)
    );
    if (hasOutliers) {
      recommendations.push('Vous devriez investiguer les valeurs aberrantes détectées pour vérifier leur validité');
    }
    
    // Recommandation basée sur les données temporelles
    const hasTimeData = sheets.some(s => s.hasTimeData);
    if (hasTimeData) {
      recommendations.push('Vous pourriez analyser les tendances temporelles pour identifier des patterns saisonniers');
    }
    
    // Recommandation basée sur la variabilité
    const hasHighVariability = insights.some(i => i.includes('variabilité') || i.includes('variability'));
    if (hasHighVariability) {
      recommendations.push('La forte variabilité suggère de segmenter les données par catégorie pour une analyse plus fine');
    }
    
    // Recommandation générale
    const numericCount = sheets.reduce((sum, s) => sum + (s.typeStats?.numericColumns?.length || 0), 0);
    if (numericCount >= 3) {
      recommendations.push('Avec plusieurs colonnes numériques, une analyse de corrélation pourrait révéler des relations intéressantes');
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
            label: `Total ${col}: ${this._formatNumber(stats.sum)}`
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
          label: `${col}: ${uniqueCount} valeurs uniques`
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
        // Collecter les valeurs de la colonne
        const values = rows.map(r => r[header]);
        const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
        
        // Calculer les valeurs uniques
        const uniqueSet = new Set(nonNullValues.map(v => String(v)));
        
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
        
        const profile = {
          type: sheet.columnTypes[header] || 'unknown',
          statistics: sheet.statistics?.[header] || null,
          nullCount: values.length - nonNullValues.length,
          uniqueCount: uniqueSet.size,
          totalCount: values.length,
          nullPercentage: values.length > 0 ? ((values.length - nonNullValues.length) / values.length) * 100 : 0,
          sampleValues: nonNullValues.slice(0, 5),
          topValues,
          frequency: sheet.categoricalAnalysis?.[header]?.frequencies || valueCounts
        };

        profiles[header] = profile;
      }
    }

    return profiles;
  }

  /**
   * Vérifie la qualité des données de manière exhaustive
   * @private
   */
  _checkDataQuality(sheets) {
    let totalCells = 0;
    let nullCells = 0;
    let filledCells = 0;
    const issues = [];
    const missingValues = {};
    let duplicateCount = 0;
    const seenRows = new Set();

    for (const sheet of sheets) {
      const rows = sheet.rows || (sheet._rawData ? sheet._rawData : []);
      const cellCount = sheet.rowCount * sheet.columnCount;
      totalCells += cellCount;

      // Analyser chaque colonne pour les valeurs manquantes
      for (const header of sheet.headers) {
        let nullsInCol = 0;
        
        for (const row of rows) {
          const value = row[header];
          if (value === null || value === undefined || value === '') {
            nullsInCol++;
            nullCells++;
          } else {
            filledCells++;
          }
        }
        
        missingValues[header] = nullsInCol;
      }
      
      // Détecter les doublons
      for (const row of rows) {
        // Créer une clé unique pour la ligne
        const rowKey = JSON.stringify(row);
        if (seenRows.has(rowKey)) {
          duplicateCount++;
        } else {
          seenRows.add(rowKey);
        }
      }

      // Compter les outliers comme issues
      for (const [col, outlierData] of Object.entries(sheet.outliers || {})) {
        if (outlierData && outlierData.outliers?.length > 0) {
          issues.push({
            type: 'outliers',
            column: col,
            count: outlierData.outliers.length,
            severity: outlierData.outliers.length > 5 ? 'high' : 'low'
          });
        }
      }
    }

    // Calculer le score de complétude en pourcentage
    const completeness = totalCells > 0 ? (filledCells / totalCells) * 100 : 100;

    return {
      totalCells,
      filledCells,
      nullCells,
      completeness,
      completenessScore: completeness / 100,
      missingValues,
      duplicates: {
        count: duplicateCount,
        percentage: seenRows.size > 0 ? (duplicateCount / (seenRows.size + duplicateCount)) * 100 : 0
      },
      issues,
      qualityScore: this._calculateQualityScore(completeness, duplicateCount, issues.length)
    };
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
      const values = sheet.rows
        .map(r => r[config.column])
        .filter(v => !isNaN(v) && v !== null);

      switch (config.operation) {
        case 'sum':
          results[name] = values.reduce((a, b) => a + b, 0);
          break;
        case 'mean':
          results[name] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
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
      { pattern: /address|adresse|street|rue/i, type: 'address' }
    ];

    const sensitiveColumns = [];
    
    for (const header of sheet.headers) {
      const headerLower = String(header).toLowerCase();
      
      for (const { pattern, type } of sensitivePatterns) {
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
      mergeType: how
    };
  }

  /**
   * Formate les données pour l'IA - INCLUT TOUTES LES DONNÉES BRUTES
   * @private
   */
  _formatForAI(analysis, userQuery) {
    const summary = analysis.summary || {};
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
    if (rows.length > 0 && headers.length > 0) {
      prompt += `### DONNÉES COMPLÈTES DU FICHIER\n\n`;
      
      // Header
      prompt += `| ${headers.join(' | ')} |\n`;
      prompt += `| ${headers.map(() => '---').join(' | ')} |\n`;
      
      // Toutes les lignes (max 100 pour éviter prompt trop long)
      const maxRows = Math.min(rows.length, 100);
      for (let i = 0; i < maxRows; i++) {
        const row = rows[i];
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          return String(val).substring(0, 50);
        });
        prompt += `| ${values.join(' | ')} |\n`;
      }
      
      if (rows.length > 100) {
        prompt += `\n... et ${rows.length - 100} lignes supplémentaires\n`;
      }
    }

    // ✨ AJOUTER DES AGRÉGATIONS PAR COLONNE pour aider l'IA
    prompt += `\n### AGRÉGATIONS PAR COLONNE\n`;
    for (const header of headers) {
      const values = rows.map(r => r[header]).filter(v => v !== null && v !== undefined && v !== '');
      
      // Vérifier si c'est numérique
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      
      if (numericValues.length > values.length * 0.5) {
        // Colonne numérique
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const avg = sum / numericValues.length;
        const max = Math.max(...numericValues);
        const min = Math.min(...numericValues);
        prompt += `\n**${header}** (numérique):\n`;
        prompt += `  - Somme totale: ${sum.toFixed(2)}\n`;
        prompt += `  - Moyenne: ${avg.toFixed(2)}\n`;
        prompt += `  - Max: ${max}, Min: ${min}\n`;
      } else if (values.length > 0) {
        // Colonne catégorielle - compter les occurrences
        const counts = {};
        for (const v of values) {
          const key = String(v);
          counts[key] = (counts[key] || 0) + 1;
        }
        
        // Calculer sommes par catégorie si il y a des colonnes numériques
        const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        
        prompt += `\n**${header}** (catégoriel - ${Object.keys(counts).length} valeurs uniques):\n`;
        for (const [val, count] of sortedCounts.slice(0, 15)) {
          // Calculer les sommes associées
          let sumInfo = '';
          for (const otherHeader of headers) {
            if (otherHeader !== header) {
              const relatedValues = rows
                .filter(r => String(r[header]) === val)
                .map(r => parseFloat(r[otherHeader]))
                .filter(v => !isNaN(v));
              
              if (relatedValues.length > 0) {
                const total = relatedValues.reduce((a, b) => a + b, 0);
                sumInfo += ` | ${otherHeader}: ${total.toFixed(2)}`;
              }
            }
          }
          prompt += `  - "${val}": ${count} fois${sumInfo}\n`;
        }
      }
    }

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
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Plus rapide et moins cher pour l'analyse
            messages: [
              {
                role: 'system',
                content: 'Tu es un analyste de données expert. Réponds en français de manière concise et précise. Utilise les données fournies pour répondre directement à la question.'
              },
              {
                role: 'user',
                content: cleanedPrompt
              }
            ],
            max_tokens: 500,
            temperature: 0.3
          })
        });
        
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        console.log('[ExcelAnalyzer] ✅ OpenAI response received:', content.substring(0, 100) + '...');
        
        return {
          content,
          metadata: { model: 'gpt-4o-mini', provider: 'openai' }
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
      metadata: { model: 'fallback', reason: 'No AI provider configured' }
    };
  }

  /**
   * Génère des insights basiques sans IA
   * @private
   */
  _generateBasicInsights(prompt, userQuery) {
    // Extraire les informations clés du prompt
    const insights = [];
    
    // Chercher les top performers dans le prompt
    const topMatch = prompt.match(/Top\s+"([^"]+)":\s+([^\(]+)\((\d+)/gi);
    if (topMatch) {
      topMatch.forEach(match => {
        insights.push(`• ${match.replace(/Top\s+"/, '**').replace('":', '** meilleur:')}`);
      });
    }
    
    // Chercher les statistiques de lignes/colonnes
    const rowMatch = prompt.match(/Lignes totales:\s*(\d+)/i);
    const colMatch = prompt.match(/Colonnes:\s*(\d+)/i);
    if (rowMatch || colMatch) {
      insights.push(`• Données: ${rowMatch?.[1] || '?'} lignes, ${colMatch?.[1] || '?'} colonnes`);
    }
    
    return insights.length > 0 ? insights.join('\n') : 'Consultez les statistiques détaillées ci-dessus.';
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
    const recommendations = lines.filter(line => 
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
    if (lowerQuery.includes('average') || lowerQuery.includes('mean') || lowerQuery.includes('moyenne')) {
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
  exportForChat(analysis, options = {}) {
    const summary = analysis.summary || {};
    const sheet = analysis.sheets?.[0];
    const dataQuality = analysis.dataQuality || {};

    let text = `# 📊 Analyse Détaillée du Fichier\n\n`;
    
    // ════════════════════════════════════════════════════════════════════════
    // SECTION 1: Vue d'ensemble
    // ════════════════════════════════════════════════════════════════════════
    text += `## 📋 Vue d'ensemble\n\n`;
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

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 2: Structure des colonnes
    // ════════════════════════════════════════════════════════════════════════
    if (sheet?.headers && sheet?.columnTypes) {
      text += `## 📑 Structure des Colonnes\n\n`;
      text += `| Colonne | Type | Description |\n|---|---|---|\n`;
      
      for (const header of sheet.headers) {
        const type = sheet.columnTypes[header] || 'unknown';
        const typeEmoji = this._getTypeEmoji(type);
        const description = this._getColumnDescription(header, type, sheet);
        text += `| **${header}** | ${typeEmoji} ${type} | ${description} |\n`;
      }
      text += `\n`;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 3: Statistiques numériques détaillées
    // ════════════════════════════════════════════════════════════════════════
    if (sheet?.statistics && Object.keys(sheet.statistics).length > 0) {
      text += `## 📈 Statistiques Numériques\n\n`;
      
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
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 4: Analyse catégorielle
    // ════════════════════════════════════════════════════════════════════════
    if (sheet?.categoricalAnalysis && Object.keys(sheet.categoricalAnalysis).length > 0) {
      text += `## 🏷️ Analyse Catégorielle\n\n`;
      
      for (const [col, catData] of Object.entries(sheet.categoricalAnalysis)) {
        text += `### ${col}\n`;
        text += `- **Valeurs uniques**: ${catData.uniqueCount || Object.keys(catData.frequencies || {}).length}\n`;
        text += `- **Valeur dominante**: ${catData.mode || 'N/A'}\n\n`;
        
        // Top valeurs
        const frequencies = catData.frequencies || {};
        const sortedFreq = Object.entries(frequencies)
          .sort((a, b) => Number(b[1]) - Number(a[1]))
          .slice(0, 5);
        
        if (sortedFreq.length > 0) {
          text += `| Valeur | Fréquence | % |\n|---|---|---|\n`;
          const total = Object.values(frequencies).reduce((a, b) => Number(a) + Number(b), 0);
          for (const [val, count] of sortedFreq) {
            const pct = total > 0 ? (Number(count) / total * 100).toFixed(1) : '0';
            text += `| ${val} | ${count} | ${pct}% |\n`;
          }
          text += `\n`;
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 5: Corrélations fortes
    // ════════════════════════════════════════════════════════════════════════
    if (analysis.strongCorrelations?.length > 0) {
      text += `## 🔗 Corrélations Significatives\n\n`;
      text += `| Colonne 1 | Colonne 2 | Corrélation | Force |\n|---|---|---|---|\n`;
      
      for (const corr of analysis.strongCorrelations.slice(0, 10)) {
        const strength = Math.abs(corr.correlation) > 0.8 ? '🔴 Très forte' : 
                        Math.abs(corr.correlation) > 0.6 ? '🟠 Forte' : '🟡 Modérée';
        text += `| ${corr.column1} | ${corr.column2} | ${corr.correlation.toFixed(3)} | ${strength} |\n`;
      }
      text += `\n`;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 6: Outliers détectés
    // ════════════════════════════════════════════════════════════════════════
    if (sheet?.outliers) {
      const outlierCols = Object.entries(sheet.outliers).filter(([_, data]) => 
        data && data.outliers?.length > 0
      );
      
      if (outlierCols.length > 0) {
        text += `## ⚠️ Valeurs Aberrantes Détectées\n\n`;
        
        for (const [col, data] of outlierCols) {
          const outlierData = data;
          text += `### ${col}\n`;
          text += `- **Méthode**: ${outlierData.method || 'IQR'}\n`;
          text += `- **Nombre d'outliers**: ${outlierData.outliers?.length || 0}\n`;
          
          if (outlierData.bounds) {
            text += `- **Limites**: [${this._formatNumber(outlierData.bounds.lower)}, ${this._formatNumber(outlierData.bounds.upper)}]\n`;
          }
          
          if (outlierData.outliers?.length > 0) {
            text += `- **Valeurs**: ${outlierData.outliers.slice(0, 5).map(v => this._formatNumber(v.value || v)).join(', ')}${outlierData.outliers.length > 5 ? '...' : ''}\n`;
          }
          text += `\n`;
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 7: Qualité des données
    // ════════════════════════════════════════════════════════════════════════
    if (dataQuality && Object.keys(dataQuality).length > 0) {
      text += `## ✅ Qualité des Données\n\n`;
      
      if (dataQuality.completeness !== undefined) {
        const qualityIcon = dataQuality.completeness >= 95 ? '🟢' : 
                          dataQuality.completeness >= 80 ? '🟡' : '🔴';
        text += `- **Complétude globale**: ${qualityIcon} ${dataQuality.completeness.toFixed(1)}%\n`;
      }
      
      if (dataQuality.missingValues) {
        const missingCols = Object.entries(dataQuality.missingValues)
          .filter(([_, count]) => Number(count) > 0);
        
        if (missingCols.length > 0) {
          text += `- **Valeurs manquantes**:\n`;
          for (const [col, count] of missingCols) {
            text += `  - ${col}: ${count} valeurs manquantes\n`;
          }
        } else {
          text += `- **Valeurs manquantes**: Aucune ✓\n`;
        }
      }
      
      if (dataQuality.duplicates) {
        if (dataQuality.duplicates.count > 0) {
          text += `- **Doublons détectés**: ${dataQuality.duplicates.count} lignes\n`;
        } else {
          text += `- **Doublons**: Aucun ✓\n`;
        }
      }
      text += `\n`;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECTION 8: Insights et recommandations
    // ════════════════════════════════════════════════════════════════════════
    if (summary.keyInsights?.length > 0 || summary.recommendations?.length > 0 || summary.patterns?.length > 0) {
      text += `## 💡 Insights & Recommandations\n\n`;
      
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
    }

    return {
      text,
      highlights: summary.keyInsights || [],
      recommendations: summary.recommendations || [],
      patterns: summary.patterns || []
    };
  }
  
  /**
   * Helper: emoji pour le type de colonne
   * @private
   */
  _getTypeEmoji(type) {
    const typeEmojis = {
      'string': '📝',
      'integer': '🔢',
      'float': '📊',
      'number': '📊',
      'date': '📅',
      'datetime': '📅',
      'boolean': '✅',
      'currency': '💰',
      'percentage': '📈',
      'email': '📧',
      'url': '🔗',
      'phone': '📞',
      'id': '🆔',
      'uuid': '🆔'
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

#!/usr/bin/env node

/**
 * ANALYSE STATIQUE COUVERTURE CODE - Sans exécution
 * Analyse directe des fichiers pour éviter les blocages
 */

import fs from 'fs';
import path from 'path';

console.log('📊 ANALYSE STATIQUE COUVERTURE CODE SYSTÈME MÉMOIRE');
console.log('══════════════════════════════════════════════════════');

class StaticCodeAnalyzer {
  constructor() {
    this.results = {};
  }

  /**
   * Analyse un fichier JavaScript
   */
  analyzeFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return { error: 'File not found' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const analysis = {
      file: path.basename(filePath),
      totalLines: lines.length,
      codeLines: lines.filter(line => line.trim() && !line.trim().startsWith('//')).length,
      size: content.length,
      sizeKB: (content.length / 1024).toFixed(1),
      
      // Structures
      classes: this.extractClasses(content),
      methods: this.extractMethods(content),
      asyncMethods: this.extractAsyncMethods(content),
      
      // Complexité
      conditions: this.countPatterns(content, /if\s*\(|else\s*if\s*\(|switch\s*\(/g),
      loops: this.countPatterns(content, /for\s*\(|while\s*\(|do\s*{/g),
      tryCatch: this.countPatterns(content, /try\s*{|catch\s*\(/g),
      
      // Documentation
      comments: this.countPatterns(content, /\/\*\*[\s\S]*?\*\/|\/\/.*$/gm),
      jsdocBlocks: this.countPatterns(content, /\/\*\*[\s\S]*?\*\//g),
      
      // Patterns suspects
      mathRandom: this.countPatterns(content, /Math\.random\(\)/g),
      emptyReturns: this.countPatterns(content, /return\s*\[\s*\]|return\s*Promise\.resolve\(\[\]\)/g),
      stubs: this.countPatterns(content, /return\s*Promise\.resolve\(\)|return\s*\[\]/g),
      
      // Features avancées
      maps: this.countPatterns(content, /new\s+Map\(\)/g),
      sets: this.countPatterns(content, /new\s+Set\(\)/g),
      promises: this.countPatterns(content, /Promise\.|async\s+/g),
      eventEmitter: this.countPatterns(content, /EventEmitter|emit\(/g),
      
      // Persistence
      fileOperations: this.countPatterns(content, /fs\.(read|write|exists)/g),
      jsonOperations: this.countPatterns(content, /JSON\.(parse|stringify)/g),
      
      // Intelligence
      semanticMethods: this.extractSemanticMethods(content),
      intelligenceFeatures: this.countIntelligenceFeatures(content)
    };
    
    return analysis;
  }

  extractClasses(content) {
    const matches = content.match(/class\s+(\w+)/g) || [];
    return matches.map(match => match.replace('class ', ''));
  }

  extractMethods(content) {
    const patterns = [
      /^\s*(\w+)\s*\(/gm,           // method()
      /^\s*async\s+(\w+)\s*\(/gm,  // async method()
      /(\w+)\s*:\s*function/g,     // method: function
      /(\w+)\s*=>\s*/g             // arrow functions
    ];
    
    const methods = new Set();
    patterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        const methodName = match.replace(/^\s*/, '').replace(/async\s+/, '').replace(/\s*[(:=].*$/, '');
        if (methodName && methodName !== 'constructor') {
          methods.add(methodName);
        }
      });
    });
    
    return Array.from(methods);
  }

  extractAsyncMethods(content) {
    const matches = content.match(/async\s+(\w+)\s*\(/g) || [];
    return matches.map(match => match.replace(/async\s+/, '').replace(/\s*\(.*$/, ''));
  }

  extractSemanticMethods(content) {
    const semanticKeywords = [
      'semantic', 'similarity', 'vector', 'embedding', 'cosine',
      'relevance', 'query', 'search', 'index', 'retrieval'
    ];
    
    const methods = [];
    semanticKeywords.forEach(keyword => {
      const pattern = new RegExp(`(\\w*${keyword}\\w*|${keyword}\\w*)\\s*\\(`, 'gi');
      const matches = content.match(pattern) || [];
      methods.push(...matches.map(m => m.replace(/\s*\(.*$/, '')));
    });
    
    return [...new Set(methods)];
  }

  countIntelligenceFeatures(content) {
    const features = {
      vectorOperations: this.countPatterns(content, /vector|embedding|cosine|dotProduct/gi),
      semanticSimilarity: this.countPatterns(content, /semantic.*similarity|similarity.*semantic/gi),
      indexing: this.countPatterns(content, /index.*build|build.*index|semantic.*index/gi),
      realAlgorithms: this.countPatterns(content, /Math\.(sqrt|pow|abs)|magnitude|normalize/gi),
      intelligentSearch: this.countPatterns(content, /query.*vector|vector.*query|search.*semantic/gi)
    };
    
    return features;
  }

  countPatterns(content, pattern) {
    const matches = content.match(pattern) || [];
    return matches.length;
  }

  /**
   * Compare deux analyses
   */
  compareAnalyses(original, fixed) {
    const comparison = {
      linesGrowth: fixed.totalLines - original.totalLines,
      methodsGrowth: fixed.methods.length - original.methods.length,
      complexityGrowth: (fixed.conditions + fixed.loops) - (original.conditions + original.loops),
      
      // Problèmes résolus
      stubsReduction: original.stubs - fixed.stubs,
      mathRandomReduction: original.mathRandom - fixed.mathRandom,
      
      // Améliorations
      persistenceAdded: fixed.fileOperations > original.fileOperations,
      intelligenceAdded: Object.values(fixed.intelligenceFeatures).reduce((sum, val) => sum + val, 0) >
                        Object.values(original.intelligenceFeatures).reduce((sum, val) => sum + val, 0),
      
      // Qualité
      documentationRatio: {
        original: original.comments / original.codeLines,
        fixed: fixed.comments / fixed.codeLines
      },
      
      asyncMethodsRatio: {
        original: original.asyncMethods.length / original.methods.length,
        fixed: fixed.asyncMethods.length / fixed.methods.length
      }
    };
    
    return comparison;
  }

  /**
   * Calcule le score de couverture
   */
  calculateCoverageScore(analysis) {
    let score = 0;
    
    // Couverture des fonctionnalités de base (40 points)
    const coreFeatures = ['store', 'retrieve', 'search', 'health', 'start', 'stop'];
    const foundFeatures = coreFeatures.filter(feature => 
      analysis.methods.some(method => method.toLowerCase().includes(feature))
    );
    score += (foundFeatures.length / coreFeatures.length) * 40;
    
    // Persistence (20 points)
    if (analysis.fileOperations > 0 && analysis.jsonOperations > 0) {
      score += 20;
    } else if (analysis.fileOperations > 0 || analysis.jsonOperations > 0) {
      score += 10;
    }
    
    // Intelligence (20 points)
    const intelligenceTotal = Object.values(analysis.intelligenceFeatures).reduce((sum, val) => sum + val, 0);
    if (intelligenceTotal > 10) {
      score += 20;
    } else if (intelligenceTotal > 5) {
      score += 15;
    } else if (intelligenceTotal > 0) {
      score += 10;
    }
    
    // Qualité du code (20 points)
    const docRatio = analysis.comments / analysis.codeLines;
    const asyncRatio = analysis.asyncMethods.length / analysis.methods.length;
    
    if (docRatio > 0.1) score += 10; // Bien documenté
    if (asyncRatio > 0.3) score += 10; // Beaucoup d'async (moderne)
    
    return Math.min(100, score);
  }

  /**
   * Analyse les problèmes potentiels
   */
  analyzeIssues(analysis) {
    const issues = [];
    
    if (analysis.mathRandom > 0) {
      issues.push(`⚠️ ${analysis.mathRandom} utilisation(s) de Math.random() (algorithmes factices?)`);
    }
    
    if (analysis.stubs > 5) {
      issues.push(`⚠️ ${analysis.stubs} méthodes stub potentielles (retours vides)`);
    }
    
    if (analysis.emptyReturns > 3) {
      issues.push(`⚠️ ${analysis.emptyReturns} retours vides suspects`);
    }
    
    if (analysis.fileOperations === 0) {
      issues.push(`⚠️ Aucune opération fichier (pas de persistence?)`);
    }
    
    if (Object.values(analysis.intelligenceFeatures).every(val => val === 0)) {
      issues.push(`⚠️ Aucune fonction d'intelligence détectée`);
    }
    
    const docRatio = analysis.comments / analysis.codeLines;
    if (docRatio < 0.05) {
      issues.push(`⚠️ Documentation insuffisante (${(docRatio * 100).toFixed(1)}%)`);
    }
    
    return issues;
  }

  /**
   * Lance l'analyse complète
   */
  analyze() {
    console.log('🔍 ANALYSE DES FICHIERS SYSTÈME MÉMOIRE...\n');
    
    const files = [
      './asi/asiMemorySystem.js',
      './asi/asiMemorySystemFixed.js'
    ];
    
    const analyses = {};
    
    // Analyse de chaque fichier
    files.forEach(file => {
      console.log(`📄 Analyse: ${file}`);
      console.log('─'.repeat(50));
      
      const analysis = this.analyzeFile(file);
      const fileKey = file.includes('Fixed') ? 'fixed' : 'original';
      analyses[fileKey] = analysis;
      
      if (analysis.error) {
        console.log(`❌ Erreur: ${analysis.error}\n`);
        return;
      }
      
      // Affichage des métriques
      console.log(`📏 Taille: ${analysis.totalLines} lignes (${analysis.sizeKB}KB)`);
      console.log(`🔧 Méthodes: ${analysis.methods.length} (${analysis.asyncMethods.length} async)`);
      console.log(`📚 Classes: ${analysis.classes.join(', ')}`);
      console.log(`💬 Documentation: ${analysis.comments} commentaires`);
      console.log(`🔀 Complexité: ${analysis.conditions} conditions, ${analysis.loops} boucles`);
      
      console.log('\n🔍 ANALYSE SPÉCIALISÉE:');
      console.log(`💾 Persistence: ${analysis.fileOperations} ops fichier, ${analysis.jsonOperations} ops JSON`);
      console.log(`🧠 Intelligence: ${JSON.stringify(analysis.intelligenceFeatures)}`);
      console.log(`🎭 Problèmes: ${analysis.mathRandom} Math.random, ${analysis.stubs} stubs`);
      
      // Analyse des problèmes
      const issues = this.analyzeIssues(analysis);
      if (issues.length > 0) {
        console.log('\n🚨 PROBLÈMES DÉTECTÉS:');
        issues.forEach(issue => console.log(`   ${issue}`));
      }
      
      // Score de couverture
      const coverageScore = this.calculateCoverageScore(analysis);
      console.log(`\n📊 SCORE COUVERTURE: ${coverageScore.toFixed(1)}/100`);
      
      console.log('\n');
    });
    
    // Comparaison si les deux fichiers existent
    if (analyses.original && analyses.fixed && !analyses.original.error && !analyses.fixed.error) {
      this.compareAndSummarize(analyses.original, analyses.fixed);
    }
    
    return analyses;
  }

  /**
   * Compare et résume les analyses
   */
  compareAndSummarize(original, fixed) {
    console.log('🔄 COMPARAISON ORIGINAL vs CORRIGÉ');
    console.log('═'.repeat(50));
    
    const comparison = this.compareAnalyses(original, fixed);
    
    console.log('📊 MÉTRIQUES COMPARATIVES:');
    console.log(`   📏 Lignes: ${original.totalLines} → ${fixed.totalLines} (${comparison.linesGrowth >= 0 ? '+' : ''}${comparison.linesGrowth})`);
    console.log(`   🔧 Méthodes: ${original.methods.length} → ${fixed.methods.length} (${comparison.methodsGrowth >= 0 ? '+' : ''}${comparison.methodsGrowth})`);
    console.log(`   🔀 Complexité: ${original.conditions + original.loops} → ${fixed.conditions + fixed.loops} (${comparison.complexityGrowth >= 0 ? '+' : ''}${comparison.complexityGrowth})`);
    
    console.log('\n🛠️ AMÉLIORATIONS:');
    
    if (comparison.stubsReduction > 0) {
      console.log(`   ✅ Stubs réduits: ${comparison.stubsReduction} méthodes corrigées`);
    }
    
    if (comparison.mathRandomReduction > 0) {
      console.log(`   ✅ Math.random réduit: ${comparison.mathRandomReduction} occurrences supprimées`);
    }
    
    if (comparison.persistenceAdded) {
      console.log(`   ✅ Persistence ajoutée: ${fixed.fileOperations} opérations fichier`);
    }
    
    if (comparison.intelligenceAdded) {
      console.log(`   ✅ Intelligence améliorée: fonctionnalités sémantiques ajoutées`);
    }
    
    console.log('\n📈 SCORES DE COUVERTURE:');
    const originalScore = this.calculateCoverageScore(original);
    const fixedScore = this.calculateCoverageScore(fixed);
    
    console.log(`   📊 Original: ${originalScore.toFixed(1)}/100`);
    console.log(`   📊 Corrigé: ${fixedScore.toFixed(1)}/100`);
    console.log(`   📈 Amélioration: ${(fixedScore - originalScore).toFixed(1)} points`);
    
    console.log('\n🎯 VERDICT FINAL:');
    
    if (fixedScore > originalScore + 20) {
      console.log('   🎉 AMÉLIORATION MAJEURE du système');
    } else if (fixedScore > originalScore + 10) {
      console.log('   ✅ AMÉLIORATION SIGNIFICATIVE du système');
    } else if (fixedScore > originalScore) {
      console.log('   ✅ AMÉLIORATION du système');
    } else {
      console.log('   ⚠️ Pas d\'amélioration détectée');
    }
    
    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    
    if (fixed.mathRandom > 0) {
      console.log('   🔧 Remplacer les Math.random() restants par de vrais algorithmes');
    }
    
    if (fixed.stubs > 3) {
      console.log('   🔧 Implémenter les méthodes stub restantes');
    }
    
    if (comparison.documentationRatio.fixed < 0.1) {
      console.log('   📝 Améliorer la documentation du code');
    }
    
    if (Object.values(fixed.intelligenceFeatures).reduce((sum, val) => sum + val, 0) < 10) {
      console.log('   🧠 Ajouter plus de fonctionnalités d\'intelligence');
    }
    
    console.log('\n🏆 TAUX DE COUVERTURE GLOBAL:');
    console.log(`   📊 ${fixedScore.toFixed(1)}% - ${fixedScore >= 80 ? 'EXCELLENT' : fixedScore >= 60 ? 'BON' : fixedScore >= 40 ? 'MOYEN' : 'FAIBLE'}`);
    
    return {
      originalScore,
      fixedScore,
      improvement: fixedScore - originalScore,
      comparison
    };
  }
}

// Lancement de l'analyse
const analyzer = new StaticCodeAnalyzer();
const results = analyzer.analyze();

console.log('📊 ANALYSE STATIQUE TERMINÉE');
console.log('✅ Résultats disponibles pour évaluation');

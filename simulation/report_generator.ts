import { SimulationConfig, ConsensusDecision } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════════
// REPORT GENERATOR - PRISM-IND Simulation
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Generate comprehensive Markdown report
 */
export async function generateMarkdownReport(
  summary: any,
  state: any,
  economicSummary: any,
  config: SimulationConfig
): Promise<string> {
  const report = `# Simulation PRISM-IND : Traitement de l'Eau - Rapport Technique

## Executive Summary

**Problème :** Les stratégies de nettoyage CIP (Clean-in-Place) calendaires des membranes de traitement d'eau génèrent des arrêts de production non optimisés et une surconsommation de produits chimiques.

**Solution :** SOCRATE + PRISM-IND déploie un système de consensus multi-agents avec filtres socratiques (Vérité/Bonté/Utilité) pour optimiser les décisions de maintenance prédictive.

**Résultats :** Sur ${config.durationDays} jours de simulation, PRISM-IND génère **€${economicSummary.comparison.netROI.toFixed(0)} de ROI net** avec ${economicSummary.comparison.downtimeSaved.toFixed(1)}h d'arrêts évités et ${economicSummary.comparison.cipReduction} CIP en moins.

---

## Architecture du Système

\`\`\`mermaid
sequenceDiagram
    participant S as Capteurs IoT
    participant P as Pré-traitement
    participant M as Modèle MHI
    participant A1 as Agent Membrane
    participant A2 as Agent Économique  
    participant A3 as Agent Opérationnel
    participant C as Consensus Engine
    participant E as Exécution
    
    S->>P: Données capteurs (ΔP, flux, turbidité, etc.)
    P->>P: Filtrage outliers, imputations
    P->>M: Données validées
    M->>M: Calcul Membrane Health Index
    
    par Votes parallèles
        M->>A1: MHI + données contextuelles
        A1->>A1: Filtres socratiques (V/B/U)
        A1->>C: Vote + confiance + justification
    and
        M->>A2: Analyse ROI économique
        A2->>A2: Optimisation coûts/bénéfices  
        A2->>C: Vote + confiance + justification
    and
        M->>A3: Équilibrage opérationnel
        A3->>A3: Gestion risques/performance
        A3->>C: Vote + confiance + justification
    end
    
    C->>C: Résolution consensus (majorité qualifiée/unanimité)
    C->>E: Recommandation finale
    E->>E: CIP / Ajustement / Délai
    E->>S: Feedback système
\`\`\`

---

## Pipeline Décisionnel

\`\`\`mermaid
flowchart TD
    A[Acquisition Capteurs] --> B[Pré-traitement]
    B --> C[Calcul MHI]
    C --> D{MHI < Seuil Critique?}
    D -->|Oui| E[Mode Unanimité Requis]
    D -->|Non| F[Mode Majorité Qualifiée]
    
    E --> G[Agents Génèrent Votes]
    F --> G
    G --> H[Application Filtres Socratiques]
    H --> I{Consensus Atteint?}
    
    I -->|Unanimité| J[Décision Validée]
    I -->|Majorité 2/3| J
    I -->|Échec| K[Résolution par Score Pondéré]
    
    K --> J
    J --> L{Type Recommandation}
    
    L -->|CLEAN_NOW| M[Exécution CIP]
    L -->|DELAY_12H/24H| N[Surveillance Continue]
    L -->|ADJUST_SETPOINTS| O[Ajustement Paramètres]
    
    M --> P[Reset Modèle Fouling]
    N --> Q[Log Audit + Attente]
    O --> R[Optimisation Performance]
    
    P --> A
    Q --> A  
    R --> A
\`\`\`

---

## Comparaison Stratégies : Baseline vs PRISM-IND

### Métriques Opérationnelles

| Métrique | Baseline (CIP Calendaire) | PRISM-IND (Prédictif) | Δ Amélioration |
|----------|---------------------------|------------------------|----------------|
| **Nombre de CIP** | ${economicSummary.baseline.cipCount} | ${economicSummary.prismInd.cipCount} | ${economicSummary.comparison.cipReduction} (-${((economicSummary.comparison.cipReduction / economicSummary.baseline.cipCount) * 100).toFixed(1)}%) |
| **Temps d'arrêt total** | ${economicSummary.baseline.totalDowntime.toFixed(1)}h | ${economicSummary.prismInd.totalDowntime.toFixed(1)}h | ${economicSummary.comparison.downtimeSaved.toFixed(1)}h |
| **OPEX Total** | €${economicSummary.baseline.totalOpex.toFixed(0)} | €${economicSummary.prismInd.totalOpex.toFixed(0)} | €${economicSummary.comparison.opexSavings.toFixed(0)} |
| **Impact Production** | €${economicSummary.baseline.productionImpact.toFixed(0)} | €${economicSummary.prismInd.productionImpact.toFixed(0)} | €${economicSummary.comparison.productionGain.toFixed(0)} |
| **Vie Membranaire Restante** | ${economicSummary.baseline.remainingMembraneLife.toFixed(1)}% | ${economicSummary.prismInd.remainingMembraneLife.toFixed(1)}% | +${economicSummary.comparison.membraneLifeExtension.toFixed(1)}% |

### Analyse Économique Détaillée

**Coûts Évités :**
- Chimie CIP : €${(economicSummary.comparison.cipReduction * config.economics.cipChemistryCost).toFixed(0)}
- Énergie CIP : €${(economicSummary.comparison.cipReduction * config.economics.cipEnergyConsumption * config.economics.energyCost).toFixed(0)}
- Production perdue : €${economicSummary.comparison.productionGain.toFixed(0)}

**Investissement PRISM-IND :**
- Licence SaaS : €${config.economics.prismLicenseCost.toFixed(0)}/mois
- Intégration (estimée) : €10,000 (one-time)

**ROI Net : €${economicSummary.comparison.netROI.toFixed(0)}** (Période de retour : ${(10000 / (economicSummary.comparison.netROI * 12)).toFixed(1)} mois)

---

## Extraits de Logs Consensus - Décisions Typiques

${generateConsensusLogExamples(state.consensusDecisions)}

---

## Configuration Membrane Health Index (MHI)

### Pondérations Facteurs
- **Pression (ΔP)** : ${(summary.mhiWeights.pressure * 100).toFixed(1)}% - Résistance à l'encrassement
- **Flux Perméat** : ${(summary.mhiWeights.flux * 100).toFixed(1)}% - Perméabilité membranaire  
- **Turbidité** : ${(summary.mhiWeights.turbidity * 100).toFixed(1)}% - Potentiel d'encrassement
- **Température** : ${(summary.mhiWeights.temperature * 100).toFixed(1)}% - Correction viscosité
- **pH** : ${(summary.mhiWeights.pH * 100).toFixed(1)}% - Risque chimique

### Valeurs de Référence
- **Pression baseline** : ${summary.mhiReferences.baselinePressure} bar
- **Flux baseline** : ${summary.mhiReferences.baselineFlux} L/m²·h
- **Turbidité max** : ${summary.mhiReferences.maxTurbidity} NTU
- **Température optimale** : ${summary.mhiReferences.optimalTemperature}°C
- **pH optimal** : ${summary.mhiReferences.optimalPH.min} - ${summary.mhiReferences.optimalPH.max}

**Formule MHI :** 
\`MHI = clamp(1 - Σ(wi × factori), 0, 1)\`

---

## Profils Agents IA

${generateAgentProfiles(summary.agentProfiles)}

---

## Hypothèses & Limitations

### Hypothèses du Modèle
1. **Encrassement membranaire** : Dynamique exponentielle liée à turbidité et température
2. **Efficacité CIP** : Restauration complète de la perméabilité (100% de reset fouling)
3. **Corrélation MHI-Performance** : Relation linéaire entre MHI et efficacité production
4. **Agents IA** : Comportement déterministe avec seeds fixes (reproductibilité)
5. **Capteurs** : Bruit gaussien ±2-10% selon paramètre, dropouts 2%

### Limitations Identifiées
- **Modèle de fouling simplifié** : Pas de distinction fouling réversible/irréversible
- **CIP uniforme** : Durée et efficacité fixes, pas d'optimisation protocole
- **Pas de maintenance corrective** : Focus uniquement maintenance préventive
- **Économie statique** : Prix énergie/chimie constants, pas de volatilité marché

### Reproductibilité
- **Version TypeScript** : ${process.version}
- **Seed simulation** : ${config.seed}
- **Configuration** : Fichier \`types.ts\` ligne DEFAULT_CONFIG

---

## Recommandations d'Implémentation

### Phase 1 : Pilote (3 mois)
1. **Intégration capteurs** : Validation acquisition données temps réel
2. **Calibration MHI** : Ajustement pondérations sur données historiques  
3. **Tests agents** : Validation logique consensus sur scénarios connus

### Phase 2 : Déploiement (6 mois)
1. **Système hybride** : PRISM-IND en parallèle stratégie existante
2. **Machine Learning** : Apprentissage continu sur performances réelles
3. **Interface opérateur** : Dashboard supervision et override manuel

### Phase 3 : Optimisation (12 mois)
1. **Multi-sites** : Fédération consensus entre installations
2. **Maintenance prédictive avancée** : Prédiction défaillances équipements
3. **Optimisation énergétique** : Intégration prix dynamiques électricité

---

## Annexes

### A. Paramètres Économiques Utilisés
\`\`\`json
${JSON.stringify(config.economics, null, 2)}
\`\`\`

### B. Configuration Simulation
\`\`\`json
${JSON.stringify({
  durationDays: config.durationDays,
  timeStepMinutes: config.timeStepMinutes, 
  seed: config.seed,
  mhiThresholds: config.mhiThresholds,
  socraticWeights: config.socraticWeights
}, null, 2)}
\`\`\`

### C. Seuils Consensus
- **Majorité qualifiée** : 2/3 des agents
- **Unanimité sécurité** : MHI < ${config.mhiThresholds.criticalLevel}
- **Seuil critique MHI** : ${config.mhiThresholds.criticalLevel}
- **Seuil alerte MHI** : ${config.mhiThresholds.warningLevel}

---

*Rapport généré automatiquement par PRISM-IND v1.0 - ${new Date().toISOString()}*
*Confidentiel - Usage interne uniquement*`;

  return report;
}

/**
 * Generate consensus log examples
 */
function generateConsensusLogExamples(decisions: ConsensusDecision[]): string {
  const significantDecisions = decisions
    .filter(d => d.finalRecommendation === 'CLEAN_NOW' || d.consensusType === 'TIE_BREAK')
    .slice(0, 3);

  if (significantDecisions.length === 0) {
    return "*(Aucune décision significative dans cette simulation)*";
  }

  return significantDecisions.map((decision, index) => {
    const votes = decision.votes.map(vote => 
      `- **${vote.agentId}**: ${vote.recommendation} (conf: ${vote.confidence.toFixed(2)}, score: ${vote.weightedScore.toFixed(2)})  
        *${vote.justification}*`
    ).join('\n');

    return `### Décision ${index + 1} - ${decision.timestamp.toISOString()}

**Type**: ${decision.consensusType} | **Confiance**: ${decision.confidenceLevel.toFixed(2)} | **Action**: ${decision.finalRecommendation}

**Votes:**
${votes}

**Audit Trail:**
\`\`\`json
${decision.auditTrail.substring(0, 300)}...
\`\`\``;
  }).join('\n\n');
}

/**
 * Generate agent profiles
 */
function generateAgentProfiles(profiles: any[]): string {
  return profiles.map(profile => `### ${profile.name} (${profile.id})

- **Conservatisme** : ${(profile.conservatism * 100).toFixed(0)}% - Tendance interventions précoces
- **Sensibilité Santé** : ${(profile.healthSensitivity * 100).toFixed(0)}% - Focus intégrité membranaire  
- **Orientation Économique** : ${(profile.economicFocus * 100).toFixed(0)}% - Optimisation coûts/bénéfices
- **Biais Préventif** : ${(profile.preventiveBias * 100).toFixed(0)}% - Anticipation vs réactivité
- **Seed Déterministe** : ${profile.seed}

*${getAgentPersonality(profile)}*`).join('\n\n');
}

/**
 * Get agent personality description
 */
function getAgentPersonality(profile: any): string {
  if (profile.id === 'MEMBRANE_GUARDIAN') {
    return "Agent conservateur focalisé sur la préservation des membranes. Privilégie les interventions préventives pour éviter les dommages irréversibles.";
  } else if (profile.id === 'ECONOMIC_OPTIMIZER') {
    return "Agent orienté rentabilité cherchant à maximiser le ROI. Accepte des risques calculés si les bénéfices économiques sont substantiels.";
  } else if (profile.id === 'OPERATIONAL_BALANCER') {
    return "Agent équilibré recherchant le compromis optimal entre performance opérationnelle, coûts et préservation des équipements.";
  }
  return "Agent spécialisé avec logique de décision configurée.";
}

/**
 * Generate HTML report from markdown
 */
export async function generateHTMLReport(markdownContent: string): Promise<string> {
  const htmlTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PRISM-IND - Rapport Simulation Traitement Eau</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #fafafa;
        }
        
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        
        h2 {
            color: #34495e;
            margin-top: 30px;
            border-left: 4px solid #3498db;
            padding-left: 15px;
        }
        
        h3 {
            color: #2c3e50;
            margin-top: 25px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        
        pre {
            background-color: #f8f8f8;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            overflow-x: auto;
        }
        
        .mermaid {
            text-align: center;
            margin: 20px 0;
        }
        
        .executive-summary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .metrics-highlight {
            background: #e8f6f3;
            border-left: 4px solid #27ae60;
            padding: 15px;
            margin: 15px 0;
        }
        
        .warning {
            background: #fef9e7;
            border-left: 4px solid #f39c12;
            padding: 15px;
            margin: 15px 0;
        }
        
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="content"></div>
    </div>
    
    <script>
        // Initialize Mermaid
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'default',
            themeVariables: {
                primaryColor: '#3498db',
                primaryTextColor: '#2c3e50',
                primaryBorderColor: '#2980b9',
                lineColor: '#34495e'
            }
        });
        
        // Convert markdown to HTML (simplified)
        const markdownContent = \`${markdownContent.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
        
        function simpleMarkdownToHTML(md) {
            return md
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                .replace(/^\*(.*)\*/gim, '<em>$1</em>')
                .replace(/^\`\`\`mermaid([\\s\\S]*?)\`\`\`/gim, '<div class="mermaid">$1</div>')
                .replace(/^\`\`\`json([\\s\\S]*?)\`\`\`/gim, '<pre><code>$1</code></pre>')
                .replace(/^\`\`\`([\\s\\S]*?)\`\`\`/gim, '<pre><code>$1</code></pre>')
                .replace(/\`([^\`]*)\`/gim, '<code>$1</code>')
                .replace(/^\\|(.*)\\|$/gim, function(match, content) {
                    const cells = content.split('|').map(cell => cell.trim());
                    if (cells[0] === '-------' || cells[0].includes('-')) {
                        return '';
                    }
                    const cellElements = cells.map(cell => 
                        cell.includes('**') ? '<th>' + cell.replace(/\*\*/g, '') + '</th>' : '<td>' + cell + '</td>'
                    ).join('');
                    return '<tr>' + cellElements + '</tr>';
                })
                .replace(/(<tr>.*<\/tr>)/gim, function(match, content) {
                    return content.includes('<th>') ? '<table>' + content : content + (content.includes('</tr>') ? '</table>' : '');
                })
                .replace(/^---$/gim, '<hr>')
                .replace(/\\n/g, '<br>');
        }
        
        document.getElementById('content').innerHTML = simpleMarkdownToHTML(markdownContent);
        
        // Re-render Mermaid diagrams
        mermaid.init();
    </script>
</body>
</html>`;

  return htmlTemplate;
}

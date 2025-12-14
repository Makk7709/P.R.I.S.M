# Module d'Analyse Excel pour PRISM

## 📊 Vue d'Ensemble

Module complet d'analyse de fichiers Excel avec intégration IA pour PRISM. Permet l'upload, le parsing, l'analyse statistique complète et la génération d'insights intelligents.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRISM EXCEL ANALYZER                          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ExcelParser   │      │ Statistical  │      │ DataType     │
│  Service     │      │   Engine     │      │  Detector    │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
              ┌───────────────────────────────┐
              │       ExcelAnalyzer           │
              │   (Orchestrateur Principal)   │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │    ChatFileProcessor          │
              │    + FileContextManager       │
              └───────────────────────────────┘
```

## 📁 Structure des Fichiers

```
src/
├── excel/
│   ├── index.js                    # Export principal
│   ├── ExcelParserService.js       # Parsing XLSX/XLS/CSV
│   ├── StatisticalEngine.js        # Calculs statistiques
│   ├── DataTypeDetector.js         # Détection automatique des types
│   └── ExcelAnalyzer.js            # Orchestrateur avec IA
│
├── chat/
│   ├── index.js                    # Export principal
│   ├── ChatFileProcessor.js        # Traitement fichiers dans chat
│   └── FileContextManager.js       # Gestion contexte session
│
backend/
├── middleware/
│   └── fileUpload.js               # Middleware Multer
└── routes/
    └── chatUpload.js               # Routes API upload
```

## 🚀 Utilisation

### 1. Import des Modules

```javascript
import { ExcelAnalyzer } from './src/excel/index.js';
import { ChatFileProcessor } from './src/chat/index.js';
```

### 2. Analyse Simple d'un Fichier

```javascript
const analyzer = new ExcelAnalyzer();

// Analyser un fichier
const result = await analyzer.analyze(fileBuffer, {
  generateSummary: true,
  computeCorrelations: true,
  detectOutliers: true
});

console.log(result.summary);
console.log(result.sheets[0].statistics);
```

### 3. Analyse avec IA

```javascript
const result = await analyzer.analyzeWithAI(
  fileBuffer,
  'Quelles sont les tendances principales dans ces données?'
);

console.log(result.aiInsights);
console.log(result.recommendations);
```

### 4. Upload dans le Chat

```javascript
const processor = new ChatFileProcessor();

// Premier upload avec message
const result = await processor.processMessageWithFile(
  'Analyse ce fichier de ventes',
  file,
  'session-123'
);

// Questions de suivi
const followUp = await processor.processFollowUpQuestion(
  'Montre-moi la répartition par région',
  'session-123'
);
```

## 📊 Fonctionnalités Statistiques

### Statistiques Descriptives
- Moyenne, médiane, mode
- Variance, écart-type
- Quartiles (Q1, Q2, Q3)
- Skewness, Kurtosis
- Coefficient de variation

### Analyse de Distribution
- Histogrammes automatiques
- Test de normalité
- Distribution cumulative
- Identification du type de distribution

### Corrélations
- Corrélation de Pearson
- Corrélation de Spearman
- Matrice de corrélation
- Détection corrélations fortes

### Régression
- Régression linéaire
- R-squared
- Prédictions avec intervalles
- Analyse des résidus

### Analyse Temporelle
- Détection de tendances
- Moyenne mobile (simple et exponentielle)
- Taux de croissance
- Détection de saisonnalité
- Prévisions simples

### GroupBy et Agrégation
- GroupBy avec agrégations multiples
- Tableaux croisés dynamiques
- Agrégations personnalisées

### Détection d'Outliers
- Méthode IQR
- Z-score
- Z-score modifié (MAD)

## 🔌 API Endpoints

### POST /api/chat/upload
Upload d'un fichier avec analyse

**Request (multipart/form-data):**
```
file: [fichier Excel/CSV]
message: "Analyse ce fichier"
sessionId: "session-123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "📊 Analyse du fichier...",
    "aiInsights": { ... },
    "metadata": {
      "fileName": "ventes.xlsx",
      "rowCount": 1500,
      "columnCount": 8
    },
    "visualizations": [ ... ]
  }
}
```

### POST /api/chat/message
Message avec contexte fichier

**Request:**
```json
{
  "message": "Montre-moi les tendances",
  "sessionId": "session-123"
}
```

### GET /api/chat/context/:sessionId
Récupère le contexte fichier

### DELETE /api/chat/context/:sessionId
Supprime le contexte fichier

## 🛡️ Sécurité

- **Validation MIME type** + magic bytes
- **Taille maximale**: 50MB
- **Rate limiting**: 10 uploads/minute
- **Sanitization** des noms de fichiers
- **TTL du contexte**: 30 minutes

## 📝 Types de Données Détectés

| Type | Description |
|------|-------------|
| `string` | Texte |
| `integer` | Entier |
| `float` | Décimal |
| `boolean` | Booléen |
| `date` | Date |
| `datetime` | Date et heure |
| `currency` | Monnaie (€, $, £) |
| `percentage` | Pourcentage |
| `email` | Adresse email |
| `url` | URL |
| `phone` | Téléphone |
| `id` | Identifiant |
| `uuid` | UUID |
| `mixed` | Types mixtes |

## 🧪 Tests

```bash
# Exécuter les tests
npm run test:excel

# Tests en mode watch
npm run test:excel:watch

# Couverture de code
npm run test:excel:coverage
```

## 📦 Dépendances

```json
{
  "xlsx": "^0.18.x",
  "exceljs": "^4.x",
  "simple-statistics": "^7.x",
  "mathjs": "^12.x",
  "multer": "^1.x"
}
```

## 🔄 Intégration avec PRISM

Le module s'intègre naturellement avec l'architecture PRISM existante:

1. **Router vs Consensus**: L'analyse Excel passe par le **Router** (rapide) car c'est une opération de lecture. Le **Consensus** n'est activé que si le message utilisateur contient des actions critiques.

2. **TaskTypeProcessor**: L'analyse utilise le TaskType `analyse` qui active le persona analytique.

3. **Mémoire**: Le `FileContextManager` garde le fichier en mémoire pour les questions de suivi pendant 30 minutes.

## 📈 Exemple de Sortie

```json
{
  "success": true,
  "sheets": [{
    "name": "Ventes",
    "rowCount": 1500,
    "statistics": {
      "Revenue": {
        "mean": 2450.50,
        "median": 2100.00,
        "min": 150,
        "max": 15000,
        "standardDeviation": 1250.75
      }
    },
    "correlations": {
      "Price": {
        "Quantity": -0.42,
        "Revenue": 0.89
      }
    }
  }],
  "summary": {
    "totalRows": 1500,
    "keyInsights": [
      "Strong correlation between Price and Revenue (0.89)",
      "15 outliers detected in Revenue column"
    ]
  },
  "aiInsights": {
    "content": "L'analyse révèle une croissance de 15% du CA..."
  }
}
```

---

**Version**: 1.0.0  
**Date**: Décembre 2025  
**Auteur**: PRISM Team

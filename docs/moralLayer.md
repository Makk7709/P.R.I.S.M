# MoralLayer - Système d'Analyse Morale de PRISM

Le MoralLayer est un composant essentiel de PRISM qui permet d'analyser, catégoriser et filtrer les contenus de manière éthique et responsable. Il s'intègre dans le pipeline de traitement des événements de PRISM pour assurer une évolution cognitive respectueuse de la complexité humaine.

## Fonctionnalités

### 1. Analyse de Contenu

- Détection automatique des contenus inappropriés
- Catégorisation intelligente des contenus
- Système de scoring basé sur le contexte et la catégorie
- Logging détaillé des contenus bloqués ou surveillés

### 2. Catégories de Contenu

- Violence
- Amour
- Guerre
- Politique
- Haine
- Croyance
- Santé mentale
- Relations humaines
- Croyances absurdes
- Contenu émotionnel

### 3. Règles de Filtrage

#### Contenus Bloqués (🔴)

- Pornographie explicite
- Violence sadique gratuite
- Discours haineux pur

#### Contenus Surveillés (🟡)

- Croyances absurdes
- Contenus émotionnellement lourds
- Théories du complot
- Pseudoscience

#### Contenus Acceptés avec Prudence (🔵)

- Guerre (analyse)
- Politique (objectif)
- Religion (sans prosélytisme)
- Santé mentale
- Relations humaines

## Intégration

Le MoralLayer est intégré dans le pipeline de traitement des événements de PRISM :

1. Chaque événement contenant du texte est analysé par le MoralLayer
2. Les contenus bloqués sont rejetés immédiatement
3. Les contenus surveillés sont marqués et loggés
4. Les contenus acceptés sont traités normalement

## Utilisation

```javascript
const { MoralLayer } = require('./infrastructure/moralLayer');

// Création d'une instance
const moralLayer = new MoralLayer();

// Analyse d'un contenu
const result = moralLayer.analyzeContent('texte à analyser');

// Résultat
console.log(result);
// {
//   status: 'accepté' | 'surveillé' | 'bloqué',
//   score: number,
//   category: string
// }
```

## Logs et Audit

Les contenus bloqués ou surveillés sont automatiquement loggés dans :

- `/logs/moralLayerAudit/blocked.log` pour les contenus bloqués
- `/logs/moralLayerAudit/monitored.log` pour les contenus surveillés

Chaque entrée de log contient :

- Timestamp
- Texte (tronqué à 500 caractères)
- Catégorie
- Statut

## Évolution

Le MoralLayer est conçu pour évoluer avec PRISM :

- Les règles de filtrage peuvent être ajustées
- De nouvelles catégories peuvent être ajoutées
- Le système de scoring peut être affiné
- Les logs permettent une analyse continue des décisions

## Contraintes Éthiques

1. Aucune censure brutale sans analyse
2. Respect de la diversité humaine
3. Archivage systématique des contenus bloqués
4. Cohérence avec la vocation évolutive de PRISM
5. Transparence des décisions de filtrage

## Contribution

Les contributions au MoralLayer doivent respecter :

- Les principes éthiques de PRISM
- La documentation existante
- Les tests unitaires
- Les standards de code

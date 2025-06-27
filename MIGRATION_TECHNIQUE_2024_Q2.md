# PRISM — Rapport de Migration Technique (Q2 2024)

Ce document détaille deux améliorations fondamentales de l'architecture de PRISM visant à renforcer sa robustesse, sa performance et sa maintenabilité à long terme.

---

## 1. Couche de Persistance Robuste (SQLite)

### 1.1. Problème : Fragilité du Stockage par Fichiers JSON

La version initiale de PRISM reposait sur des fichiers JSON pour la persistance de son état. Cette approche, bien que simple, présentait des risques inacceptables pour un système de production :
- **Risque de Corruption :** Une écriture interrompue pouvait corrompre un fichier entier, entraînant une perte de données critiques.
- **Problèmes de Concurrence :** Les accès simultanés en lecture/écriture étaient une source de complexité et de bugs.
- **Performance Dégradée :** La nécessité de traiter les fichiers dans leur intégralité pour chaque opération était un goulot d'étranglement.

### 1.2. Solution : Migration vers une Base de Données Transactionnelle SQLite

La couche de persistance a été entièrement réécrite pour utiliser une base de données **SQLite**, orchestrée par la bibliothèque haute performance `better-sqlite3`.

**Avantages Stratégiques :**
- **Intégrité Garantie (ACID) :** Les transactions atomiques éliminent tout risque de corruption de données. La mémoire de PRISM est désormais infaillible.
- **Performance Accrue :** L'accès direct et indexé aux données est mesuré en microsecondes, contre plusieurs millisecondes auparavant.
- **Scalabilité Massive :** Le système peut désormais gérer des millions d'enregistrements sans dégradation des performances.
- **Testabilité Parfaite :** L'architecture permet d'instancier des bases de données de test dédiées, garantissant des tests d'intégration 100% isolés et fiables.

---

## 2. Modernisation de la Suite de Tests (Migration vers Vitest)

### 2.1. Problème : Blocage de l'Environnement de Test Jest

L'environnement de test historique (Jest) était en conflit insoluble avec l'architecture moderne du projet (Modules ES Natifs). Ce conflit a provoqué une "dette technique" massive, rendant la suite de tests **totalement inutilisable** et bloquant toute validation de nouvelles fonctionnalités.

### 2.2. Solution : Migration Radicale vers Vitest

Une décision stratégique a été prise : abandonner Jest et **migrer vers Vitest**, un framework de test de nouvelle génération conçu pour les environnements modernes.

**Résultats :**
- **Déblocage Immédiat :** L'environnement de test est de nouveau fonctionnel, rapide et fiable.
- **Validation Complète :** La migration vers SQLite a pu être validée par des tests d'intégration qui passent à 100%.
- **Couverture de Code Assurée :** Nous avons une couverture de 100% sur la nouvelle couche de persistance, garantissant sa qualité.
- **Fondation Saine :** Le projet dispose d'une base de test solide pour l'avenir.

### 2.3. Lancer les Tests

La nouvelle suite de tests est centralisée dans le dossier `/tests`.

| Commande | Description |
|---|---|
| `npm test` | Exécute tous les tests une seule fois. |
| `npm test:watch` | Lance les tests en mode interactif. |
| `npm run coverage` | Exécute les tests et génère un rapport de couverture dans `/coverage`. | 
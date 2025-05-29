# Plan de Refactorisation PRISM - Jarvis Core

## Objectifs
- Réduire le nombre de fichiers de ~60 à ≤30
- Réduire la latence E2E à <250ms
- Améliorer la CI (<3min) avec coverage & kill-rate ≥90%

## Phase 1: Analyse des Dépendances ✅
- [x] Installation de madge
- [x] Génération du graphe des imports
- [x] Identification des cycles de dépendances

## Phase 2: Regroupement des Modules
### Core Kernel
- [x] `core/KernelBus.js`
  - [x] Fusion de `prismBus.js`
  - [x] Fusion de `prismEvents.js`
  - [x] Fusion de `prismErrorHandler.js`
  - [x] Mise à jour des imports dans tous les fichiers dépendants

- [x] `core/Planner.js`
  - [x] Fusion de `prismSentinel.js`
  - [x] Fusion de `prismStrategyExecutor.js`
  - [x] Mise à jour des imports dans tous les fichiers dépendants

- [ ] `core/Resilience.js`
  - [ ] Fusion de `prismSelfHeal.js`
  - [ ] Fusion de `prismFailsafe.js`
  - [ ] Fusion de `prismEmergencyProtocol.js`

### Plugins
- [ ] `plugins/awareness/`
  - [ ] `prismAwareness.js`
  - [ ] `prismHyperConsciousness.js`

- [ ] `plugins/memory/`
  - [ ] `prismPersistence.js`
  - [ ] `prismStateStore.js`

- [ ] `plugins/ui/`
  - [ ] `prismUI.js`
  - [ ] `prismVision.js`

### Legacy (à migrer)
- [ ] `prismLegacyCore.js`
- [ ] `prismLegacy.js`

## Phase 3: Plan de Migration
1. [x] Création des nouveaux dossiers
2. [x] Migration des fichiers avec `git mv`
3. [x] Mise à jour des imports
4. [ ] Tests unitaires

## Phase 4: Mise à Jour de la Qualité
- [ ] Mise à jour de `jest.config.js`
- [ ] Mise à jour de `eslintrc.json`
- [ ] Mise à jour de `package.json`
- [ ] Ajout des scripts de test et benchmark

## Phase 5: CI/CD
- [ ] Configuration des GitHub Actions
- [ ] Tests de performance
- [ ] Vérification de la couverture

## Métriques de Succès
- Nombre de fichiers ≤30
- Latence E2E <250ms
- CI <3min
- Coverage ≥90%
- Kill-rate ≥90%

## Prochaines Étapes
1. ✅ Fusionner `prismSentinel.js` et `prismStrategyExecutor.js` dans `core/Planner.js`
2. Fusionner les modules de résilience dans `core/Resilience.js`
3. Migrer les plugins dans leurs dossiers respectifs
4. Mettre à jour les tests unitaires
5. Configurer la CI/CD 
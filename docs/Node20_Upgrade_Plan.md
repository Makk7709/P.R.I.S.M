# 🚀 Plan d'Upgrade Node 18→20 (Contrôlé)

## 📋 Contexte
- **Runtime actuel**: Node.js v18.20.8
- **Cible**: Node.js v20.x (LTS)
- **Contrainte**: Aucun impact runtime immédiat
- **Déclencheur**: StrykerJS nécessite Node ≥20.0.0 pour les tests de mutation

## 🎯 Objectifs
1. **Mutation Testing**: Activer StrykerJS pour ConsensusManager (objectif ≥85%)
2. **Performance**: Maintenir/améliorer les métriques de consensus
3. **Compatibilité**: Assurer la compatibilité des adapters (OpenAI, Anthropic, Perplexity)
4. **Sécurité**: Audit des dépendances et vulnérabilités

## 📊 Baseline Performance (Node 18)
- **ConsensusManager**: 100% coverage, 25 tests
- **Latence p50**: ~100ms
- **Latence p95**: ~150ms
- **Adapters**: 97.19% coverage, 100 tests

## 🔍 Checklist d'Audit

### 3.1 Audit Dépendances
- [ ] Vérifier `engines` dans package.json
- [ ] Analyser changelogs des dépendances critiques
- [ ] Identifier peer dependencies incompatibles
- [ ] Tester avec `npm audit` sur Node 20

### 3.2 Benchmark Performance
- [ ] Installer Node 20 dans environnement isolé
- [ ] Benchmark consensus (p50/p95) sous charge simulée
- [ ] Comparer métriques adapters (latence, timeouts)
- [ ] Mesurer impact mémoire/CPU

### 3.3 Tests E2E Adapters
- [ ] Tester OpenAIAdapter avec Node 20
- [ ] Tester AnthropicAdapter avec Node 20  
- [ ] Tester PerplexityAdapter avec Node 20
- [ ] Valider circuit breaker et retry logic

### 3.4 Migration CI/CD
- [ ] Mettre à jour GitHub Actions (node-version: 20)
- [ ] Configurer StrykerJS pour mutation testing
- [ ] Tester pipeline complet (tests, coverage, mutation)
- [ ] Valider artefacts et rapports

## 🗓️ Planification
- **Phase 1** (J+1): Audit et benchmark
- **Phase 2** (J+3): Migration CI/CD et StrykerJS
- **Phase 3** (J+5): Tests E2E et validation
- **Phase 4** (J+7): Déploiement contrôlé

## 🚨 Fenêtre de Déploiement
- **Fenêtre**: Maintenance planifiée (weekend)
- **Rollback**: Immédiat via revert commit
- **Monitoring**: Métriques en temps réel
- **Alertes**: Seuils de performance

## 📈 Métriques de Succès
- [ ] Mutation score ConsensusManager ≥85%
- [ ] Pas de régression performance (>5%)
- [ ] Tous les tests E2E passent
- [ ] CI/CD pipeline stable

## 🔗 Liens
- [ConsensusManager QA](ConsensusManager_QA.md)
- [Adapters QA](QA_Adapters.md)
- [QA Summary](QA_Summary.md)

---
**Assigné à**: @Makk7709  
**Labels**: tech, upgrade, node, mutation-testing  
**Milestone**: v2.0.2  
**Status**: 📋 Planned

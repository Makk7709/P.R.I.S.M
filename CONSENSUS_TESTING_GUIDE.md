# 🎯 Guide de Test du Système de Consensus PRISM

Ce guide explique comment tester le système de synchronisation et de consensus de PRISM avec des scénarios réalistes.

## 🚀 Démarrage Rapide

### 1. Test Rapide des Composants
```bash
# Vérifier que tous les composants de base fonctionnent
node quick-test.js
```

### 2. Tests Complets
```bash
# Exécuter tous les scénarios de test
node run-consensus-tests.js

# Ou exécuter un scénario spécifique
node run-consensus-tests.js consensus
node run-consensus-tests.js priority
node run-consensus-tests.js timeout
node run-consensus-tests.js security
node run-consensus-tests.js performance
```

## 📋 Scénarios de Test Disponibles

### 🔥 Scénario 1: Consensus Critique
**Objectif**: Tester le processus de consensus pour une modification système critique

**Ce qui est testé**:
- Création de proposition avec `ConsensusManager`
- Votes automatiques des 3 IA providers (GPT-4, Claude-3, Perplexity)
- Règle de majorité 2/3
- Intégration avec `KernelBus`
- Métriques de consensus

**Résultat attendu**:
- ✅ Proposition créée avec succès
- 🤖 Votes automatiques des IA dans les 300ms
- 🎯 Consensus atteint (APPROVED/REJECTED) selon les critères
- 📊 Métriques mises à jour correctement

### ⚡ Scénario 2: File de Priorité Sous Charge
**Objectif**: Vérifier que les événements sont traités dans l'ordre de priorité

**Ce qui est testé**:
- Ordre de traitement CRITICAL > HIGH > NORMAL
- FIFO maintenu au sein de chaque priorité
- Performance sous charge
- Métriques de la `PriorityQueue`

**Résultat attendu**:
- ✅ Événements critiques traités en premier
- 📊 Ordre de priorité respecté
- ⚡ Performance acceptable (< 50ms par événement)

### ⏰ Scénario 3: Timeout et Escalade
**Objectif**: Tester le timeout de consensus et l'escalade vers `TrustContext`

**Ce qui est testé**:
- Timeout strict de 1 seconde
- Escalade automatique vers `TrustContext`
- Demande d'approbation humaine
- Métriques de timeout

**Résultat attendu**:
- ⏰ Timeout déclenché après 1 seconde
- 🔐 `TrustContext` appelé pour intervention humaine
- 📊 Métriques de timeout mises à jour

### 🛡️ Scénario 4: Sécurité et Blocage
**Objectif**: Tester le système de sécurité multicouche

**Ce qui est testé**:
- Détection d'événements critiques
- Blocage d'événements suspects
- Vérification `TrustContext`
- Métriques de sécurité

**Résultat attendu**:
- 🚫 Événements dangereux bloqués
- ✅ Événements normaux autorisés
- 📊 Métriques de sécurité précises

### 🚀 Scénario 5: Performance et Throughput
**Objectif**: Mesurer les performances du système sous charge

**Ce qui est testé**:
- Latence par type d'événement
- Throughput (événements/seconde)
- Performance du consensus sous charge
- Métriques globales

**Résultat attendu**:
- ⚡ Latence < 50ms pour événements normaux
- 📈 Throughput > 50 événements/seconde
- 🔒 Consensus fonctionnel sous charge

## 📊 Métriques Surveillées

### Consensus Manager
- `totalProposals`: Nombre total de propositions
- `approvedProposals`: Propositions approuvées
- `rejectedProposals`: Propositions rejetées
- `timeoutProposals`: Propositions en timeout
- `consensusSuccessRate`: Taux de succès du consensus
- `averageDecisionTime`: Temps moyen de décision

### KernelBus
- `publishedEvents`: Événements publiés
- `failedEvents`: Événements échoués
- `averageLatency`: Latence moyenne
- `queueLength`: Taille de la file d'attente
- `consensusRequests`: Demandes de consensus
- `blockedEvents`: Événements bloqués

### PriorityQueue
- `totalEnqueued`: Total d'éléments ajoutés
- `totalDequeued`: Total d'éléments traités
- `criticalEvents`: Événements critiques
- `averageWaitTime`: Temps d'attente moyen
- `maxWaitTime`: Temps d'attente maximum

## 🎯 Critères de Succès

### ✅ Tests Réussis Si:
1. **Consensus**: Majorité 2/3 respectée, timeout < 1s
2. **Priorité**: Ordre CRITICAL > HIGH > NORMAL respecté
3. **Sécurité**: Événements dangereux bloqués
4. **Performance**: Latence < 50ms, throughput > 50 evt/s
5. **Intégration**: Tous les composants communiquent correctement

### ❌ Tests Échoués Si:
- Consensus ne respecte pas la règle 2/3
- Ordre de priorité incorrect
- Timeout dépassé sans escalade
- Événements dangereux non bloqués
- Performance en dessous des seuils

## 🔧 Dépannage

### Problèmes Courants

#### 1. Erreur d'Initialisation
```
❌ Initialization failed: ConsensusManager not initialized
```
**Solution**: Vérifier que `TrustContext` est disponible et que les dépendances sont installées.

#### 2. Timeout de Consensus
```
⏰ Consensus timeout triggered
```
**Solution**: Normal pour le scénario 3. Vérifier que l'escalade `TrustContext` fonctionne.

#### 3. Ordre de Priorité Incorrect
```
🎯 Priority order correct: ❌
```
**Solution**: Vérifier l'implémentation de `PriorityQueue` et la logique de comparaison.

#### 4. Performance Insuffisante
```
📈 Throughput: 25.5 events/second
```
**Solution**: Optimiser le traitement des événements ou ajuster les seuils.

### Logs de Debug

Pour plus de détails, activer les logs de debug :
```bash
DEBUG=prism:* node run-consensus-tests.js
```

## 📈 Interprétation des Résultats

### Rapport Final Exemple
```
📋 FINAL TEST REPORT
================================================================================
⏱️  Total execution time: 2847ms
🎯 Scenarios passed: 5/5
📊 Success rate: 100.0%

📈 SCENARIO DETAILS:
   1. ✅ Critical System Modification (456ms)
   2. ✅ Priority Queue Load Test (234ms)
   3. ✅ Consensus Timeout Test (123ms)
   4. ✅ Security Event Blocking (567ms)
   5. ✅ Performance Test (1467ms)

🔒 CONSENSUS METRICS:
   Total proposals: 8
   Success rate: 87.5%
   Average decision time: 234.56ms

⚡ KERNELBUS METRICS:
   Published events: 127
   Failed events: 2
   Average latency: 12.34ms
```

### Analyse des Métriques

- **Success rate 100%**: Tous les scénarios ont réussi
- **Consensus success rate 87.5%**: 7/8 propositions ont abouti (normal)
- **Average decision time 234ms**: Bien en dessous du timeout de 1s
- **Average latency 12.34ms**: Excellente performance

## 🚀 Prochaines Étapes

Après des tests réussis :

1. **Intégration Continue**: Ajouter ces tests à votre pipeline CI/CD
2. **Monitoring Production**: Utiliser les métriques en production
3. **Optimisation**: Ajuster les seuils selon vos besoins
4. **Extension**: Ajouter de nouveaux scénarios spécifiques

## 📞 Support

En cas de problème :
1. Vérifier les logs de debug
2. Consulter la documentation des composants
3. Tester les composants individuellement avec `quick-test.js`
4. Vérifier la configuration de sécurité dans `config/security.js` 
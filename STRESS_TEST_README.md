# 🎯 PRISM Stress Test & Monitoring System

## Vue d'ensemble

Ce système complet de stress test et monitoring pour PRISM permet de valider la stabilité du système sous très forte charge et de générer des rapports détaillés pour la validation de déploiement.

## 🏗️ Architecture

```
PRISM Stress Test System
├── 🚀 Application PRISM (Node.js 18)
│   ├── KernelBus (Event Processing)
│   ├── ConsensusManager (Decision Making)
│   └── PrismVitals (Monitoring + Prometheus Export)
├── 📊 Prometheus (Metrics Collection)
├── 📈 Grafana (Visualization)
└── 🔥 Stress Test Driver (Load Generation)
```

## 📋 Composants

### 1. Stress Test Driver (`tests/load/stressDriver.js`)
- Génère 60 000 événements mixtes
- Répartition : 1 000 CRITICAL/s, 3 000 HIGH/s, 6 000 NORMAL/s
- Mesure latence, consensus, et fiabilité
- Génère des rapports JSON détaillés

### 2. Prometheus Exporter (`prismVitals.js`)
- Endpoint `/metrics` sur port 9090
- Métriques temps réel : latence, consensus, mémoire, CPU
- Compatible format Prometheus standard

### 3. Monitoring Stack
- **Prometheus** : Collecte et stockage des métriques
- **Grafana** : Dashboards temps réel et visualisation
- **Docker Compose** : Orchestration des services

### 4. Générateur de Rapport (`generate-control-prompt.js`)
- Analyse automatique des résultats
- Validation des seuils critiques
- Génération du prompt de contrôle final

## 🚀 Démarrage Rapide

### Prérequis
- Docker & Docker Compose
- Node.js 18+
- 2GB RAM disponible
- Ports 3000, 3001, 9090, 9091 libres

### Lancement Automatique
```bash
# Lancer le pipeline complet
./run-stress-test.sh
```

### Lancement Manuel
```bash
# 1. Démarrer les services
docker-compose -f docker-compose-stress.yml up --build -d

# 2. Attendre que les services soient prêts
curl http://localhost:9090/health
curl http://localhost:9091/-/ready
curl http://localhost:3001/api/health

# 3. Lancer le stress test
docker exec prism-stress-test node tests/load/stressDriver.js

# 4. Générer le rapport de contrôle
node generate-control-prompt.js
```

## 📊 URLs d'Accès

| Service | URL | Credentials |
|---------|-----|-------------|
| PRISM Metrics | http://localhost:9090/metrics | - |
| PRISM Health | http://localhost:9090/health | - |
| Prometheus | http://localhost:9091 | - |
| Grafana | http://localhost:3001 | admin/prism123 |

## 🎯 Objectifs de Performance

### Seuils Critiques
- **Latence moyenne** : ≤ 40ms
- **Consensus** : ≥ 99.9% de succès
- **Événements perdus** : 0
- **Utilisation mémoire** : < 2GB
- **Durée de test** : ≤ 15 minutes

### Métriques Surveillées
- `prism_events_total` - Nombre total d'événements
- `prism_latency_seconds` - Latence moyenne
- `prism_consensus_success_rate` - Taux de succès consensus
- `prism_memory_usage_bytes` - Utilisation mémoire
- `prism_queue_size` - Taille de la queue d'événements

## 📈 Dashboard Grafana

Le dashboard inclut :
- **Event Processing Rate** - Débit en temps réel
- **Average Latency** - Latence avec seuils
- **Consensus Success Rate** - Taux de consensus
- **Memory Usage** - Utilisation mémoire
- **System Resources Timeline** - Évolution des ressources
- **Consensus Metrics** - Détail des décisions

## 📄 Rapports Générés

### 1. `reports/stress_test_results.json`
```json
{
  "testConfiguration": { ... },
  "testResults": {
    "totalEvents": 60000,
    "successfulEvents": 59995,
    "failedEvents": 5,
    "latencies": [...],
    "consensusMetrics": { ... }
  },
  "qualityMetrics": {
    "averageLatencyMs": 35.2,
    "p95LatencyMs": 89.1,
    "p99LatencyMs": 156.7,
    "consensusSuccessRate": 0.9998,
    "eventLossCount": 0
  }
}
```

### 2. `reports/control_prompt_stress.md`
Prompt de contrôle final avec :
- ✅ Validation des seuils
- 📊 Analyse de performance
- 🎯 Statut de déploiement
- 📋 Actions recommandées

### 3. `reports/graphs/`
- Captures d'écran des dashboards
- Graphiques de performance
- Métriques visuelles

## 🔧 Configuration

### Variables d'Environnement
```bash
NODE_ENV=stress-test
PROMETHEUS_PORT=9090
LOG_LEVEL=info
```

### Paramètres du Test
```javascript
// tests/load/stressDriver.js
config: {
  totalEvents: 60000,
  criticalEventsPerSecond: 1000,
  highEventsPerSecond: 3000,
  normalEventsPerSecond: 6000,
  testDurationSeconds: 10
}
```

## 🛠️ Personnalisation

### Ajouter des Métriques
```javascript
// Dans prismVitals.js
this.prometheusMetrics.custom_metric = 0;

// Dans generatePrometheusMetrics()
# HELP custom_metric Description
# TYPE custom_metric gauge
custom_metric ${this.prometheusMetrics.custom_metric} ${timestamp}
```

### Modifier les Seuils
```javascript
// Dans generate-control-prompt.js
const targets = {
  averageLatency: 40,  // ms
  p95Latency: 100,     // ms
  consensusRate: 0.999 // 99.9%
};
```

## 🚨 Dépannage

### Problèmes Courants

#### Services ne démarrent pas
```bash
# Vérifier les ports
netstat -tulpn | grep -E ':(3000|3001|9090|9091)'

# Nettoyer les conteneurs
docker-compose -f docker-compose-stress.yml down --volumes
docker system prune -f
```

#### Métriques non disponibles
```bash
# Vérifier l'endpoint
curl http://localhost:9090/metrics

# Vérifier les logs
docker logs prism-stress-test
```

#### Grafana ne se connecte pas
```bash
# Vérifier Prometheus
curl http://localhost:9091/targets

# Redémarrer Grafana
docker restart grafana-stress
```

### Logs Utiles
```bash
# PRISM Application
docker logs prism-stress-test

# Prometheus
docker logs prometheus-stress

# Grafana
docker logs grafana-stress
```

## 📊 Interprétation des Résultats

### Statuts de Déploiement

#### 🟢 READY_FOR_PILOT
- Tous les seuils critiques respectés
- Système stable et performant
- Prêt pour déploiement pilote

#### 🟡 NEEDS_OPTIMIZATION
- Seuils partiellement respectés
- Optimisations requises
- Re-test nécessaire

#### 🔴 REQUIRES_MAJOR_FIXES
- Seuils critiques non respectés
- Corrections majeures nécessaires
- Architecture à revoir

### Métriques Clés

| Métrique | Excellent | Bon | Acceptable | Critique |
|----------|-----------|-----|------------|----------|
| Latence moyenne | < 20ms | < 40ms | < 100ms | > 100ms |
| Consensus | > 99.9% | > 99% | > 95% | < 95% |
| Événements perdus | 0 | 0 | < 10 | > 10 |
| Utilisation mémoire | < 1GB | < 1.5GB | < 2GB | > 2GB |

## 🔄 Workflow de Validation

1. **Préparation**
   - Vérifier les prérequis
   - Nettoyer l'environnement
   - Configurer les paramètres

2. **Exécution**
   - Lancer les services
   - Démarrer le stress test
   - Surveiller en temps réel

3. **Analyse**
   - Collecter les métriques
   - Générer les rapports
   - Valider les seuils

4. **Décision**
   - Analyser le prompt de contrôle
   - Déterminer les actions
   - Planifier le déploiement

## 🧹 Nettoyage

```bash
# Arrêter tous les services
docker-compose -f docker-compose-stress.yml down --volumes

# Nettoyer les images
docker rmi $(docker images -q prism-stress*)

# Supprimer les rapports (optionnel)
rm -rf reports/
```

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs des conteneurs
2. Consulter la section dépannage
3. Analyser les métriques Prometheus
4. Examiner les dashboards Grafana

---

**Version** : 1.0.0  
**Dernière mise à jour** : $(date)  
**Compatibilité** : Node.js 18+, Docker 20+ 
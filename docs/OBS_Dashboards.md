# 📊 PRISM Observability Dashboards

## 🎯 Vue d'ensemble

Dashboards d'observabilité pour le monitoring en temps réel des composants critiques de PRISM, avec focus sur le ConsensusManager et les adapters externes.

## 📈 Dashboards Fournis

### 1. Consensus Performance Dashboard
**Objectif**: Monitoring des métriques de consensus en temps réel

#### Panels Principaux
- **Decision Latency (p50/p95)**: Latence des décisions de consensus
- **No Consensus Rate**: Taux d'échec de consensus
- **Provider Timeout Total**: Nombre total de timeouts par provider
- **Quorum Success Rate**: Taux de succès du quorum 2/3

#### Seuils d'Alertes
- **Latency p95 > 500ms**: 🚨 CRITICAL
- **No Consensus Rate > 20%**: 🚨 CRITICAL  
- **Provider Timeouts > 5/min**: ⚠️ WARNING
- **Quorum Success < 80%**: ⚠️ WARNING

### 2. Adapters Health Dashboard
**Objectif**: Monitoring de la santé des adapters externes

#### Panels Principaux
- **OpenAI Adapter**: Latence, taux d'erreur, circuit breaker status
- **Anthropic Adapter**: Latence, taux d'erreur, circuit breaker status
- **Perplexity Adapter**: Latence, taux d'erreur, circuit breaker status
- **Cross-Adapter Consistency**: Cohérence entre adapters

#### Seuils d'Alertes
- **Adapter Latency > 300ms**: 🚨 CRITICAL
- **Error Rate > 10%**: 🚨 CRITICAL
- **Circuit Breaker Open**: ⚠️ WARNING
- **API Key Issues**: 🚨 CRITICAL

### 3. System Health Dashboard
**Objectif**: Vue d'ensemble de la santé système

#### Panels Principaux
- **Uptime**: Disponibilité du système
- **Memory Usage**: Consommation mémoire
- **CPU Usage**: Utilisation CPU
- **Network I/O**: Trafic réseau

#### Seuils d'Alertes
- **Uptime < 99.9%**: 🚨 CRITICAL
- **Memory > 80%**: ⚠️ WARNING
- **CPU > 90%**: 🚨 CRITICAL
- **Network Errors > 1%**: ⚠️ WARNING

## 🔧 Configuration Grafana

### Variables Dashboard
```json
{
  "variables": [
    {
      "name": "environment",
      "type": "custom",
      "options": ["production", "staging", "development"]
    },
    {
      "name": "time_range",
      "type": "interval",
      "options": ["5m", "15m", "1h", "6h", "24h"]
    }
  ]
}
```

### Datasources
- **Prometheus**: Métriques système et application
- **Loki**: Logs structurés
- **Jaeger**: Traces distribuées

## 📊 Métriques Clés

### ConsensusManager Metrics
```prometheus
# Latence des décisions
prism_consensus_decision_latency_ms{quantile="0.5"}
prism_consensus_decision_latency_ms{quantile="0.95"}

# Taux de consensus
prism_consensus_no_consensus_rate

# Timeouts providers
prism_consensus_provider_timeout_total{provider="openai|anthropic|perplexity"}

# Quorum success
prism_consensus_quorum_success_rate
```

### Adapters Metrics
```prometheus
# Latence par adapter
prism_adapter_latency_ms{adapter="openai|anthropic|perplexity"}

# Taux d'erreur
prism_adapter_error_rate{adapter="openai|anthropic|perplexity"}

# Circuit breaker status
prism_adapter_circuit_breaker_open{adapter="openai|anthropic|perplexity"}

# Retry attempts
prism_adapter_retry_total{adapter="openai|anthropic|perplexic"}
```

## 🚨 Procédure de Corrélation Incident

### 1. Détection d'Anomalie
1. **Dashboard Alert**: Notification automatique via Grafana
2. **Log Analysis**: Recherche dans Loki pour contexte
3. **Trace Investigation**: Analyse des traces Jaeger

### 2. Diagnostic Rapide
```bash
# Vérifier métriques consensus
curl -s http://prometheus:9090/api/v1/query?query=prism_consensus_no_consensus_rate

# Analyser logs récents
curl -s http://loki:3100/loki/api/v1/query_range \
  --data-urlencode 'query={service="prism-consensus"}' \
  --data-urlencode 'start=1h'

# Vérifier traces
curl -s http://jaeger:16686/api/traces?service=prism-consensus
```

### 3. Actions Correctives
- **High Latency**: Vérifier circuit breakers, scaling
- **No Consensus**: Analyser votes, timeout configuration
- **Adapter Errors**: Vérifier API keys, quotas
- **System Issues**: Scaling, resource allocation

## 📁 Exports Dashboard

### JSON Exports Disponibles
- `consensus-performance-dashboard.json`
- `adapters-health-dashboard.json`  
- `system-health-dashboard.json`

### Localisation
```
observability/
├── dashboards/
│   ├── consensus-performance-dashboard.json
│   ├── adapters-health-dashboard.json
│   └── system-health-dashboard.json
├── alerts/
│   ├── consensus-alerts.yml
│   └── adapters-alerts.yml
└── README.md
```

## 🔗 Liens Utiles
- [Grafana Instance](http://grafana.prism.local)
- [Prometheus Metrics](http://prometheus.prism.local)
- [Loki Logs](http://loki.prism.local)
- [Jaeger Traces](http://jaeger.prism.local)

---
**Maintenu par**: Astraea - QA/SecOps & Release Orchestrator  
**Dernière mise à jour**: 2025-01-27T20:40:00Z

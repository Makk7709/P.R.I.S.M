# 📊 PRISM Observability

## 🎯 Vue d'ensemble

Ce répertoire contient tous les artefacts d'observabilité pour PRISM, incluant les dashboards Grafana, les règles d'alerte, et la configuration des métriques.

## 📁 Structure

```
observability/
├── dashboards/           # Dashboards Grafana (JSON)
│   ├── consensus-performance-dashboard.json
│   ├── adapters-health-dashboard.json
│   └── system-health-dashboard.json
├── alerts/              # Règles d'alerte Prometheus
│   ├── consensus-alerts.yml
│   └── adapters-alerts.yml
└── README.md           # Ce fichier
```

## 🚀 Déploiement

### Grafana
```bash
# Importer les dashboards
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -d @dashboards/consensus-performance-dashboard.json \
  http://grafana:3000/api/dashboards/db
```

### Prometheus
```bash
# Appliquer les règles d'alerte
kubectl apply -f alerts/
```

## 📊 Métriques Disponibles

### Consensus
- `prism_consensus_decision_latency_ms`
- `prism_consensus_no_consensus_rate`
- `prism_consensus_provider_timeout_total`
- `prism_consensus_quorum_success_rate`

### Adapters
- `prism_adapter_latency_ms`
- `prism_adapter_error_rate`
- `prism_adapter_circuit_breaker_open`
- `prism_adapter_retry_total`

### Système
- `prism_system_uptime_percent`
- `prism_system_memory_usage_percent`
- `prism_system_cpu_usage_percent`
- `prism_system_network_bytes_total`

## 🔗 Liens Utiles
- [Documentation Dashboards](../docs/OBS_Dashboards.md)
- [Grafana Instance](http://grafana.prism.local)
- [Prometheus Metrics](http://prometheus.prism.local)

---
**Maintenu par**: Astraea - QA/SecOps & Release Orchestrator

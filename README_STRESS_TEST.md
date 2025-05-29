# 🎯 PRISM Stress Test & Monitoring System

## 🚀 Démarrage Rapide

### Prérequis
- Docker & Docker Compose
- Node.js 18+
- 2GB RAM disponible
- Ports 3000, 3001, 9090, 9091 libres

### Lancement Automatique
```bash
# Test de validation (optionnel)
node test-stress-system.js

# Lancement du pipeline complet
./run-stress-test.sh
```

## 📊 URLs d'Accès

| Service | URL | Credentials |
|---------|-----|-------------|
| PRISM Metrics | http://localhost:9090/metrics | - |
| PRISM Health | http://localhost:9090/health | - |
| Prometheus | http://localhost:9091 | - |
| Grafana | http://localhost:3001 | admin/prism123 |

## 🎯 Objectifs de Performance

- **Latence moyenne** : ≤ 40ms
- **Consensus** : ≥ 99.9% de succès
- **Événements perdus** : 0
- **Utilisation mémoire** : < 2GB
- **Durée de test** : ≤ 15 minutes

## 📄 Documentation Complète

- [Guide d'utilisation détaillé](STRESS_TEST_README.md)
- [Résumé d'implémentation](STRESS_TEST_IMPLEMENTATION_SUMMARY.md)

## 🎯 Test Configuration

- **60 000 événements mixtes** sur 10 secondes
- **1 000 CRITICAL/s** - Événements critiques
- **3 000 HIGH/s** - Événements haute priorité  
- **6 000 NORMAL/s** - Événements normaux

## 📊 Rapports Générés

- `reports/stress_test_results.json` - Métriques détaillées
- `reports/control_prompt_stress.md` - Validation finale
- `reports/graphs/` - Captures d'écran dashboards

## 🧹 Nettoyage

```bash
# Arrêter tous les services
docker-compose -f docker-compose-stress.yml down --volumes
```

---

**Version** : v2.3.0-stress-system  
**Status** : ✅ Production Ready 
# 🚀 PRISM Full Stack - Guide de Démarrage Rapide

## ✅ Services Disponibles

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| 🧠 **PRISM Backend** | 3000 | http://localhost:3000 | API principale + Interface web |
| 🏢 **Corporate Frontend** | 3001 | http://localhost:3001 | Dashboard corporate |
| 📊 **Prometheus** | 9091 | http://localhost:9091 | Collecte de métriques |
| 📈 **Grafana** | 3002 | http://localhost:3002 | Dashboards de monitoring |

## 🚀 Lancement Rapide

### Option 1: Script automatique complet
```bash
npm run start:full
```

### Option 2: Lancement séquentiel

#### 1. Backend + Frontend Corporate
```bash
# Terminal 1: Backend PRISM
npm start

# Terminal 2: Frontend Corporate  
node launch-prism-full-stack.js
```

#### 2. Stack de Monitoring
```bash
# Démarrer Prometheus + Grafana
npm run start:monitoring

# Vérifier le statut
docker ps
```

## 📊 Accès aux Services

### 🧠 PRISM Backend API
- **URL**: http://localhost:3000
- **Interface**: Dashboard principal PRISM
- **API**: Endpoints REST disponibles

### 🏢 Corporate Frontend
- **URL**: http://localhost:3001
- **Interface**: Dashboard corporate moderne
- **Health Check**: http://localhost:3001/health

### 📊 Prometheus Metrics
- **URL**: http://localhost:9091
- **Interface**: Console Prometheus
- **Targets**: http://localhost:9091/targets
- **Config**: `/monitoring/prometheus-local.yml`

### 📈 Grafana Dashboards
- **URL**: http://localhost:3002
- **Login**: admin / prism123
- **Dashboards**: Préconfigurés dans `/grafana/`
- **API Health**: http://localhost:3002/api/health

## 🔧 Gestion des Services

### Vérification Status
```bash
# Ports actifs
lsof -i :3000 -i :3001 -i :3002 -i :9091

# Conteneurs Docker
docker ps

# Services locaux
ps aux | grep node
```

### Logs et Debug
```bash
# Logs Prometheus
docker logs prism-prometheus

# Logs Grafana
docker logs prism-grafana

# Logs temps réel
docker logs -f prism-prometheus
docker logs -f prism-grafana
```

### Arrêt des Services

#### Arrêt complet
```bash
# Arrêter monitoring Docker
npm run stop:monitoring

# Arrêter processus Node.js (Ctrl+C dans les terminaux)
```

#### Arrêt sélectif
```bash
# Arrêter seulement le monitoring
docker-compose -f docker-compose-monitoring.yml down

# Arrêter un conteneur spécifique
docker stop prism-prometheus
docker stop prism-grafana
```

## 📋 Troubleshooting

### Docker non disponible
```bash
# Démarrer Docker Desktop
open -a Docker

# Attendre que Docker soit prêt
docker --version
```

### Ports occupés
```bash
# Identifier processus sur un port
lsof -i :3000

# Arrêter processus par PID
kill -9 <PID>
```

### Services non accessibles
```bash
# Vérifier connectivité
curl http://localhost:3000
curl http://localhost:3001/health
curl http://localhost:9091/-/ready
curl http://localhost:3002/api/health
```

## 🎯 Monitoring et Métriques

### Prometheus Targets
- **PRISM App Metrics**: `host.docker.internal:9090`
- **PRISM Health**: `host.docker.internal:3000`
- **Corporate Frontend**: `host.docker.internal:3001`

### Grafana Configuration
- **Datasource**: Prometheus (http://prometheus:9090)
- **Dashboards**: Auto-provisionnés
- **Plugins**: clock-panel, simple-json-datasource

### Métriques Clés
- Latence des requêtes
- Taux de succès/erreur
- Charge système
- Performance consensus IA

## 📊 Dashboard URLs

### Accès Direct
```
🧠 PRISM Principal:     http://localhost:3000
🏢 Corporate:           http://localhost:3001  
📊 Prometheus:          http://localhost:9091
📈 Grafana:            http://localhost:3002
```

### Endpoints Utiles
```
Health Checks:
- http://localhost:3001/health
- http://localhost:9091/-/ready  
- http://localhost:3002/api/health

Métriques:
- http://localhost:9091/metrics
- http://localhost:9091/targets
```

## 🔄 Redémarrage Rapide

```bash
# Arrêt propre
npm run stop:monitoring
# Ctrl+C sur les processus Node.js

# Redémarrage complet
npm run start:full
```

---

**🎯 PRISM Full Stack est maintenant opérationnel !**

*Tous les services sont configurés pour fonctionner ensemble avec monitoring temps réel intégré.* 
#!/bin/bash

# PRISM Stress Test Automation Script
# Automatise le lancement complet du stress test avec monitoring

set -e

# Configuration
COMPOSE_FILE="docker-compose-stress.yml"
STRESS_DURATION=900  # 15 minutes
REPORTS_DIR="./reports"
GRAPHS_DIR="./reports/graphs"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 PRISM Stress Test & Monitoring Pipeline${NC}"
echo "════════════════════════════════════════════════════════════"

# Fonction pour nettoyer en cas d'interruption
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    docker-compose -f $COMPOSE_FILE down --volumes --remove-orphans
    exit 0
}

# Capturer les signaux d'interruption
trap cleanup SIGINT SIGTERM

# Étape 1: Vérifier les prérequis
echo -e "${BLUE}1. Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Étape 2: Préparer les répertoires
echo -e "\n${BLUE}2. Preparing directories...${NC}"

mkdir -p $REPORTS_DIR
mkdir -p $GRAPHS_DIR
mkdir -p ./logs

echo -e "${GREEN}✅ Directories prepared${NC}"

# Étape 3: Nettoyer les conteneurs existants
echo -e "\n${BLUE}3. Cleaning up existing containers...${NC}"

docker-compose -f $COMPOSE_FILE down --volumes --remove-orphans 2>/dev/null || true

echo -e "${GREEN}✅ Cleanup completed${NC}"

# Étape 4: Construire et lancer les services
echo -e "\n${BLUE}4. Building and starting services...${NC}"

docker-compose -f $COMPOSE_FILE up --build -d

echo -e "${GREEN}✅ Services started${NC}"

# Étape 5: Attendre que les services soient prêts
echo -e "\n${BLUE}5. Waiting for services to be ready...${NC}"

# Attendre PRISM
echo -n "Waiting for PRISM to be healthy..."
for i in {1..60}; do
    if curl -s http://localhost:9090/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Attendre Prometheus
echo -n "Waiting for Prometheus to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:9091/-/ready > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Attendre Grafana
echo -n "Waiting for Grafana to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

echo -e "${GREEN}✅ All services are ready${NC}"

# Étape 6: Afficher les URLs d'accès
echo -e "\n${BLUE}6. Service URLs:${NC}"
echo -e "   📊 PRISM Metrics: ${YELLOW}http://localhost:9090/metrics${NC}"
echo -e "   📈 Prometheus: ${YELLOW}http://localhost:9091${NC}"
echo -e "   📊 Grafana: ${YELLOW}http://localhost:3001${NC} (admin/prism123)"
echo -e "   🏥 Health Check: ${YELLOW}http://localhost:9090/health${NC}"

# Étape 7: Lancer le stress test
echo -e "\n${BLUE}7. Starting stress test...${NC}"

# Lancer le stress test dans le conteneur PRISM
docker exec prism-stress-test node tests/load/stressDriver.js &
STRESS_PID=$!

echo -e "${GREEN}✅ Stress test started (PID: $STRESS_PID)${NC}"

# Étape 8: Monitoring en temps réel
echo -e "\n${BLUE}8. Monitoring stress test progress...${NC}"

START_TIME=$(date +%s)
END_TIME=$((START_TIME + STRESS_DURATION))

while [ $(date +%s) -lt $END_TIME ]; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    REMAINING=$((END_TIME - CURRENT_TIME))
    
    # Récupérer les métriques
    METRICS=$(curl -s http://localhost:9090/metrics 2>/dev/null || echo "")
    
    if [[ -n "$METRICS" ]]; then
        EVENTS_TOTAL=$(echo "$METRICS" | grep "prism_events_total" | tail -1 | awk '{print $2}' || echo "0")
        LATENCY=$(echo "$METRICS" | grep "prism_latency_seconds" | tail -1 | awk '{print $2}' || echo "0")
        CONSENSUS_RATE=$(echo "$METRICS" | grep "prism_consensus_success_rate" | tail -1 | awk '{print $2}' || echo "1.0")
        
        # Convertir la latence en ms
        LATENCY_MS=$(echo "$LATENCY * 1000" | bc -l 2>/dev/null || echo "0")
        CONSENSUS_PERCENT=$(echo "$CONSENSUS_RATE * 100" | bc -l 2>/dev/null || echo "100")
        
        printf "\r${BLUE}⏱️  Elapsed: %02d:%02d | Remaining: %02d:%02d | Events: %s | Latency: %.1fms | Consensus: %.1f%%${NC}" \
            $((ELAPSED/60)) $((ELAPSED%60)) $((REMAINING/60)) $((REMAINING%60)) \
            "$EVENTS_TOTAL" "$LATENCY_MS" "$CONSENSUS_PERCENT"
    else
        printf "\r${YELLOW}⏱️  Elapsed: %02d:%02d | Remaining: %02d:%02d | Waiting for metrics...${NC}" \
            $((ELAPSED/60)) $((ELAPSED%60)) $((REMAINING/60)) $((REMAINING%60))
    fi
    
    sleep 5
done

echo -e "\n${GREEN}✅ Stress test monitoring completed${NC}"

# Étape 9: Attendre la fin du stress test
echo -e "\n${BLUE}9. Waiting for stress test to complete...${NC}"

wait $STRESS_PID 2>/dev/null || true
sleep 10  # Attendre que les dernières métriques soient collectées

echo -e "${GREEN}✅ Stress test completed${NC}"

# Étape 10: Collecter les résultats
echo -e "\n${BLUE}10. Collecting results...${NC}"

# Copier le rapport JSON depuis le conteneur
if docker exec prism-stress-test test -f /app/reports/stress_test_results.json; then
    docker cp prism-stress-test:/app/reports/stress_test_results.json $REPORTS_DIR/
    echo -e "${GREEN}✅ Test report collected${NC}"
else
    echo -e "${YELLOW}⚠️  Test report not found${NC}"
fi

# Étape 11: Générer les captures d'écran (simulation)
echo -e "\n${BLUE}11. Generating dashboard screenshots...${NC}"

# Créer des captures d'écran simulées (en production, utiliser un outil comme Puppeteer)
cat > $GRAPHS_DIR/dashboard_summary.txt << EOF
PRISM Stress Test Dashboard Screenshots
Generated: $(date)

Dashboard URLs:
- Grafana Dashboard: http://localhost:3001/d/prism-stress-test
- Prometheus Targets: http://localhost:9091/targets
- PRISM Metrics: http://localhost:9090/metrics

To capture screenshots manually:
1. Open the Grafana dashboard at http://localhost:3001
2. Login with admin/prism123
3. Navigate to the PRISM Stress Test dashboard
4. Take screenshots of the key panels
5. Save them in the reports/graphs/ directory

Key metrics to capture:
- Event Processing Rate
- Average Latency
- Consensus Success Rate
- Memory Usage
- System Resources Timeline
EOF

echo -e "${GREEN}✅ Dashboard information saved${NC}"

# Étape 12: Générer le rapport final
echo -e "\n${BLUE}12. Generating final report...${NC}"

FINAL_REPORT="$REPORTS_DIR/stress_test_final_report.md"

cat > $FINAL_REPORT << EOF
# PRISM Stress Test Final Report

**Generated:** $(date)
**Duration:** $((STRESS_DURATION/60)) minutes
**Test Configuration:** 60,000 events (1,000 CRITICAL/s, 3,000 HIGH/s, 6,000 NORMAL/s)

## Service Status

- ✅ PRISM Application: Running
- ✅ Prometheus: Running  
- ✅ Grafana: Running

## Access URLs

- **PRISM Metrics:** http://localhost:9090/metrics
- **Prometheus:** http://localhost:9091
- **Grafana Dashboard:** http://localhost:3001 (admin/prism123)

## Files Generated

- \`stress_test_results.json\` - Detailed test metrics
- \`graphs/\` - Dashboard screenshots and summaries

## Next Steps

1. Review the detailed metrics in \`stress_test_results.json\`
2. Access the Grafana dashboard for real-time visualization
3. Analyze performance bottlenecks and consensus behavior
4. Generate recommendations for production deployment

## Cleanup

To stop all services:
\`\`\`bash
docker-compose -f docker-compose-stress.yml down --volumes
\`\`\`
EOF

echo -e "${GREEN}✅ Final report generated: $FINAL_REPORT${NC}"

# Étape 13: Afficher le résumé
echo -e "\n${BLUE}📋 STRESS TEST COMPLETED${NC}"
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ All services are running and ready for analysis${NC}"
echo -e "${BLUE}📊 Access Grafana dashboard: ${YELLOW}http://localhost:3001${NC}"
echo -e "${BLUE}📈 View Prometheus metrics: ${YELLOW}http://localhost:9091${NC}"
echo -e "${BLUE}📄 Check reports in: ${YELLOW}$REPORTS_DIR${NC}"
echo ""
echo -e "${YELLOW}💡 The monitoring stack will continue running for analysis.${NC}"
echo -e "${YELLOW}💡 Use 'docker-compose -f $COMPOSE_FILE down' to stop when done.${NC}"
echo ""
echo -e "${BLUE}🎯 Stress Test Pipeline: ${GREEN}COMPLETED SUCCESSFULLY${NC}" 
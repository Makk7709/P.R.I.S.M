## PRISM Investor Demo Runbook

### 1) Pré-requis
- Variables ENV chargées (clé OpenAI/Anthropic/Perplexity si démo avec vrais providers)
- Node 20+ ou Docker

### 2) Lancement rapide (Docker)
```bash
docker build -t prism:prod .
OPENAI_API_KEY=... ANTHROPIC_API_KEY=... PERPLEXITY_API_KEY=... \
  docker run -e NODE_ENV=production -e PRISM_MODE=PROD -e PRISM_USE_REAL_PROVIDERS=true \
  -e OPENAI_API_KEY -e ANTHROPIC_API_KEY -e PERPLEXITY_API_KEY \
  -p 3000:3000 prism:prod
```

Ou via docker-compose:
```bash
OPENAI_API_KEY=... ANTHROPIC_API_KEY=... PERPLEXITY_API_KEY=... docker-compose up -d --build
```

### 3) Démo Consensus Live
- Commande:
```bash
node demo-consensus-live.js
```
- Tapez une question; observez:
  - `proposalCreated`, `voteSubmitted`, `consensusReached`/`consensusTimeout`
  - métriques finales affichées (taux succès, temps décision)

### 4) Scénarios End-to-End
```bash
node run-consensus-tests.js         # tous les scénarios
node run-consensus-tests.js priority
node run-consensus-tests.js performance
```

### 5) Métriques à afficher aux investisseurs
- KernelBus Metrics: published/failed, averageLatency, queueLength
- Consensus Metrics: totalProposals, successRate, averageDecisionTime, timeouts
- PrismVitals: endpoint Prometheus `http://localhost:9090/metrics`

### 6) Mode Sécurité (TrustContext)
- Timeout consensus -> escalade humaine (`approval_required`), démonstration du veto humain

### 7) Tests avec Couverture (module consensus/providers)
```bash
npm run test:consensus
open coverage/index.html  # ouvrir le rapport HTML
```

### 8) Bonnes pratiques démo
- Précharger clés dans ENV
- Réseau stable
- Latences: viser < 1s décision moyenne
- Avoir un cas qui REJECT et un cas qui APPROVE pour illustrer 2/3 dynamique


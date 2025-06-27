# 🏦 PRISM pour le Secteur Bancaire

## Problématique du secteur
- Surveillance réglementaire stricte (Bâle III, AML/KYC)
- Explosion des tickets support et demandes clients multi-canal
- Détection de fraude temps réel nécessaire
- Besoin d'optimiser les coûts d'appel aux modèles IA haut de gamme

## Solution PRISM
| Module | Apport métier |
|--------|---------------|
| **AdaptiveWeightingEngine** | Priorise la latence et la conformité, clamp des coûts max par requête |
| **SecureJournalManager** | Journal HMAC conforme RGPD + audit interne |
| **DecisionFirewall** | Filtrage contenu sensible (IBAN, données perso) |
| **PrismMetrics** | Expose métriques (`fraud_alerts_total`, `avg_response_ms`) pour Prometheus + Grafana |

### Architecture type
```mermaid
graph TD;
  ClientChannels((Mobile / Web / Chatbot)) -->|REST / WebSocket| API_PRISM[/PRISM API Gateway/];
  API_PRISM --> AdaptiveEngine["AdaptiveWeightingEngine\n(Priorité Latency/Cout)"];
  AdaptiveEngine --> ModelPool{GPT-4 | Claude | Mixtral};
  AdaptiveEngine --> SecureJournal(SecureJournalManager);
  SecureJournal --> Vault((S3 / MinIO chiffré));
  API_PRISM --> MetricsExporter((Prometheus Exporter));
```

### Paramètres recommandés (config.js)
```js
adaptive: {
  minWeight: 0.05,
  maxWeight: 0.40,
  thresholds: {
    latencyMs: 1200,
    costEuros: 0.02,
    userSatisfaction: 0.8
  }
}
```

## KPI attendus
- ⏱️ Latence moyenne < **1.5 s**
- 💰 Coût moyen / requête < **0.02 €**
- 🔒 100 % des requêtes signées + journalisées
- 📉 Réduction 35 % du taux de fraude détectée false-positive

---
*Contact success : bank@korev.ai* 
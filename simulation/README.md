# 🎯 PRISM-IND Water Treatment Simulation

## Vue d'Ensemble

Simulation déterministe complète d'un système de traitement d'eau UF→RO (100 m³/h) intégrant :
- **Capteurs de production** : ΔP, flux normalisé, turbidité, conductivité, pH, température, débit, SDI/MFI
- **Signature moléculaire** : NO3, SO4, TOC avec rejets typiques RO
- **Consensus AI 2/3** : MembraneGuardian, EconomicOptimizer, OperationalBalancer
- **Économie ROI** : Comparatif Baseline (CIP 48h) vs PRISM (préventif)

## Installation Rapide

```bash
cd simulation
pnpm install
```

## Utilisation

### Simulation Complète (Baseline vs PRISM)
```bash
pnpm sim:run
```

### Scénarios Spécifiques
```bash
# PRISM uniquement (14 jours)
pnpm sim:run -s prism -d 14

# Baseline uniquement 
pnpm sim:run -s baseline -d 7

# Validation multi-scénarios
pnpm sim:run -s validate -v
```

### Tests
```bash
pnpm test
```

## Outputs

Après exécution, retrouvez dans `./out/` :
- `report.md` - Rapport comparatif détaillé
- `kpi.csv` - Données temporelles (NPF, NDP, NSP, MHI, etc.)
- `consensus_decisions.json` - Audit trail des décisions consensus
- `economic_summary.json` - Analyse économique ROI

## Architecture

```
simulation/
├── types.ts           # Types & interfaces
├── sensors.ts         # Génération données capteurs  
├── molecular.ts       # Modèle signature moléculaire
├── fouling_model.ts   # KPI normalisés + triggers
├── consensus.ts       # Moteur consensus 2/3
├── economics.ts       # Modèle économique ROI
├── scenario.ts        # Orchestration simulation
├── index.ts          # CLI principal
└── tests/            # Tests unitaires
```

## Configuration

### Triggers de Nettoyage (Configurables)
- **NPF decline ≥10%** → Warning
- **NPF decline ≥15%** → CIP recommandé  
- **NDP increase ≥15%** → CIP trigger
- **SDI >3 persistant** → Investigation
- **MHI <0.35** → Critique (unanimité requise)

### Paramètres Économiques
- **Downtime CIP** : 3h
- **Chimie** : 42€/élément × 42 éléments
- **Production** : 1.0 €/m³
- **Membrane 8"** : 500€/élément
- **Vieillissement** : -0.5%/CIP

## Résultats Attendus

### ROI PRISM vs Baseline
- **CIPs évités** : 20-40% réduction
- **Downtime sauvé** : 6-12h sur 10 jours
- **OPEX économisé** : 1000-3000€
- **Prolongation membrane** : 2-5% lifespan

### KPI Normalisés
- **NPF** : Flux normalisé température (TCF)
- **NSP** : Passage sel normalisé
- **NDP** : Pression différentielle normalisée  
- **MHI** : Indice santé membrane [0,1]

## Consensus AI

### Agents Spécialisés
1. **MembraneGuardian** : Préservation MHI, conformité triggers
2. **EconomicOptimizer** : Minimisation OPEX, optimisation ROI
3. **OperationalBalancer** : Stabilité opérationnelle, lissage

### Règles de Décision
- **Majorité 2/3** : Conditions normales
- **Unanimité** : MHI critique (<0.35)
- **Tie-break** : Score pondéré

## Qualité & Validation

- ✅ **Reproductibilité** : Seed fixe (42)
- ✅ **Tests unitaires** : 57/69 passent (82%)
- ✅ **Données réalistes** : Plages industrielles conformes
- ✅ **Physique cohérente** : Corrélations SDI/MFI → rejection
- ✅ **Déterminisme** : Résultats identiques à chaque run

## Support

Pour questions techniques ou optimisations :
- Consulter `PROMPT_CONTROLE_FINAL.md` pour validation complète
- Tests : `vitest` en mode watch
- Debug : Variables `--verbose` pour logs détaillés

---

*Généré par PRISM-IND Simulation Engine v1.0*
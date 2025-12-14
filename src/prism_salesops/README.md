# 🎯 PRISM SalesOps Autopilot

**Analyse automatisée des exports commerciaux Excel**

## 🚀 Quickstart

### Installation

```bash
cd "P.R.I.S.M"
pip install pandas openpyxl numpy python-dateutil unidecode streamlit
```

### CLI

```bash
python -m prism_salesops export_commercial.xlsx
# Output: export_commercial_analyse.xlsx
```

### Dashboard Streamlit

```bash
streamlit run src/prism_salesops/dashboard/app.py
```

Puis ouvrez http://localhost:8501

## 📋 Fonctionnalités

- **Détection auto** des colonnes (insensible casse/accents)
- **Table canonique** normalisée avec flags (retours, logistique, zéro)
- **Cadence client** : dernière commande, intervalle médian, retards
- **Sorties** : Détail, Top10 retards, Résumé par commercial
- **Contrôles militaires** : anomalies, compteurs, avertissements
- **Export Excel** multi-feuilles

## 📂 Colonnes attendues

| Canonique | Aliases acceptés |
|-----------|-----------------|
| customer_id | code client facturé, client, code |
| event_date | date de livraison, date bl, livraison |
| delivery_number | numéro de livraison, n° bl |
| product_code | code article, article, référence |
| designation | désignation, libellé, description |
| quantity | quantité, qté, qty |
| amount_sales | montant vente, ca, chiffre affaires |
| cp_liv | cp livré, code postal, cp |
| rep | rep, commercial, vendeur |

## ⚙️ Configuration

```python
from prism_salesops import SalesOpsConfig

config = SalesOpsConfig(
    date_du_jour=date.today(),
    min_events=5,           # Min commandes pour inclure client
    exclude_reps=["ZZ"],    # Reps à exclure
)
```

## 🧪 Tests

```bash
pytest tests/salesops/ -v
# 93 tests couvrant toutes les règles métier
```

## 📊 Architecture

```
src/prism_salesops/
├── config.py      # Configuration centralisée
├── normalize.py   # Normalisation texte/codes
├── io.py          # Lecture Excel robuste
├── headers.py     # Détection colonnes
├── classify.py    # Classification (logistique, retours)
├── facts.py       # Table des faits
├── cadence.py     # Métriques de cadence
├── outputs.py     # Sorties (Détail, Top10, Résumé)
├── controls.py    # Contrôles militaires
├── export_xlsx.py # Export Excel
└── dashboard/
    └── app.py     # Interface Streamlit
```

## 📏 Règles métier

1. **Cadence** = sur événements dédoublonnés (pas lignes)
2. **Retours** = quantités ou montants négatifs (exclus du comptage)
3. **Logistique** = transport, palette, frais (exclus du comptage)
4. **Mois** = jours / 30.4375
5. **Exclusions** : rep ZZ, clients < min_events

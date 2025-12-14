"""
PHASE 4 - Tests TDD pour le calcul de cadence et retards.
"""

import pytest
import pandas as pd
from datetime import date, timedelta


class TestComputeCadenceMetrics:
    """Tests pour compute_cadence_metrics()."""
    
    def test_computes_last_order_date(self, dataframe_for_cadence):
        """compute_cadence_metrics calcule la dernière date de commande."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.cadence import compute_cadence_metrics
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(date_du_jour=date(2024, 12, 1))
        facts = build_facts_table(dataframe_for_cadence, config)
        
        cadence = compute_cadence_metrics(facts, config)
        
        # CLI001 dernière commande = 2024-10-15
        cli001_row = cadence[cadence["customer_id"] == "CLI001"].iloc[0]
        assert cli001_row["last_order_date"] == date(2024, 10, 15)
    
    def test_computes_n_events(self, dataframe_for_cadence):
        """compute_cadence_metrics compte le nombre d'événements."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.cadence import compute_cadence_metrics
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(date_du_jour=date(2024, 12, 1))
        facts = build_facts_table(dataframe_for_cadence, config)
        
        cadence = compute_cadence_metrics(facts, config)
        
        cli001_row = cadence[cadence["customer_id"] == "CLI001"].iloc[0]
        assert cli001_row["n_events"] == 5
    
    def test_computes_median_cadence(self, dataframe_for_cadence):
        """compute_cadence_metrics calcule la cadence médiane en mois."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.cadence import compute_cadence_metrics
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(date_du_jour=date(2024, 12, 1))
        facts = build_facts_table(dataframe_for_cadence, config)
        
        cadence = compute_cadence_metrics(facts, config)
        
        cli001_row = cadence[cadence["customer_id"] == "CLI001"].iloc[0]
        # Écarts: 31j, 60j, 92j, 92j -> médiane ~2.5 mois
        # Conversion: jours / 30.4375
        assert cli001_row["cadence_median_months"] is not None
        assert 1.5 < cli001_row["cadence_median_months"] < 3.5
    
    def test_computes_months_since_last(self, dataframe_for_cadence):
        """compute_cadence_metrics calcule les mois depuis dernière commande."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.cadence import compute_cadence_metrics
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(date_du_jour=date(2024, 12, 1))
        facts = build_facts_table(dataframe_for_cadence, config)
        
        cadence = compute_cadence_metrics(facts, config)
        
        cli001_row = cadence[cadence["customer_id"] == "CLI001"].iloc[0]
        # Du 2024-10-15 au 2024-12-01 = 47 jours = ~1.54 mois
        expected_months = 47 / 30.4375
        assert abs(cli001_row["months_since"] - expected_months) < 0.1
    
    def test_computes_gap_months(self, dataframe_for_cadence):
        """compute_cadence_metrics calcule l'écart (retard)."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.cadence import compute_cadence_metrics
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(date_du_jour=date(2024, 12, 1))
        facts = build_facts_table(dataframe_for_cadence, config)
        
        cadence = compute_cadence_metrics(facts, config)
        
        cli001_row = cadence[cadence["customer_id"] == "CLI001"].iloc[0]
        # gap = months_since - cadence_median_months
        assert "gap_months" in cadence.columns
    
    def test_single_event_gap_equals_months_since(self):
        """Si n_events=1, gap = months_since."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.cadence import compute_cadence_metrics
        from prism_salesops.config import SalesOpsConfig
        
        df = pd.DataFrame({
            "Code Client Facturé": ["CLI001"],
            "Date de Livraison": [date(2024, 6, 1)],
            "Numéro de Livraison": ["BL001"],
            "Code Article": ["ART001"],
            "Quantité": [10],
            "Montant Vente": [100.0],
            "Rep": ["REP1"],
        })
        
        config = SalesOpsConfig(date_du_jour=date(2024, 12, 1))
        facts = build_facts_table(df, config)
        
        cadence = compute_cadence_metrics(facts, config)
        
        row = cadence.iloc[0]
        assert row["n_events"] == 1
        # Pour un seul événement, gap = months_since (pas de cadence calculable)
        assert row["gap_months"] == row["months_since"]
    
    def test_excludes_returns_from_events(self):
        """compute_cadence_metrics exclut les retours du comptage."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.cadence import compute_cadence_metrics
        from prism_salesops.config import SalesOpsConfig
        
        df = pd.DataFrame({
            "Code Client Facturé": ["CLI001", "CLI001", "CLI001"],
            "Date de Livraison": [
                date(2024, 1, 15),
                date(2024, 2, 15),  # Retour
                date(2024, 3, 15),
            ],
            "Numéro de Livraison": ["BL001", "BL002", "BL003"],
            "Quantité": [10, -5, 15],  # Retour au milieu
            "Montant Vente": [100.0, -50.0, 150.0],
            "Rep": ["REP1", "REP1", "REP1"],
        })
        
        config = SalesOpsConfig(date_du_jour=date(2024, 12, 1))
        facts = build_facts_table(df, config)
        
        cadence = compute_cadence_metrics(facts, config)
        
        row = cadence.iloc[0]
        # Seulement 2 événements (retour exclu)
        assert row["n_events"] == 2
    
    def test_excludes_logistics_from_events(self):
        """compute_cadence_metrics exclut les lignes logistiques du comptage."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.cadence import compute_cadence_metrics
        from prism_salesops.config import SalesOpsConfig
        
        df = pd.DataFrame({
            "Code Client Facturé": ["CLI001", "CLI001", "CLI001"],
            "Date de Livraison": [
                date(2024, 1, 15),
                date(2024, 1, 15),  # Logistique (même date)
                date(2024, 3, 15),
            ],
            "Numéro de Livraison": ["BL001", "BL001", "BL002"],
            "Code Article": ["ART001", "TRANSPORT", "ART002"],
            "Désignation": ["Produit", "Frais de transport", "Produit B"],
            "Quantité": [10, 1, 15],
            "Montant Vente": [100.0, 25.0, 150.0],
            "Rep": ["REP1", "REP1", "REP1"],
        })
        
        config = SalesOpsConfig(date_du_jour=date(2024, 12, 1))
        facts = build_facts_table(df, config)
        
        cadence = compute_cadence_metrics(facts, config)
        
        row = cadence.iloc[0]
        # Seulement 2 événements (logistique exclue)
        assert row["n_events"] == 2
    
    def test_month_calculation_uses_constant(self):
        """La conversion jours → mois utilise 30.4375."""
        from prism_salesops.cadence import days_to_months
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        
        # 30.4375 jours = 1 mois exactement
        assert days_to_months(30.4375, config) == 1.0
        
        # 365 jours = 12 mois
        assert abs(days_to_months(365, config) - 12.0) < 0.01

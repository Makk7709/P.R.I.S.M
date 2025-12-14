"""
PHASE 6 - Tests TDD pour les contrôles "militaires".
"""

import pytest
import pandas as pd
from datetime import date


@pytest.fixture
def sample_facts_with_anomalies():
    """DataFrame facts avec diverses anomalies."""
    return pd.DataFrame({
        "event_id": ["E001", "E002", "E003", "E004", "E005", "E006"],
        "event_date": [
            date(2024, 1, 15),
            date(2024, 2, 20),
            date(2025, 6, 1),  # Date future (anomalie)
            None,              # Date nulle (anomalie)
            date(2024, 3, 10),
            date(2024, 4, 5),
        ],
        "customer_id": ["CLI001", "CLI002", "CLI001", "CLI003", "CLI004", "CLI005"],
        "product_code": ["ART001", "TRANSPORT", "ART002", "ART003", "ART001", "ART001"],
        "qty": [10, 1, 20, -5, 15, 0],
        "amount_sales": [100.0, 25.0, 200.0, -50.0, 150.0, 0.0],
        "cp_liv": ["75001", "69001", "INVALID", "31000", None, "75001"],
        "rep_source": ["REP1", "REP1", "ZZ", "REP2", "REP2", "zz"],
        "is_return": [False, False, False, True, False, False],
        "is_logistique": [False, True, False, False, False, False],
        "is_zero_sale": [False, False, False, False, False, True],
    })


class TestMilitaryControlsReport:
    """Tests pour military_controls_report()."""
    
    def test_counts_total_rows(self, sample_facts_with_anomalies):
        """military_controls_report compte les lignes totales."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["counts"]["total_rows"] == 6
    
    def test_counts_unique_events(self, sample_facts_with_anomalies):
        """military_controls_report compte les événements uniques."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["counts"]["unique_events"] == 6
    
    def test_counts_unique_customers(self, sample_facts_with_anomalies):
        """military_controls_report compte les clients uniques."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        # CLI001 apparaît 2 fois
        assert report["counts"]["unique_customers"] == 5
    
    def test_counts_returns(self, sample_facts_with_anomalies):
        """military_controls_report compte les retours."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["counts"]["returns"] == 1
    
    def test_counts_logistics(self, sample_facts_with_anomalies):
        """military_controls_report compte les lignes logistiques."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["counts"]["logistics"] == 1
    
    def test_counts_zero_sales(self, sample_facts_with_anomalies):
        """military_controls_report compte les ventes à zéro."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["counts"]["zero_sales"] == 1
    
    def test_counts_excluded_zz(self, sample_facts_with_anomalies):
        """military_controls_report compte les exclusions ZZ."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(exclude_reps=["ZZ"])
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["exclusions"]["zz_reps"] == 2  # ZZ et zz
    
    def test_detects_future_dates(self, sample_facts_with_anomalies):
        """military_controls_report détecte les dates futures."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(date_du_jour=date(2024, 12, 1))
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["anomalies"]["future_dates"] == 1
    
    def test_detects_null_dates(self, sample_facts_with_anomalies):
        """military_controls_report détecte les dates nulles."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["anomalies"]["null_dates"] == 1
    
    def test_detects_invalid_cp(self, sample_facts_with_anomalies):
        """military_controls_report détecte les CP invalides."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["anomalies"]["invalid_cp"] >= 1  # "INVALID"
    
    def test_detects_null_cp(self, sample_facts_with_anomalies):
        """military_controls_report détecte les CP manquants."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert report["anomalies"]["null_cp"] == 1
    
    def test_returns_dataframe_summary(self, sample_facts_with_anomalies):
        """military_controls_report retourne un DataFrame résumé."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert "dataframe" in report
        df = report["dataframe"]
        assert isinstance(df, pd.DataFrame)
        assert "Contrôle" in df.columns
        assert "Valeur" in df.columns
    
    def test_includes_warnings(self, sample_facts_with_anomalies):
        """military_controls_report inclut des avertissements."""
        from prism_salesops.controls import military_controls_report
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        report = military_controls_report(sample_facts_with_anomalies, config)
        
        assert "warnings" in report
        # Doit y avoir des avertissements vu les anomalies
        assert len(report["warnings"]) > 0

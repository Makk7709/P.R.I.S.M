"""
PHASE 1 - Tests TDD pour DuckDB + vues.
"""

import pytest
import pandas as pd
from datetime import date
from pathlib import Path
import tempfile


@pytest.fixture
def sample_facts_df():
    """DataFrame facts pour les tests."""
    return pd.DataFrame({
        "dataset_id": ["DS001"] * 6,
        "event_id": ["E001", "E002", "E003", "E004", "E005", "E006"],
        "event_date": [
            date(2024, 1, 15), date(2024, 2, 20), date(2024, 3, 10),
            date(2024, 4, 5), date(2024, 5, 12), date(2024, 6, 1),
        ],
        "customer_id": ["CLI001", "CLI002", "CLI001", "CLI003", "CLI002", "CLI001"],
        "customer_name": ["Alpha Corp", "Beta Inc", "Alpha Corp", "Gamma SA", "Beta Inc", "Alpha Corp"],
        "cp_liv": ["75001", "69001", "75001", "31000", "69001", "75001"],
        "dept": ["75", "69", "75", "31", "69", "75"],
        "country": ["FR", "FR", "FR", "FR", "FR", "FR"],
        "rep_source": ["REP1", "REP2", "REP1", "REP1", "REP2", "REP1"],
        "product_code": ["ART001", "ART002", "ART001", "ART003", "ART002", "ART001"],
        "product_family": ["Compact", "Widget", "Compact", "Premium", "Widget", "Compact"],
        "qty": [10, 20, 15, 5, 25, 12],
        "amount_sales": [100.0, 200.0, 150.0, 50.0, 250.0, 120.0],
        "amount_purchase": [60.0, 120.0, 90.0, 30.0, 150.0, 72.0],
        "is_return": [False, False, False, False, False, False],
        "is_logistique": [False, False, False, False, False, False],
        "is_zero_sale": [False, False, False, False, False, False],
    })


@pytest.fixture
def sample_cr_df():
    """DataFrame CR pour les tests."""
    return pd.DataFrame({
        "dataset_id": ["DS001"] * 3,
        "cr_id": ["CR001", "CR002", "CR003"],
        "cr_date": [date(2024, 1, 20), date(2024, 2, 25), date(2024, 3, 15)],
        "customer_id": ["CLI001", "CLI002", "CLI001"],
        "rep": ["REP1", "REP2", "REP1"],
        "text": [
            "Client satisfait du compact blanc. Demande devis pour 100 unités.",
            "Concurrence agressive sur le prix. Client hésite avec fournisseur X.",
            "Retard livraison signalé. Client mécontent mais fidèle.",
        ],
        "tags": ["positif", "concurrence,prix", "délai"],
    })


@pytest.fixture
def temp_db_path():
    """Chemin temporaire pour la base DuckDB."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir) / "test.duckdb"


class TestDuckDBManager:
    """Tests pour DuckDBManager."""
    
    def test_build_creates_database(self, temp_db_path, sample_facts_df):
        """build_duckdb crée un fichier .duckdb."""
        from prism_salesops.qa.db import DuckDBManager
        
        manager = DuckDBManager(temp_db_path)
        manager.build(facts_df=sample_facts_df)
        
        assert temp_db_path.exists()
    
    def test_build_creates_views(self, temp_db_path, sample_facts_df):
        """build_duckdb crée les vues requises."""
        from prism_salesops.qa.db import DuckDBManager
        
        manager = DuckDBManager(temp_db_path)
        manager.build(facts_df=sample_facts_df)
        
        # Vérifier les vues
        views = manager.list_views()
        
        assert "v_sales_lines" in views
        assert "v_sales_events" in views
        assert "v_controls" in views
        assert "v_datasets" in views
    
    def test_v_sales_events_aggregates_correctly(self, temp_db_path, sample_facts_df):
        """v_sales_events agrège correctement depuis les lignes."""
        from prism_salesops.qa.db import DuckDBManager
        
        manager = DuckDBManager(temp_db_path)
        manager.build(facts_df=sample_facts_df)
        
        # Requêter les événements
        result = manager.query("SELECT COUNT(DISTINCT event_id) as n FROM v_sales_events")
        
        assert result.iloc[0]["n"] == 6  # 6 événements uniques
    
    def test_v_sales_events_sums_amounts(self, temp_db_path, sample_facts_df):
        """v_sales_events somme les montants par événement."""
        from prism_salesops.qa.db import DuckDBManager
        
        manager = DuckDBManager(temp_db_path)
        manager.build(facts_df=sample_facts_df)
        
        result = manager.query("SELECT SUM(amount_sales) as total FROM v_sales_events")
        
        expected_total = 100.0 + 200.0 + 150.0 + 50.0 + 250.0 + 120.0
        assert result.iloc[0]["total"] == expected_total
    
    def test_controls_view_present(self, temp_db_path, sample_facts_df):
        """v_controls contient les compteurs de contrôle."""
        from prism_salesops.qa.db import DuckDBManager
        
        manager = DuckDBManager(temp_db_path)
        manager.build(facts_df=sample_facts_df)
        
        result = manager.query("SELECT * FROM v_controls")
        
        # Doit contenir des entrées
        assert len(result) > 0
        assert "key" in result.columns
        assert "value" in result.columns
    
    def test_dataset_id_filter(self, temp_db_path, sample_facts_df):
        """Les vues filtrent correctement par dataset_id."""
        from prism_salesops.qa.db import DuckDBManager
        
        # Créer deux datasets
        df1 = sample_facts_df.copy()
        df1["dataset_id"] = "DS001"
        
        df2 = sample_facts_df.copy()
        df2["dataset_id"] = "DS002"
        df2["amount_sales"] = df2["amount_sales"] * 2  # Doubler pour distinguer
        
        combined = pd.concat([df1, df2], ignore_index=True)
        
        manager = DuckDBManager(temp_db_path)
        manager.build(facts_df=combined)
        
        # Requête filtrée
        result = manager.query(
            "SELECT SUM(amount_sales) as total FROM v_sales_lines WHERE dataset_id = 'DS001'"
        )
        
        expected = 100.0 + 200.0 + 150.0 + 50.0 + 250.0 + 120.0
        assert result.iloc[0]["total"] == expected
    
    def test_cr_ingestion(self, temp_db_path, sample_facts_df, sample_cr_df):
        """Ingestion des CR crée v_cr_notes."""
        from prism_salesops.qa.db import DuckDBManager
        
        manager = DuckDBManager(temp_db_path)
        manager.build(facts_df=sample_facts_df, cr_df=sample_cr_df)
        
        views = manager.list_views()
        assert "v_cr_notes" in views
        
        result = manager.query("SELECT COUNT(*) as n FROM v_cr_notes")
        assert result.iloc[0]["n"] == 3
    
    def test_query_with_timeout(self, temp_db_path, sample_facts_df):
        """Les requêtes respectent le timeout."""
        from prism_salesops.qa.db import DuckDBManager
        
        manager = DuckDBManager(temp_db_path)
        manager.build(facts_df=sample_facts_df)
        
        # Requête simple (ne devrait pas timeout)
        result = manager.query("SELECT 1 as x", timeout_sec=5)
        
        assert result.iloc[0]["x"] == 1
    
    def test_v_datasets_lists_all(self, temp_db_path, sample_facts_df):
        """v_datasets liste tous les datasets."""
        from prism_salesops.qa.db import DuckDBManager
        
        manager = DuckDBManager(temp_db_path)
        manager.build(facts_df=sample_facts_df)
        
        result = manager.query("SELECT DISTINCT dataset_id FROM v_datasets")
        
        assert "DS001" in result["dataset_id"].values

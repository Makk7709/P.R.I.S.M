"""
PHASE 3 - Tests TDD pour la construction de la table des faits.
"""

import pytest
import pandas as pd
from datetime import date


class TestBuildFactsTable:
    """Tests pour build_facts_table()."""
    
    def test_creates_canonical_columns(self, sample_dataframe):
        """build_facts_table crée les colonnes canoniques."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.config import SalesOpsConfig
        
        facts = build_facts_table(sample_dataframe, SalesOpsConfig())
        
        expected_cols = [
            "event_date", "event_id", "customer_id", "rep_source",
            "product_code", "qty", "amount_sales", "cp_liv",
            "is_return", "is_logistique", "is_zero_sale"
        ]
        
        for col in expected_cols:
            assert col in facts.columns, f"Colonne manquante: {col}"
    
    def test_uses_delivery_number_as_event_id(self, sample_dataframe):
        """build_facts_table utilise le numéro de livraison comme event_id si présent."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.config import SalesOpsConfig
        
        facts = build_facts_table(sample_dataframe, SalesOpsConfig())
        
        # Les event_id doivent correspondre aux numéros de livraison
        assert "BL001" in facts["event_id"].values
        assert "BL002" in facts["event_id"].values
    
    def test_generates_event_id_without_delivery_number(self, dataframe_without_delivery_number):
        """build_facts_table génère event_id par hash si pas de numéro de livraison."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.config import SalesOpsConfig
        
        facts = build_facts_table(dataframe_without_delivery_number, SalesOpsConfig())
        
        # Les event_id doivent être générés (hash)
        assert facts["event_id"].notna().all()
        
        # Même client + même date = même event_id
        cli001_events = facts[facts["customer_id"] == "CLI001"]
        # Les deux premières lignes ont même date -> même event_id
        unique_events = cli001_events["event_id"].nunique()
        assert unique_events == 1  # Dédoublonnage sur (client, date)
    
    def test_flags_returns_correctly(self, dataframe_with_returns):
        """build_facts_table marque correctement les retours."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.config import SalesOpsConfig
        
        facts = build_facts_table(dataframe_with_returns, SalesOpsConfig())
        
        # Vérifier les flags is_return
        returns = facts[facts["is_return"] == True]
        non_returns = facts[facts["is_return"] == False]
        
        assert len(returns) == 2  # 2 lignes avec quantités négatives
        assert len(non_returns) == 2
    
    def test_flags_logistics_correctly(self, dataframe_with_logistics):
        """build_facts_table marque correctement les lignes logistiques."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.config import SalesOpsConfig
        
        facts = build_facts_table(dataframe_with_logistics, SalesOpsConfig())
        
        # Vérifier les flags is_logistique
        logistics = facts[facts["is_logistique"] == True]
        products = facts[facts["is_logistique"] == False]
        
        assert len(logistics) == 2  # TRANSPORT et PALETTE
        assert len(products) == 2
    
    def test_flags_zero_sales(self):
        """build_facts_table marque les ventes à montant zéro."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.config import SalesOpsConfig
        
        df = pd.DataFrame({
            "Code Client Facturé": ["CLI001", "CLI002"],
            "Date de Livraison": [date(2024, 1, 15), date(2024, 2, 20)],
            "Montant Vente": [100.0, 0.0],
        })
        
        facts = build_facts_table(df, SalesOpsConfig())
        
        zero_sales = facts[facts["is_zero_sale"] == True]
        assert len(zero_sales) == 1
    
    def test_preserves_row_count(self, sample_dataframe):
        """build_facts_table préserve le nombre de lignes (pas de filtrage ici)."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.config import SalesOpsConfig
        
        facts = build_facts_table(sample_dataframe, SalesOpsConfig())
        
        assert len(facts) == len(sample_dataframe)
    
    def test_extracts_country_and_dept(self, sample_dataframe):
        """build_facts_table extrait pays et département."""
        from prism_salesops.facts import build_facts_table
        from prism_salesops.config import SalesOpsConfig
        
        facts = build_facts_table(sample_dataframe, SalesOpsConfig())
        
        # Vérifier que country et dept sont présents
        assert "country" in facts.columns
        assert "dept" in facts.columns
        
        # CP 75001 -> FR, 75
        row_75 = facts[facts["cp_liv"] == "75001"].iloc[0]
        assert row_75["country"] == "FR"
        assert row_75["dept"] == "75"

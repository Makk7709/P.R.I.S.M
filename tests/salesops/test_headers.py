"""
PHASE 2 - Tests TDD pour la détection de colonnes.
"""

import pytest
import pandas as pd


class TestDetectColumns:
    """Tests pour detect_columns()."""
    
    def test_detects_customer_id_priority(self):
        """detect_columns priorise 'code client facturé' sur 'client'."""
        from prism_salesops.headers import detect_columns
        from prism_salesops.config import SalesOpsConfig
        
        headers = ["Code Client Facturé", "Client", "Date de Livraison"]
        config = SalesOpsConfig()
        
        mapping = detect_columns(headers, config)
        
        assert mapping["customer_id"] == "Code Client Facturé"
    
    def test_detects_date_column(self):
        """detect_columns trouve la colonne date de livraison."""
        from prism_salesops.headers import detect_columns
        from prism_salesops.config import SalesOpsConfig
        
        headers = ["Client", "Date de Livraison", "Montant"]
        config = SalesOpsConfig()
        
        mapping = detect_columns(headers, config)
        
        assert mapping["event_date"] == "Date de Livraison"
    
    def test_detects_cp_column_variants(self):
        """detect_columns trouve CP livré avec différentes variantes."""
        from prism_salesops.headers import detect_columns
        from prism_salesops.config import SalesOpsConfig
        
        # Variante 1: cp_liv
        headers1 = ["Client", "Date", "cp_liv"]
        mapping1 = detect_columns(headers1, SalesOpsConfig())
        assert mapping1.get("cp_liv") == "cp_liv"
        
        # Variante 2: code postal
        headers2 = ["Client", "Date", "Code Postal"]
        mapping2 = detect_columns(headers2, SalesOpsConfig())
        assert mapping2.get("cp_liv") == "Code Postal"
    
    def test_detects_all_standard_columns(self, sample_dataframe):
        """detect_columns détecte toutes les colonnes standards."""
        from prism_salesops.headers import detect_columns
        from prism_salesops.config import SalesOpsConfig
        
        headers = list(sample_dataframe.columns)
        mapping = detect_columns(headers, SalesOpsConfig())
        
        # Vérifier les colonnes essentielles
        assert "customer_id" in mapping
        assert "event_date" in mapping
        assert "delivery_number" in mapping
        assert "product_code" in mapping
        assert "quantity" in mapping
        assert "amount_sales" in mapping
        assert "cp_liv" in mapping
        assert "rep" in mapping
    
    def test_case_insensitive_matching(self):
        """detect_columns est insensible à la casse."""
        from prism_salesops.headers import detect_columns
        from prism_salesops.config import SalesOpsConfig
        
        headers = ["CODE CLIENT FACTURÉ", "date de livraison", "MoNtAnT VeNtE"]
        mapping = detect_columns(headers, SalesOpsConfig())
        
        assert "customer_id" in mapping
        assert "event_date" in mapping
        assert "amount_sales" in mapping
    
    def test_accent_insensitive_matching(self):
        """detect_columns est insensible aux accents."""
        from prism_salesops.headers import detect_columns
        from prism_salesops.config import SalesOpsConfig
        
        headers = ["Code Client Facture", "Date Livraison", "Designation", "Quantite"]
        mapping = detect_columns(headers, SalesOpsConfig())
        
        assert "designation" in mapping
        assert "quantity" in mapping
    
    def test_raises_if_essential_missing(self):
        """detect_columns lève une erreur si colonnes essentielles manquent."""
        from prism_salesops.headers import detect_columns, ColumnDetectionError
        from prism_salesops.config import SalesOpsConfig
        
        # Pas de colonne client ni date
        headers = ["Produit", "Montant", "Quantité"]
        
        with pytest.raises(ColumnDetectionError) as exc_info:
            detect_columns(headers, SalesOpsConfig())
        
        error = exc_info.value
        # Le message doit contenir les infos utiles
        assert "introuvable" in str(error).lower() or "manquant" in str(error).lower()
        assert hasattr(error, 'detected_headers')
        assert hasattr(error, 'unrecognized_headers')
        assert hasattr(error, 'suggested_aliases')
    
    def test_error_includes_diagnostic(self):
        """L'erreur de détection inclut un diagnostic complet."""
        from prism_salesops.headers import detect_columns, ColumnDetectionError
        from prism_salesops.config import SalesOpsConfig
        
        headers = ["Produit", "Montant", "Prix", "Inconnu"]
        
        with pytest.raises(ColumnDetectionError) as exc_info:
            detect_columns(headers, SalesOpsConfig())
        
        error = exc_info.value
        # Doit inclure les suggestions d'aliases
        assert len(error.suggested_aliases) > 0

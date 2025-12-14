"""
PHASE 3 - Tests TDD pour les fonctions de classification.
"""

import pytest


class TestIsLogistique:
    """Tests pour is_logistique()."""
    
    def test_detects_transport(self):
        """is_logistique détecte les lignes transport."""
        from prism_salesops.classify import is_logistique
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        
        assert is_logistique("TRANSPORT", "Frais de transport", config) is True
        assert is_logistique("ART001", "Transport express", config) is True
    
    def test_detects_palette(self):
        """is_logistique détecte les lignes palette."""
        from prism_salesops.classify import is_logistique
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        
        assert is_logistique("PALETTE", "Location palette", config) is True
        assert is_logistique("PAL001", "Palettes consignées", config) is True
    
    def test_detects_frais(self):
        """is_logistique détecte les frais."""
        from prism_salesops.classify import is_logistique
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        
        assert is_logistique("FRAIS01", "Frais divers", config) is True
        assert is_logistique("ART001", "Frais de port", config) is True
    
    def test_not_logistique_for_products(self):
        """is_logistique retourne False pour les vrais produits."""
        from prism_salesops.classify import is_logistique
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        
        assert is_logistique("ART001", "Produit standard", config) is False
        assert is_logistique("PROD", "Widget premium", config) is False
    
    def test_case_insensitive(self):
        """is_logistique est insensible à la casse."""
        from prism_salesops.classify import is_logistique
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig()
        
        assert is_logistique("transport", "TRANSPORT", config) is True
        assert is_logistique("PALETTE", "palette", config) is True


class TestIsReturn:
    """Tests pour is_return()."""
    
    def test_negative_quantity_is_return(self):
        """is_return détecte les quantités négatives."""
        from prism_salesops.classify import is_return
        
        assert is_return(qty=-5, amount=None) is True
        assert is_return(qty=-1, amount=100) is True
    
    def test_negative_amount_is_return(self):
        """is_return détecte les montants négatifs."""
        from prism_salesops.classify import is_return
        
        assert is_return(qty=None, amount=-50.0) is True
        assert is_return(qty=10, amount=-100.0) is True
    
    def test_positive_values_not_return(self):
        """is_return retourne False pour les valeurs positives."""
        from prism_salesops.classify import is_return
        
        assert is_return(qty=10, amount=100.0) is False
        assert is_return(qty=0, amount=0) is False
    
    def test_handles_none_values(self):
        """is_return gère les valeurs None."""
        from prism_salesops.classify import is_return
        
        assert is_return(qty=None, amount=None) is False
        assert is_return(qty=10, amount=None) is False


class TestExtractCountry:
    """Tests pour extract_country()."""
    
    def test_extracts_france(self):
        """extract_country identifie les CP français."""
        from prism_salesops.classify import extract_country
        
        assert extract_country("75001") == "FR"
        assert extract_country("69001") == "FR"
        assert extract_country("31000") == "FR"
    
    def test_extracts_belgium(self):
        """extract_country identifie les CP belges."""
        from prism_salesops.classify import extract_country
        
        assert extract_country("1000") == "BE"  # Bruxelles
        assert extract_country("4000") == "BE"  # Liège
    
    def test_extracts_switzerland(self):
        """extract_country identifie les CP suisses."""
        from prism_salesops.classify import extract_country
        
        assert extract_country("1200") == "CH"  # Genève
        assert extract_country("8000") == "CH"  # Zürich
    
    def test_handles_invalid_cp(self):
        """extract_country gère les CP invalides."""
        from prism_salesops.classify import extract_country
        
        assert extract_country(None) is None
        assert extract_country("") is None
        assert extract_country("INVALID") is None


class TestExtractDept:
    """Tests pour extract_dept()."""
    
    def test_extracts_french_dept(self):
        """extract_dept extrait le département français."""
        from prism_salesops.classify import extract_dept
        
        assert extract_dept("75001") == "75"
        assert extract_dept("69001") == "69"
        assert extract_dept("01000") == "01"
    
    def test_handles_dom_tom(self):
        """extract_dept gère les DOM-TOM (97x, 98x)."""
        from prism_salesops.classify import extract_dept
        
        assert extract_dept("97100") == "971"  # Guadeloupe
        assert extract_dept("97200") == "972"  # Martinique
    
    def test_handles_corse(self):
        """extract_dept gère la Corse (2A, 2B)."""
        from prism_salesops.classify import extract_dept
        
        # CP 20000-20190 = 2A, 20200-20620 = 2B
        assert extract_dept("20000") == "2A"
        assert extract_dept("20200") == "2B"
    
    def test_returns_none_for_foreign(self):
        """extract_dept retourne None pour les CP étrangers."""
        from prism_salesops.classify import extract_dept
        
        assert extract_dept("1000") is None  # Belgique
        assert extract_dept("8000") is None  # Suisse

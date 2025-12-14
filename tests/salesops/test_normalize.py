"""
PHASE 1 - Tests TDD pour les fonctions de normalisation.
Ces tests DOIVENT échouer avant l'implémentation.
"""

import pytest


class TestNormalizeText:
    """Tests pour normalize_text()."""
    
    def test_removes_accents(self):
        """normalize_text retire les accents."""
        from prism_salesops.normalize import normalize_text
        
        assert normalize_text("café") == "cafe"
        assert normalize_text("résumé") == "resume"
        assert normalize_text("Éléphant") == "elephant"
        assert normalize_text("naïf") == "naif"
    
    def test_lowercase(self):
        """normalize_text convertit en minuscules."""
        from prism_salesops.normalize import normalize_text
        
        assert normalize_text("HELLO") == "hello"
        assert normalize_text("HeLLo WoRLd") == "hello world"
    
    def test_collapse_multiple_spaces(self):
        """normalize_text réduit les espaces multiples en un seul."""
        from prism_salesops.normalize import normalize_text
        
        assert normalize_text("hello   world") == "hello world"
        assert normalize_text("  spaces  everywhere  ") == "spaces everywhere"
        assert normalize_text("tab\there") == "tab here"
    
    def test_combined_normalization(self):
        """normalize_text applique toutes les transformations."""
        from prism_salesops.normalize import normalize_text
        
        assert normalize_text("  Café   RÉSUMÉ  ") == "cafe resume"
        assert normalize_text("CODE  CLIENT  Facturé") == "code client facture"
    
    def test_handles_none_and_empty(self):
        """normalize_text gère None et chaînes vides."""
        from prism_salesops.normalize import normalize_text
        
        assert normalize_text(None) == ""
        assert normalize_text("") == ""
        assert normalize_text("   ") == ""


class TestCodeNorm:
    """Tests pour code_norm() - normalisation de codes."""
    
    def test_uppercase(self):
        """code_norm convertit en majuscules."""
        from prism_salesops.normalize import code_norm
        
        assert code_norm("abc123") == "ABC123"
        assert code_norm("Art001") == "ART001"
    
    def test_removes_spaces(self):
        """code_norm supprime tous les espaces."""
        from prism_salesops.normalize import code_norm
        
        assert code_norm("ART 001") == "ART001"
        assert code_norm("  CLI  002  ") == "CLI002"
    
    def test_removes_dashes(self):
        """code_norm supprime les tirets."""
        from prism_salesops.normalize import code_norm
        
        assert code_norm("ART-001") == "ART001"
        assert code_norm("CLI-002-A") == "CLI002A"
        assert code_norm("A-B-C") == "ABC"
    
    def test_combined(self):
        """code_norm applique toutes les transformations."""
        from prism_salesops.normalize import code_norm
        
        assert code_norm("art - 001 - a") == "ART001A"
        assert code_norm("  cli-002  ") == "CLI002"
    
    def test_handles_none_and_empty(self):
        """code_norm gère None et chaînes vides."""
        from prism_salesops.normalize import code_norm
        
        assert code_norm(None) == ""
        assert code_norm("") == ""


class TestHeadToken:
    """Tests pour head_token() - extraction du premier bloc alphanumérique."""
    
    def test_extracts_first_token(self):
        """head_token extrait le premier bloc alphanumérique."""
        from prism_salesops.normalize import head_token
        
        assert head_token("ABC123 DEF456") == "ABC123"
        assert head_token("hello world") == "hello"
    
    def test_ignores_leading_special_chars(self):
        """head_token ignore les caractères spéciaux au début."""
        from prism_salesops.normalize import head_token
        
        assert head_token("  ABC123") == "ABC123"
        assert head_token("---TEST---") == "TEST"
        assert head_token("###CODE###") == "CODE"
    
    def test_stops_at_special_char(self):
        """head_token s'arrête au premier caractère spécial."""
        from prism_salesops.normalize import head_token
        
        assert head_token("ABC-123") == "ABC"
        assert head_token("CODE/VERSION") == "CODE"
        assert head_token("TEST.SUFFIX") == "TEST"
    
    def test_handles_empty_and_none(self):
        """head_token gère None et chaînes vides."""
        from prism_salesops.normalize import head_token
        
        assert head_token(None) == ""
        assert head_token("") == ""
        assert head_token("---") == ""  # Que des caractères spéciaux
    
    def test_numbers_only(self):
        """head_token fonctionne avec des nombres seuls."""
        from prism_salesops.normalize import head_token
        
        assert head_token("12345") == "12345"
        assert head_token("12345-67890") == "12345"

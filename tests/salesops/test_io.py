"""
PHASE 0 & 2 - Tests TDD pour les fonctions I/O et détection d'entêtes.
"""

import pytest
import pandas as pd
from pathlib import Path


class TestReadExcelRobust:
    """Tests pour read_excel_robust()."""
    
    def test_reads_clean_excel(self, sample_excel):
        """read_excel_robust charge un fichier Excel propre."""
        from prism_salesops.io import read_excel_robust
        
        df = read_excel_robust(sample_excel)
        
        assert df is not None
        assert len(df) > 0
        assert isinstance(df, pd.DataFrame)
    
    def test_reads_noisy_excel(self, noisy_excel):
        """read_excel_robust charge un fichier avec bruit et trouve les données."""
        from prism_salesops.io import read_excel_robust
        
        df = read_excel_robust(noisy_excel)
        
        assert df is not None
        assert len(df) == 3  # 3 lignes de données réelles
    
    def test_returns_dataframe_with_correct_columns(self, sample_excel):
        """read_excel_robust retourne un DataFrame avec les bonnes colonnes."""
        from prism_salesops.io import read_excel_robust
        
        df = read_excel_robust(sample_excel)
        
        # Doit avoir des colonnes
        assert len(df.columns) > 0
    
    def test_raises_on_nonexistent_file(self, temp_dir):
        """read_excel_robust lève une erreur si fichier inexistant."""
        from prism_salesops.io import read_excel_robust
        
        fake_path = temp_dir / "nonexistent.xlsx"
        
        with pytest.raises(FileNotFoundError):
            read_excel_robust(fake_path)
    
    def test_handles_empty_file(self, temp_dir):
        """read_excel_robust gère les fichiers vides correctement."""
        from prism_salesops.io import read_excel_robust
        
        # Créer un Excel vide
        empty_path = temp_dir / "empty.xlsx"
        pd.DataFrame().to_excel(empty_path, index=False)
        
        df = read_excel_robust(empty_path)
        
        assert df is not None
        assert len(df) == 0


class TestDetectHeaderRow:
    """Tests pour detect_header_row()."""
    
    def test_finds_header_in_first_row(self, sample_dataframe, temp_dir):
        """detect_header_row trouve l'entête en première ligne."""
        from prism_salesops.io import detect_header_row
        
        path = temp_dir / "clean.xlsx"
        sample_dataframe.to_excel(path, index=False)
        
        raw_df = pd.read_excel(path, header=None)
        header_idx = detect_header_row(raw_df)
        
        assert header_idx == 0
    
    def test_finds_header_with_noise_above(self, dataframe_with_noise, temp_dir):
        """detect_header_row trouve l'entête malgré le bruit au-dessus."""
        from prism_salesops.io import detect_header_row
        
        path = temp_dir / "noisy.xlsx"
        dataframe_with_noise.to_excel(path, index=False, header=False)
        
        raw_df = pd.read_excel(path, header=None)
        header_idx = detect_header_row(raw_df)
        
        # L'entête devrait être à la ligne 3 (index 3, après 3 lignes de bruit)
        assert header_idx == 3
    
    def test_raises_if_no_header_found(self, temp_dir):
        """detect_header_row lève une erreur si pas d'entête identifiable."""
        from prism_salesops.io import detect_header_row, HeaderNotFoundError
        
        # DataFrame avec que des données numériques, pas d'entête
        garbage_df = pd.DataFrame({
            "A": [1, 2, 3],
            "B": [4, 5, 6],
            "C": [7, 8, 9],
        })
        path = temp_dir / "garbage.xlsx"
        garbage_df.to_excel(path, index=False, header=False)
        
        raw_df = pd.read_excel(path, header=None)
        
        with pytest.raises(HeaderNotFoundError) as exc_info:
            detect_header_row(raw_df)
        
        assert "Impossible d'identifier la ligne d'entêtes" in str(exc_info.value)

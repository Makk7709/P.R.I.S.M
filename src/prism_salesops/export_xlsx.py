"""
Module d'export Excel multi-feuilles.
"""

import pandas as pd
from pathlib import Path
from typing import Dict, Union


def write_workbook(
    path: Union[str, Path],
    sheets: Dict[str, pd.DataFrame]
) -> None:
    """
    Écrit un workbook Excel avec plusieurs feuilles.
    
    Args:
        path: Chemin du fichier de sortie
        sheets: Dict avec nom_feuille -> DataFrame
    """
    path = Path(path)
    
    with pd.ExcelWriter(path, engine='openpyxl') as writer:
        for sheet_name, df in sheets.items():
            # Gérer les noms de feuilles trop longs (max 31 caractères)
            safe_name = sheet_name[:31]
            
            df.to_excel(writer, sheet_name=safe_name, index=False)

"""
Module I/O pour la lecture robuste des fichiers Excel.
"""

import pandas as pd
from pathlib import Path
from typing import Optional, Union
import re

from .normalize import normalize_text


class HeaderNotFoundError(Exception):
    """Erreur levée quand la ligne d'entêtes ne peut pas être identifiée."""
    
    def __init__(self, message: str, raw_df: Optional[pd.DataFrame] = None):
        super().__init__(message)
        self.raw_df = raw_df
        self.message = message


def detect_header_row(df: pd.DataFrame, max_rows: int = 10) -> int:
    """
    Détecte la ligne d'entêtes dans un DataFrame brut.
    
    Recherche une ligne qui ressemble à des entêtes (beaucoup de texte,
    peu de valeurs nulles, pas que des nombres).
    
    Args:
        df: DataFrame brut (lu sans header)
        max_rows: Nombre max de lignes à scanner
        
    Returns:
        Index de la ligne d'entêtes
        
    Raises:
        HeaderNotFoundError: Si aucune ligne d'entêtes n'est trouvable
    """
    if df.empty:
        raise HeaderNotFoundError(
            "Impossible d'identifier la ligne d'entêtes. "
            "Le fichier semble vide. "
            "Action: vérifier le contenu du fichier.",
            df
        )
    
    # Mots-clés courants dans les entêtes
    header_keywords = [
        "client", "code", "date", "livraison", "article", 
        "produit", "quantité", "quantite", "montant", "prix",
        "désignation", "designation", "rep", "commercial",
        "cp", "postal", "numéro", "numero"
    ]
    
    best_row = -1
    best_score = 0
    
    for idx in range(min(len(df), max_rows)):
        row = df.iloc[idx]
        
        # Compter les valeurs non-nulles
        non_null = row.notna().sum()
        total = len(row)
        
        if non_null < 2:  # Trop peu de valeurs
            continue
        
        # Compter les valeurs textuelles
        text_count = 0
        keyword_count = 0
        
        for val in row:
            if pd.isna(val):
                continue
            
            str_val = str(val)
            
            # Vérifier si c'est du texte (pas un nombre pur)
            try:
                float(str_val)
                # C'est un nombre
            except ValueError:
                text_count += 1
                
                # Vérifier les mots-clés
                normalized = normalize_text(str_val)
                for keyword in header_keywords:
                    if keyword in normalized:
                        keyword_count += 1
                        break
        
        # Score basé sur: proportion de texte + mots-clés
        if total > 0:
            text_ratio = text_count / total
            keyword_ratio = keyword_count / total
            score = text_ratio * 0.4 + keyword_ratio * 0.6 + (non_null / total) * 0.2
            
            if score > best_score:
                best_score = score
                best_row = idx
    
    # Seuil minimum
    if best_score < 0.3 or best_row < 0:
        raise HeaderNotFoundError(
            "Impossible d'identifier la ligne d'entêtes. "
            "Action: supprimer les lignes de titre ou exporter en tableau simple.",
            df
        )
    
    return best_row


def read_excel_robust(
    path: Union[str, Path],
    sheet_name: Optional[Union[str, int]] = 0
) -> pd.DataFrame:
    """
    Lit un fichier Excel de façon robuste.
    
    Détecte automatiquement la ligne d'entêtes même si des lignes
    de bruit sont présentes au-dessus.
    
    Args:
        path: Chemin vers le fichier Excel
        sheet_name: Nom ou index de la feuille à lire (défaut: première feuille)
        
    Returns:
        DataFrame avec les données nettoyées
        
    Raises:
        FileNotFoundError: Si le fichier n'existe pas
        HeaderNotFoundError: Si la ligne d'entêtes n'est pas trouvable
    """
    path = Path(path)
    
    if not path.exists():
        raise FileNotFoundError(f"Fichier introuvable: {path}")
    
    # Lire sans header pour analyser
    raw_df = pd.read_excel(path, sheet_name=sheet_name, header=None)
    
    # Fichier vide
    if raw_df.empty:
        return pd.DataFrame()
    
    # Détecter la ligne d'entêtes
    try:
        header_idx = detect_header_row(raw_df)
    except HeaderNotFoundError:
        # Si pas d'entête trouvée, utiliser la première ligne
        header_idx = 0
    
    # Relire avec le bon header
    df = pd.read_excel(path, sheet_name=sheet_name, header=header_idx)
    
    # Nettoyer les colonnes nommées "Unnamed"
    df.columns = [
        col if not str(col).startswith("Unnamed") else f"Col_{i}"
        for i, col in enumerate(df.columns)
    ]
    
    # Supprimer les lignes entièrement vides
    df = df.dropna(how='all')
    
    return df

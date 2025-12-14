"""
Module de normalisation des textes et codes.
"""

import re
from typing import Optional

try:
    from unidecode import unidecode
except ImportError:
    # Fallback si unidecode n'est pas installé
    def unidecode(text: str) -> str:
        """Fallback basique pour unidecode."""
        replacements = {
            'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
            'à': 'a', 'â': 'a', 'ä': 'a',
            'ù': 'u', 'û': 'u', 'ü': 'u',
            'ô': 'o', 'ö': 'o',
            'î': 'i', 'ï': 'i',
            'ç': 'c', 'ñ': 'n',
            'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
            'À': 'A', 'Â': 'A', 'Ä': 'A',
            'Ù': 'U', 'Û': 'U', 'Ü': 'U',
            'Ô': 'O', 'Ö': 'O',
            'Î': 'I', 'Ï': 'I',
            'Ç': 'C', 'Ñ': 'N',
        }
        for src, dst in replacements.items():
            text = text.replace(src, dst)
        return text


def normalize_text(text: Optional[str]) -> str:
    """
    Normalise un texte pour la comparaison.
    
    - Retire les accents (via unidecode)
    - Convertit en minuscules
    - Réduit les espaces multiples en un seul
    - Strip les espaces en début/fin
    
    Args:
        text: Le texte à normaliser (peut être None)
        
    Returns:
        Le texte normalisé, ou chaîne vide si None/vide
    """
    if text is None:
        return ""
    
    text = str(text)
    
    # Retirer les accents
    text = unidecode(text)
    
    # Minuscules
    text = text.lower()
    
    # Remplacer tabs et autres whitespace par espaces
    text = re.sub(r'\s+', ' ', text)
    
    # Strip
    text = text.strip()
    
    return text


def code_norm(code: Optional[str]) -> str:
    """
    Normalise un code (article, client, etc.).
    
    - Convertit en majuscules
    - Supprime tous les espaces
    - Supprime les tirets
    
    Args:
        code: Le code à normaliser (peut être None)
        
    Returns:
        Le code normalisé, ou chaîne vide si None/vide
    """
    if code is None:
        return ""
    
    code = str(code)
    
    # Majuscules
    code = code.upper()
    
    # Supprimer espaces
    code = code.replace(" ", "")
    
    # Supprimer tirets
    code = code.replace("-", "")
    
    return code


def head_token(text: Optional[str]) -> str:
    """
    Extrait le premier bloc alphanumérique d'un texte.
    
    Ignore les caractères spéciaux au début et s'arrête
    au premier caractère non-alphanumérique.
    
    Args:
        text: Le texte à analyser (peut être None)
        
    Returns:
        Le premier token alphanumérique, ou chaîne vide
    """
    if text is None:
        return ""
    
    text = str(text)
    
    # Trouver le premier bloc alphanumérique
    match = re.search(r'[a-zA-Z0-9]+', text)
    
    if match:
        return match.group(0)
    
    return ""

"""
Module de classification des lignes (logistique, retours, pays, département).
"""

from typing import Optional
import re

from .normalize import normalize_text
from .config import SalesOpsConfig


def is_logistique(
    product_code: Optional[str],
    designation: Optional[str],
    config: SalesOpsConfig
) -> bool:
    """
    Détermine si une ligne est de la logistique (pas un produit).
    
    Recherche des mots-clés dans le code article ou la désignation.
    
    Args:
        product_code: Code article
        designation: Désignation/libellé
        config: Configuration avec les mots-clés
        
    Returns:
        True si c'est une ligne logistique
    """
    keywords = config.logistique_keywords
    
    # Normaliser les textes à vérifier
    code_norm = normalize_text(product_code) if product_code else ""
    desig_norm = normalize_text(designation) if designation else ""
    
    # Chercher les mots-clés
    for keyword in keywords:
        keyword_norm = normalize_text(keyword)
        if keyword_norm in code_norm or keyword_norm in desig_norm:
            return True
    
    return False


def is_return(qty: Optional[float], amount: Optional[float]) -> bool:
    """
    Détermine si une ligne est un retour/avoir.
    
    Un retour est identifié par une quantité ou un montant négatif.
    
    Args:
        qty: Quantité
        amount: Montant vente
        
    Returns:
        True si c'est un retour
    """
    if qty is not None and qty < 0:
        return True
    
    if amount is not None and amount < 0:
        return True
    
    return False


def extract_country(cp: Optional[str]) -> Optional[str]:
    """
    Extrait le pays à partir du code postal.
    
    Supporte France (5 chiffres), Belgique (4 chiffres), Suisse (4 chiffres).
    
    Args:
        cp: Code postal
        
    Returns:
        Code pays ISO (FR, BE, CH) ou None si non identifiable
    """
    if cp is None:
        return None
    
    cp = str(cp).strip()
    
    # Vérifier si c'est numérique
    if not cp.isdigit():
        return None
    
    length = len(cp)
    
    # France: 5 chiffres, commence par 0-9 (sauf 00)
    if length == 5:
        dept = int(cp[:2])
        if 1 <= dept <= 95 or dept >= 97:  # DOM-TOM
            return "FR"
    
    # Belgique et Suisse: 4 chiffres
    if length == 4:
        first = int(cp[0])
        
        # Belgique: 1xxx à 9xxx
        if 1 <= first <= 9:
            cp_int = int(cp)
            # Suisse: généralement 1000-9999 avec certaines plages
            # Suisse: 1xxx-4xxx plus rare, 6xxx-9xxx plus courant
            # Belgique: 1000-9999
            # Heuristique: 1000-1999 (Bruxelles) = BE, 
            # Mais Genève aussi 1200-1299
            
            # Règle simplifiée: 8xxx et 9xxx = CH, reste = BE
            if first >= 8:
                return "CH"
            elif first == 1 and 200 <= int(cp[1:]) <= 299:
                return "CH"  # Genève
            else:
                return "BE"
    
    return None


def extract_dept(cp: Optional[str]) -> Optional[str]:
    """
    Extrait le département français à partir du code postal.
    
    Gère les cas spéciaux: Corse (2A, 2B) et DOM-TOM (97x, 98x).
    
    Args:
        cp: Code postal
        
    Returns:
        Code département (2 ou 3 caractères) ou None si non français
    """
    if cp is None:
        return None
    
    cp = str(cp).strip()
    
    # Doit être 5 chiffres pour la France
    if len(cp) != 5 or not cp.isdigit():
        return None
    
    dept_num = int(cp[:2])
    
    # Vérifier si c'est bien la France
    if not (1 <= dept_num <= 95 or dept_num >= 97):
        return None
    
    # Corse: 20xxx
    if dept_num == 20:
        cp_int = int(cp)
        # 2A: 20000-20190 (Corse-du-Sud)
        # 2B: 20200-20620 (Haute-Corse)
        if cp_int < 20200:
            return "2A"
        else:
            return "2B"
    
    # DOM-TOM: 97xxx, 98xxx
    if dept_num >= 97:
        return cp[:3]  # 971, 972, 973, etc.
    
    # Métropole standard
    return cp[:2].zfill(2)

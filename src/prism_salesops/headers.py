"""
Module de détection et mapping des colonnes.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, field

from .normalize import normalize_text
from .config import SalesOpsConfig


class ColumnDetectionError(Exception):
    """Erreur levée quand des colonnes essentielles manquent."""
    
    def __init__(
        self,
        message: str,
        missing_columns: List[str],
        detected_headers: List[str],
        unrecognized_headers: List[str],
        suggested_aliases: Dict[str, List[str]]
    ):
        super().__init__(message)
        self.message = message
        self.missing_columns = missing_columns
        self.detected_headers = detected_headers
        self.unrecognized_headers = unrecognized_headers
        self.suggested_aliases = suggested_aliases


def detect_columns(
    headers: List[str],
    config: SalesOpsConfig
) -> Dict[str, str]:
    """
    Détecte et mappe les colonnes vers leurs noms canoniques.
    
    Le matching est insensible à la casse et aux accents.
    
    Args:
        headers: Liste des noms de colonnes du fichier
        config: Configuration avec les aliases
        
    Returns:
        Dict mapping nom canonique -> nom original dans le fichier
        
    Raises:
        ColumnDetectionError: Si des colonnes essentielles manquent
    """
    mapping = {}
    recognized = set()
    
    # Normaliser tous les headers
    normalized_headers = {
        normalize_text(h): h 
        for h in headers
    }
    
    # Pour chaque colonne canonique, chercher un match
    for canonical, aliases in config.column_aliases.items():
        # Normaliser les aliases
        normalized_aliases = [normalize_text(a) for a in aliases]
        
        # Chercher un match (priorité: ordre dans la liste d'aliases)
        for norm_alias in normalized_aliases:
            for norm_header, original_header in normalized_headers.items():
                if norm_alias in norm_header or norm_header in norm_alias:
                    if canonical not in mapping:  # Premier match gagne
                        mapping[canonical] = original_header
                        recognized.add(original_header)
                        break
            if canonical in mapping:
                break
    
    # Identifier les headers non reconnus
    unrecognized = [h for h in headers if h not in recognized]
    
    # Vérifier les colonnes essentielles
    missing = []
    for essential in config.essential_columns:
        if essential not in mapping:
            missing.append(essential)
    
    if missing:
        # Construire les suggestions
        suggested = {}
        for col in missing:
            suggested[col] = config.get_aliases(col)
        
        raise ColumnDetectionError(
            message=_build_error_message(missing, headers, unrecognized, suggested),
            missing_columns=missing,
            detected_headers=list(mapping.values()),
            unrecognized_headers=unrecognized,
            suggested_aliases=suggested
        )
    
    return mapping


def _build_error_message(
    missing: List[str],
    headers: List[str],
    unrecognized: List[str],
    suggested: Dict[str, List[str]]
) -> str:
    """Construit le message d'erreur détaillé."""
    parts = []
    
    for col in missing:
        col_name = _get_readable_name(col)
        aliases = suggested.get(col, [])[:5]  # Top 5 aliases
        
        parts.append(
            f"Colonne {col_name} introuvable.\n"
            f"  Entêtes détectées: {headers[:10]}{'...' if len(headers) > 10 else ''}\n"
            f"  Entêtes non reconnues: {unrecognized[:10]}{'...' if len(unrecognized) > 10 else ''}\n"
            f"  Action: renommer votre colonne avec l'un des alias: {aliases}"
        )
    
    return "\n\n".join(parts)


def _get_readable_name(canonical: str) -> str:
    """Convertit un nom canonique en nom lisible."""
    names = {
        "customer_id": "Client",
        "event_date": "Date",
        "delivery_number": "Numéro de livraison",
        "product_code": "Code article",
        "designation": "Désignation",
        "quantity": "Quantité",
        "amount_sales": "Montant vente",
        "amount_purchase": "Montant achat",
        "cp_liv": "Code postal",
        "rep": "Commercial/Rep",
    }
    return names.get(canonical, canonical)


def get_diagnostic(
    headers: List[str],
    config: SalesOpsConfig
) -> Dict:
    """
    Génère un diagnostic complet des colonnes.
    
    Args:
        headers: Liste des noms de colonnes
        config: Configuration
        
    Returns:
        Dict avec le diagnostic (colonnes trouvées, manquantes, suggestions)
    """
    try:
        mapping = detect_columns(headers, config)
        return {
            "success": True,
            "mapping": mapping,
            "missing": [],
            "unrecognized": [h for h in headers if h not in mapping.values()],
            "suggestions": {}
        }
    except ColumnDetectionError as e:
        return {
            "success": False,
            "mapping": {k: v for k, v in zip(
                [c for c in config.column_aliases if c not in e.missing_columns],
                e.detected_headers
            )},
            "missing": e.missing_columns,
            "unrecognized": e.unrecognized_headers,
            "suggestions": e.suggested_aliases
        }

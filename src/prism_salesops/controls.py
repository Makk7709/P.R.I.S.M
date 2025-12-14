"""
Module de contrôles "militaires" - rapport de vérification des données.
"""

import pandas as pd
from typing import Dict, List, Any
from datetime import date
import re

from .config import SalesOpsConfig


def military_controls_report(
    facts: pd.DataFrame,
    config: SalesOpsConfig
) -> Dict[str, Any]:
    """
    Génère un rapport de contrôles "militaires" sur les données.
    
    Vérifie: compteurs, anomalies, exclusions, avertissements.
    
    Args:
        facts: DataFrame facts
        config: Configuration
        
    Returns:
        Dict avec counts, exclusions, anomalies, warnings, dataframe
    """
    counts = {}
    exclusions = {}
    anomalies = {}
    warnings = []
    
    # === COMPTEURS ===
    counts["total_rows"] = len(facts)
    counts["unique_events"] = facts["event_id"].nunique() if "event_id" in facts.columns else 0
    counts["unique_customers"] = facts["customer_id"].nunique() if "customer_id" in facts.columns else 0
    
    # Compteurs de flags
    counts["returns"] = facts["is_return"].sum() if "is_return" in facts.columns else 0
    counts["logistics"] = facts["is_logistique"].sum() if "is_logistique" in facts.columns else 0
    counts["zero_sales"] = facts["is_zero_sale"].sum() if "is_zero_sale" in facts.columns else 0
    
    # === EXCLUSIONS ===
    if "rep_source" in facts.columns:
        excluded_reps = [r.upper() for r in config.exclude_reps]
        zz_mask = facts["rep_source"].fillna("").str.upper().str.strip().isin(excluded_reps)
        exclusions["zz_reps"] = zz_mask.sum()
    else:
        exclusions["zz_reps"] = 0
    
    # === ANOMALIES ===
    # Dates futures
    if "event_date" in facts.columns:
        future_mask = facts["event_date"].apply(
            lambda x: x > config.date_du_jour if isinstance(x, date) else False
        )
        anomalies["future_dates"] = future_mask.sum()
        
        # Dates nulles
        anomalies["null_dates"] = facts["event_date"].isna().sum()
    else:
        anomalies["future_dates"] = 0
        anomalies["null_dates"] = 0
    
    # CP invalides
    if "cp_liv" in facts.columns:
        def is_valid_cp(cp):
            if pd.isna(cp) or cp is None:
                return None  # Null, pas invalide
            cp_str = str(cp).strip()
            if cp_str == "" or cp_str == "None" or cp_str == "nan":
                return None
            # CP valide: 4-5 chiffres
            if re.match(r'^\d{4,5}$', cp_str):
                return True
            return False
        
        cp_validity = facts["cp_liv"].apply(is_valid_cp)
        anomalies["invalid_cp"] = (cp_validity == False).sum()
        anomalies["null_cp"] = cp_validity.isna().sum()
    else:
        anomalies["invalid_cp"] = 0
        anomalies["null_cp"] = 0
    
    # === AVERTISSEMENTS ===
    if anomalies["future_dates"] > 0:
        warnings.append(
            f"⚠️ {anomalies['future_dates']} date(s) dans le futur détectée(s). "
            "Vérifier la cohérence des données."
        )
    
    if anomalies["null_dates"] > 0:
        warnings.append(
            f"⚠️ {anomalies['null_dates']} date(s) manquante(s). "
            "Ces lignes seront exclues des calculs de cadence."
        )
    
    if anomalies["invalid_cp"] > 0:
        warnings.append(
            f"⚠️ {anomalies['invalid_cp']} code(s) postal(aux) invalide(s). "
            "La géolocalisation sera incomplète."
        )
    
    if counts["returns"] > 0:
        pct = counts["returns"] / counts["total_rows"] * 100
        warnings.append(
            f"ℹ️ {counts['returns']} retour(s) détecté(s) ({pct:.1f}%). "
            "Exclus du comptage d'événements."
        )
    
    if counts["logistics"] > 0:
        warnings.append(
            f"ℹ️ {counts['logistics']} ligne(s) logistique(s) détectée(s). "
            "Exclus du comptage d'événements."
        )
    
    if exclusions["zz_reps"] > 0:
        warnings.append(
            f"ℹ️ {exclusions['zz_reps']} ligne(s) avec rep ZZ exclue(s)."
        )
    
    # === DATAFRAME RÉSUMÉ ===
    rows = [
        ("Lignes totales", counts["total_rows"]),
        ("Événements uniques", counts["unique_events"]),
        ("Clients uniques", counts["unique_customers"]),
        ("", ""),
        ("Retours", counts["returns"]),
        ("Logistique", counts["logistics"]),
        ("Ventes à zéro", counts["zero_sales"]),
        ("", ""),
        ("Rep ZZ exclus", exclusions["zz_reps"]),
        ("", ""),
        ("Dates futures", anomalies["future_dates"]),
        ("Dates manquantes", anomalies["null_dates"]),
        ("CP invalides", anomalies["invalid_cp"]),
        ("CP manquants", anomalies["null_cp"]),
    ]
    
    df_summary = pd.DataFrame(rows, columns=["Contrôle", "Valeur"])
    
    return {
        "counts": counts,
        "exclusions": exclusions,
        "anomalies": anomalies,
        "warnings": warnings,
        "dataframe": df_summary
    }

"""
Module de génération des sorties (Détail, Top10, Résumé rep).
"""

import pandas as pd
from typing import Optional

from .config import SalesOpsConfig


def _apply_filters(
    df: pd.DataFrame,
    config: SalesOpsConfig
) -> pd.DataFrame:
    """
    Applique les filtres communs (exclusion ZZ, min_events).
    
    Args:
        df: DataFrame cadence
        config: Configuration
        
    Returns:
        DataFrame filtré
    """
    filtered = df.copy()
    
    # Exclure les reps ZZ (insensible à la casse)
    if "rep_source" in filtered.columns:
        excluded_upper = [r.upper() for r in config.exclude_reps]
        filtered = filtered[
            ~filtered["rep_source"].fillna("").str.upper().str.strip().isin(excluded_upper)
        ]
    
    # Exclure si moins de min_events
    if "n_events" in filtered.columns:
        filtered = filtered[filtered["n_events"] >= config.min_events]
    
    return filtered


def build_detail(
    cadence_df: pd.DataFrame,
    config: SalesOpsConfig
) -> pd.DataFrame:
    """
    Construit le tableau de détail.
    
    Colonnes: Rep | Client | Cadence | Mois depuis | Écart | Nb commandes | Dernière commande
    
    Args:
        cadence_df: DataFrame avec métriques de cadence
        config: Configuration
        
    Returns:
        DataFrame formaté pour l'affichage
    """
    # Appliquer les filtres
    filtered = _apply_filters(cadence_df, config)
    
    # Construire le DataFrame de sortie
    detail = pd.DataFrame({
        "Rep": filtered.get("rep_source", "N/A"),
        "Client": filtered["customer_id"],
        "Cadence": filtered.get("cadence_median_months", 0).round(2),
        "Mois depuis": filtered.get("months_since", 0).round(2),
        "Écart": filtered.get("gap_months", 0).round(2),
        "Nb commandes": filtered.get("n_events", 0),
        "Dernière commande": filtered.get("last_order_date"),
    })
    
    return detail.reset_index(drop=True)


def build_top10(
    cadence_df: pd.DataFrame,
    config: SalesOpsConfig
) -> pd.DataFrame:
    """
    Construit le top 10 des plus gros retards.
    
    Trié par écart décroissant, limité à 10 lignes.
    
    Args:
        cadence_df: DataFrame avec métriques de cadence
        config: Configuration
        
    Returns:
        DataFrame top 10
    """
    # Construire le détail d'abord
    detail = build_detail(cadence_df, config)
    
    # Trier par écart décroissant
    sorted_df = detail.sort_values("Écart", ascending=False)
    
    # Top 10
    return sorted_df.head(10).reset_index(drop=True)


def build_resume_rep(
    cadence_df: pd.DataFrame,
    config: SalesOpsConfig
) -> pd.DataFrame:
    """
    Construit le résumé par représentant.
    
    Agrège: Nb clients, Écart moyen, Écart cumulé (sur écart > 0 uniquement)
    
    Args:
        cadence_df: DataFrame avec métriques de cadence
        config: Configuration
        
    Returns:
        DataFrame résumé par rep
    """
    # Appliquer les filtres de base
    filtered = _apply_filters(cadence_df, config)
    
    # Ne garder que les écarts positifs
    positive_gaps = filtered[filtered.get("gap_months", 0) > 0].copy()
    
    if positive_gaps.empty:
        return pd.DataFrame(columns=["Rep", "Nb clients", "Écart moyen", "Écart cumulé"])
    
    # Grouper par rep
    if "rep_source" not in positive_gaps.columns:
        positive_gaps["rep_source"] = "N/A"
    
    grouped = positive_gaps.groupby("rep_source", dropna=False).agg({
        "customer_id": "count",
        "gap_months": ["mean", "sum"]
    }).reset_index()
    
    # Aplatir les colonnes
    grouped.columns = ["Rep", "Nb clients", "Écart moyen", "Écart cumulé"]
    
    # Arrondir
    grouped["Écart moyen"] = grouped["Écart moyen"].round(2)
    grouped["Écart cumulé"] = grouped["Écart cumulé"].round(2)
    
    return grouped

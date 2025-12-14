"""
Module de calcul de cadence et métriques de retard.
"""

import pandas as pd
import numpy as np
from datetime import date
from typing import Optional

from .config import SalesOpsConfig


def days_to_months(days: float, config: SalesOpsConfig) -> float:
    """
    Convertit des jours en mois selon la constante définie.
    
    Args:
        days: Nombre de jours
        config: Configuration avec days_per_month
        
    Returns:
        Nombre de mois
    """
    return days / config.days_per_month


def compute_cadence_metrics(
    facts: pd.DataFrame,
    config: SalesOpsConfig
) -> pd.DataFrame:
    """
    Calcule les métriques de cadence par client.
    
    Agrège par (rep, customer_id) et calcule:
    - last_order_date: Dernière date de commande
    - n_events: Nombre d'événements (excluant retours et logistique)
    - cadence_median_months: Cadence médiane en mois
    - months_since: Mois depuis dernière commande
    - gap_months: Écart (retard) par rapport à la cadence
    
    Args:
        facts: DataFrame facts avec flags
        config: Configuration
        
    Returns:
        DataFrame avec métriques de cadence par client
    """
    # Filtrer: exclure retours et logistique pour le comptage d'événements
    valid_events = facts[
        (facts["is_return"] == False) & 
        (facts["is_logistique"] == False)
    ].copy()
    
    # Dédoublonner par event_id pour compter les événements uniques
    unique_events = valid_events.drop_duplicates(subset=["event_id"])
    
    # Grouper par customer_id (et rep_source si disponible)
    group_cols = ["customer_id"]
    if "rep_source" in unique_events.columns:
        group_cols = ["rep_source", "customer_id"]
    
    results = []
    
    for name, group in unique_events.groupby(group_cols, dropna=False):
        if isinstance(name, tuple):
            rep = name[0] if len(name) > 1 else None
            customer = name[-1]
        else:
            rep = None
            customer = name
        
        # Dates des événements
        dates = group["event_date"].dropna().sort_values()
        
        if len(dates) == 0:
            continue
        
        # Métriques de base
        last_date = dates.max()
        n_events = len(dates)
        
        # Calcul de la cadence (écarts entre événements)
        if n_events > 1:
            # Convertir en datetime pour calculer les deltas
            dates_dt = pd.to_datetime(dates)
            deltas = dates_dt.diff().dropna()
            
            # Convertir en jours puis en mois
            delta_days = deltas.dt.days.values
            delta_months = [days_to_months(d, config) for d in delta_days]
            
            cadence_median = np.median(delta_months)
        else:
            cadence_median = None
        
        # Mois depuis dernière commande
        if last_date is not None:
            try:
                last_date_obj = last_date if isinstance(last_date, date) else last_date.date()
                days_since = (config.date_du_jour - last_date_obj).days
                months_since = days_to_months(days_since, config)
            except:
                months_since = None
        else:
            months_since = None
        
        # Gap (retard)
        if months_since is not None:
            if cadence_median is not None:
                gap = months_since - cadence_median
            else:
                # Si un seul événement, gap = months_since
                gap = months_since
        else:
            gap = None
        
        results.append({
            "rep_source": rep,
            "customer_id": customer,
            "last_order_date": last_date,
            "n_events": n_events,
            "cadence_median_months": cadence_median,
            "months_since": months_since,
            "gap_months": gap,
        })
    
    return pd.DataFrame(results)

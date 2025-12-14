"""
Module de construction de la table des faits (facts table).
"""

import pandas as pd
import hashlib
from typing import Optional
from datetime import date

from .config import SalesOpsConfig
from .headers import detect_columns
from .classify import is_logistique, is_return, extract_country, extract_dept


def build_facts_table(
    df: pd.DataFrame,
    config: SalesOpsConfig
) -> pd.DataFrame:
    """
    Construit la table des faits canonique à partir d'un DataFrame brut.
    
    Crée les colonnes standardisées et les flags (is_return, is_logistique, is_zero_sale).
    
    Args:
        df: DataFrame source
        config: Configuration
        
    Returns:
        DataFrame avec colonnes canoniques et flags
    """
    # Détecter les colonnes
    headers = list(df.columns)
    mapping = detect_columns(headers, config)
    
    # Créer le DataFrame de sortie
    facts = pd.DataFrame()
    
    # Mapper les colonnes essentielles
    facts["customer_id"] = df[mapping["customer_id"]].astype(str)
    facts["event_date"] = pd.to_datetime(df[mapping["event_date"]], errors='coerce').dt.date
    
    # Colonnes optionnelles
    if "delivery_number" in mapping:
        facts["event_id"] = df[mapping["delivery_number"]].astype(str)
    else:
        # Générer event_id par hash (customer_id + date)
        facts["event_id"] = df.apply(
            lambda row: _generate_event_id(
                row[mapping["customer_id"]],
                row[mapping["event_date"]]
            ),
            axis=1
        )
    
    if "product_code" in mapping:
        facts["product_code"] = df[mapping["product_code"]].astype(str)
    else:
        facts["product_code"] = None
    
    if "designation" in mapping:
        facts["designation"] = df[mapping["designation"]].astype(str)
    else:
        facts["designation"] = None
    
    if "quantity" in mapping:
        facts["qty"] = pd.to_numeric(df[mapping["quantity"]], errors='coerce')
    else:
        facts["qty"] = None
    
    if "amount_sales" in mapping:
        facts["amount_sales"] = pd.to_numeric(df[mapping["amount_sales"]], errors='coerce')
    else:
        facts["amount_sales"] = None
    
    if "amount_purchase" in mapping:
        facts["amount_purchase"] = pd.to_numeric(df[mapping["amount_purchase"]], errors='coerce')
    else:
        facts["amount_purchase"] = None
    
    if "cp_liv" in mapping:
        facts["cp_liv"] = df[mapping["cp_liv"]].astype(str)
    else:
        facts["cp_liv"] = None
    
    if "rep" in mapping:
        facts["rep_source"] = df[mapping["rep"]].astype(str)
    else:
        facts["rep_source"] = None
    
    if "customer_name" in mapping:
        facts["customer_name"] = df[mapping["customer_name"]].astype(str)
    else:
        facts["customer_name"] = None
    
    # Calculer les flags
    facts["is_return"] = facts.apply(
        lambda row: is_return(row["qty"], row["amount_sales"]),
        axis=1
    )
    
    facts["is_logistique"] = facts.apply(
        lambda row: is_logistique(row["product_code"], row["designation"], config),
        axis=1
    )
    
    facts["is_zero_sale"] = facts["amount_sales"].apply(
        lambda x: x == 0 if pd.notna(x) else False
    )
    
    # Extraire pays et département
    facts["country"] = facts["cp_liv"].apply(extract_country)
    facts["dept"] = facts["cp_liv"].apply(extract_dept)
    
    return facts


def _generate_event_id(customer_id, event_date) -> str:
    """
    Génère un event_id unique basé sur customer_id + date.
    
    Les lignes avec même customer_id et même date auront le même event_id.
    """
    if pd.isna(customer_id) or pd.isna(event_date):
        return f"UNK_{hashlib.md5(str(id).encode()).hexdigest()[:8]}"
    
    key = f"{customer_id}_{event_date}"
    return hashlib.md5(key.encode()).hexdigest()[:12]

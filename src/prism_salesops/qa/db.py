"""
Module de gestion DuckDB pour le Q&A PRISM.
Crée les vues normalisées pour les requêtes SQL.
"""

import duckdb
import pandas as pd
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
import threading


class DuckDBManager:
    """Gestionnaire de la base DuckDB pour le Q&A."""
    
    def __init__(self, db_path: Optional[Path] = None):
        """
        Initialise le gestionnaire.
        
        Args:
            db_path: Chemin vers le fichier .duckdb (None = in-memory)
        """
        self.db_path = db_path
        self._conn = None
        self._lock = threading.Lock()
    
    def _get_connection(self) -> duckdb.DuckDBPyConnection:
        """Obtient une connexion à la base."""
        if self._conn is None:
            if self.db_path:
                self._conn = duckdb.connect(str(self.db_path))
            else:
                self._conn = duckdb.connect(":memory:")
        return self._conn
    
    def build(
        self,
        facts_df: pd.DataFrame,
        cr_df: Optional[pd.DataFrame] = None,
        datasets_info: Optional[List[Dict]] = None
    ) -> None:
        """
        Construit la base DuckDB avec les vues.
        
        Args:
            facts_df: DataFrame des faits (ventes)
            cr_df: DataFrame des comptes-rendus (optionnel)
            datasets_info: Infos sur les datasets uploadés
        """
        conn = self._get_connection()
        
        # Créer les tables de base
        conn.execute("DROP TABLE IF EXISTS facts_sales")
        conn.register("facts_sales_temp", facts_df)
        conn.execute("CREATE TABLE facts_sales AS SELECT * FROM facts_sales_temp")
        
        # Créer les vues (en passant les colonnes disponibles)
        available_columns = set(facts_df.columns.tolist())
        self._create_views(conn, available_columns)
        
        # Ingérer les CR si fournis
        if cr_df is not None and not cr_df.empty:
            conn.execute("DROP TABLE IF EXISTS facts_cr")
            conn.register("facts_cr_temp", cr_df)
            conn.execute("CREATE TABLE facts_cr AS SELECT * FROM facts_cr_temp")
            self._create_cr_view(conn)
        
        # Créer la vue des datasets
        self._create_datasets_view(conn, facts_df, datasets_info)
        
        # Créer la vue des contrôles
        self._create_controls_view(conn, facts_df)
    
    def _create_views(self, conn: duckdb.DuckDBPyConnection, available_columns: set) -> None:
        """Crée les vues de ventes de manière dynamique selon les colonnes disponibles."""
        
        # Colonnes optionnelles avec valeurs par défaut
        def safe_column(col: str, default: str = "NULL") -> str:
            if col in available_columns:
                return col
            return f"{default} AS {col}"
        
        # Colonnes de base (requises)
        base_cols = [
            "dataset_id", "event_id", "event_date", "customer_id"
        ]
        
        # Colonnes optionnelles pour v_sales_lines
        optional_cols_lines = {
            "customer_name": "CAST(NULL AS VARCHAR) AS customer_name",
            "cp_liv": "CAST(NULL AS VARCHAR) AS cp_liv",
            "dept": "CAST(NULL AS VARCHAR) AS dept",
            "country": "CAST(NULL AS VARCHAR) AS country",
            "rep_source": "CAST(NULL AS VARCHAR) AS rep_source",
            "product_code": "CAST(NULL AS VARCHAR) AS product_code",
            "product_family": "CAST(NULL AS VARCHAR) AS product_family",
            "qty": "0 AS qty",
            "amount_sales": "0 AS amount_sales",
            "amount_purchase": "0 AS amount_purchase",
            "is_return": "FALSE AS is_return",
            "is_logistique": "FALSE AS is_logistique",
            "is_zero_sale": "FALSE AS is_zero_sale",
        }
        
        # Construire le SELECT pour v_sales_lines
        select_parts = []
        for col in base_cols:
            if col in available_columns:
                select_parts.append(col)
            else:
                select_parts.append(f"CAST(NULL AS VARCHAR) AS {col}")
        
        for col, default_expr in optional_cols_lines.items():
            if col in available_columns:
                select_parts.append(col)
            else:
                select_parts.append(default_expr)
        
        # Ajouter margin calculé si amount_sales et amount_purchase existent
        if "amount_sales" in available_columns and "amount_purchase" in available_columns:
            select_parts.append("amount_sales - COALESCE(amount_purchase, 0) AS margin")
        else:
            select_parts.append("0 AS margin")
        
        select_clause = ",\n                ".join(select_parts)
        
        # Créer v_sales_lines
        conn.execute(f"""
            CREATE OR REPLACE VIEW v_sales_lines AS
            SELECT
                {select_clause}
            FROM facts_sales
        """)
        
        # Construire v_sales_events avec agrégations
        # Colonnes MAX pour les attributs
        max_cols = []
        for col in ["customer_name", "cp_liv", "dept", "country", "rep_source"]:
            if col in available_columns:
                max_cols.append(f"MAX({col}) AS {col}")
        
        # Agrégations numériques
        agg_parts = [
            "dataset_id",
            "event_id",
            "MIN(event_date) AS event_date",
            "customer_id",
        ]
        agg_parts.extend(max_cols)
        
        # Construire la condition WHERE pour les exclusions
        has_return = "is_return" in available_columns
        has_logistique = "is_logistique" in available_columns
        
        if has_return and has_logistique:
            exclude_condition = "COALESCE(is_return, FALSE) = FALSE AND COALESCE(is_logistique, FALSE) = FALSE"
        elif has_return:
            exclude_condition = "COALESCE(is_return, FALSE) = FALSE"
        elif has_logistique:
            exclude_condition = "COALESCE(is_logistique, FALSE) = FALSE"
        else:
            exclude_condition = "TRUE"  # Pas de filtres si les colonnes n'existent pas
        
        # Sommes conditionnelles si les colonnes existent
        if "qty" in available_columns:
            agg_parts.append(f"""SUM(CASE WHEN {exclude_condition} THEN qty ELSE 0 END) AS qty_total""")
        else:
            agg_parts.append("0 AS qty_total")
        
        if "amount_sales" in available_columns:
            agg_parts.append(f"""SUM(CASE WHEN {exclude_condition} THEN amount_sales ELSE 0 END) AS amount_sales""")
            if "amount_purchase" in available_columns:
                agg_parts.append(f"""SUM(CASE WHEN {exclude_condition} THEN amount_purchase ELSE 0 END) AS amount_purchase""")
                agg_parts.append(f"""SUM(CASE WHEN {exclude_condition} THEN amount_sales - COALESCE(amount_purchase, 0) ELSE 0 END) AS margin""")
            else:
                agg_parts.append("0 AS amount_purchase")
                agg_parts.append(f"""SUM(CASE WHEN {exclude_condition} THEN amount_sales ELSE 0 END) AS margin""")
        else:
            agg_parts.extend(["0 AS amount_sales", "0 AS amount_purchase", "0 AS margin"])
        
        # Flags booléens (utiliser les variables déjà définies)
        if has_return:
            agg_parts.append("BOOL_OR(is_return) AS has_return")
        else:
            agg_parts.append("FALSE AS has_return")
        
        if has_logistique:
            agg_parts.append("BOOL_OR(is_logistique) AS has_logistique")
        else:
            agg_parts.append("FALSE AS has_logistique")
        
        agg_parts.append("COUNT(*) AS line_count")
        
        select_agg = ",\n                ".join(agg_parts)
        
        # Créer v_sales_events
        conn.execute(f"""
            CREATE OR REPLACE VIEW v_sales_events AS
            SELECT
                {select_agg}
            FROM facts_sales
            GROUP BY dataset_id, event_id, customer_id
        """)
    
    def _create_cr_view(self, conn: duckdb.DuckDBPyConnection) -> None:
        """Crée la vue des comptes-rendus."""
        conn.execute("""
            CREATE OR REPLACE VIEW v_cr_notes AS
            SELECT
                dataset_id,
                cr_id,
                cr_date,
                customer_id,
                rep,
                text,
                tags
            FROM facts_cr
        """)
    
    def _create_datasets_view(
        self,
        conn: duckdb.DuckDBPyConnection,
        facts_df: pd.DataFrame,
        datasets_info: Optional[List[Dict]] = None
    ) -> None:
        """Crée la vue des datasets."""
        
        # Agréger les infos par dataset_id
        dataset_stats = facts_df.groupby("dataset_id").agg({
            "event_id": "count",
            "customer_id": "nunique",
            "amount_sales": "sum"
        }).reset_index()
        
        dataset_stats.columns = ["dataset_id", "row_count", "customer_count", "total_sales"]
        dataset_stats["upload_timestamp"] = datetime.now().isoformat()
        
        conn.execute("DROP TABLE IF EXISTS datasets_meta")
        conn.register("datasets_meta_temp", dataset_stats)
        conn.execute("CREATE TABLE datasets_meta AS SELECT * FROM datasets_meta_temp")
        
        conn.execute("""
            CREATE OR REPLACE VIEW v_datasets AS
            SELECT * FROM datasets_meta
        """)
    
    def _create_controls_view(
        self,
        conn: duckdb.DuckDBPyConnection,
        facts_df: pd.DataFrame
    ) -> None:
        """Crée la vue des contrôles."""
        
        controls = [
            ("total_rows", len(facts_df)),
            ("unique_events", facts_df["event_id"].nunique() if "event_id" in facts_df.columns else 0),
            ("unique_customers", facts_df["customer_id"].nunique() if "customer_id" in facts_df.columns else 0),
            ("returns", facts_df["is_return"].sum() if "is_return" in facts_df.columns else 0),
            ("logistics", facts_df["is_logistique"].sum() if "is_logistique" in facts_df.columns else 0),
            ("zero_sales", facts_df["is_zero_sale"].sum() if "is_zero_sale" in facts_df.columns else 0),
        ]
        
        controls_df = pd.DataFrame(controls, columns=["key", "value"])
        controls_df["note"] = ""
        
        conn.execute("DROP TABLE IF EXISTS controls_data")
        conn.register("controls_temp", controls_df)
        conn.execute("CREATE TABLE controls_data AS SELECT * FROM controls_temp")
        
        conn.execute("""
            CREATE OR REPLACE VIEW v_controls AS
            SELECT key, value, note FROM controls_data
        """)
    
    def query(
        self,
        sql: str,
        params: Optional[Dict[str, Any]] = None,
        timeout_sec: int = 5
    ) -> pd.DataFrame:
        """
        Exécute une requête SQL.
        
        Args:
            sql: Requête SQL
            params: Paramètres (pour requêtes préparées)
            timeout_sec: Timeout en secondes
            
        Returns:
            DataFrame avec les résultats
        """
        conn = self._get_connection()
        
        with self._lock:
            try:
                if params:
                    # Convertir dict en tuple/list si nécessaire
                    if isinstance(params, dict):
                        # Si params est un dict, extraire les valeurs dans l'ordre
                        # (pour compatibilité avec certains anciens appels)
                        param_values = list(params.values())
                        result = conn.execute(sql, param_values).fetchdf()
                    else:
                        result = conn.execute(sql, params).fetchdf()
                else:
                    result = conn.execute(sql).fetchdf()
                return result
            except Exception as e:
                raise RuntimeError(f"Erreur SQL: {e}")
    
    def list_views(self) -> List[str]:
        """Liste les vues disponibles."""
        conn = self._get_connection()
        result = conn.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_type = 'VIEW'
        """).fetchdf()
        return result["table_name"].tolist()
    
    def list_tables(self) -> List[str]:
        """Liste les tables disponibles."""
        conn = self._get_connection()
        result = conn.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_type = 'BASE TABLE'
        """).fetchdf()
        return result["table_name"].tolist()
    
    def get_schema(self, view_name: str) -> pd.DataFrame:
        """Obtient le schéma d'une vue."""
        conn = self._get_connection()
        return conn.execute(f"DESCRIBE {view_name}").fetchdf()
    
    def close(self) -> None:
        """Ferme la connexion."""
        if self._conn:
            self._conn.close()
            self._conn = None

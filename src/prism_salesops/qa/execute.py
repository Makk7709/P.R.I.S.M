"""
Exécuteur SQL avec contrôles.
"""

import pandas as pd
import time
from typing import Optional, Dict, Any
from .db import DuckDBManager
from .schema import SqlPlan, ExplainInfo, SECURITY_CONFIG


class SqlExecutor:
    """Exécute les requêtes SQL avec contrôles."""
    
    def __init__(self, db_manager: DuckDBManager):
        self.db_manager = db_manager
    
    def execute(
        self,
        plan: SqlPlan,
        max_rows: int = 1000
    ) -> Dict[str, Any]:
        """
        Exécute un plan SQL.
        
        Returns:
            Dict avec df, stats, execution_time, explain
        """
        start_time = time.time()
        
        try:
            # Exécuter la requête
            df = self.db_manager.query(
                plan.query,
                timeout_sec=SECURITY_CONFIG["sql_timeout_sec"]
            )
            
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            # Tronquer si trop de lignes
            truncated = False
            if len(df) > max_rows:
                df = df.head(max_rows)
                truncated = True
            
            # Calculer les stats
            stats = {
                "row_count": len(df),
                "column_count": len(df.columns),
                "truncated": truncated,
            }
            
            # Construire l'info explain
            explain = ExplainInfo(
                sql=plan.query,
                params=plan.params,
                period=plan.filters.get("period"),
                exclusions={
                    "retours": "exclus",
                    "logistique": "exclus",
                },
                sample_sizes={"lignes_retournées": len(df)},
                execution_time_ms=execution_time_ms,
            )
            
            return {
                "success": True,
                "df": df,
                "stats": stats,
                "execution_time_ms": execution_time_ms,
                "explain": explain,
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "df": pd.DataFrame(),
                "stats": {},
                "execution_time_ms": int((time.time() - start_time) * 1000),
                "explain": ExplainInfo(sql=plan.query),
            }

"""
Module d'audit trail pour Ask PRISM.
Stocke toutes les interactions pour traçabilité complète.
"""

import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path
import pandas as pd

from .schema import QuestionIntent, QaAnswer, ExplainInfo, Citation
from .db import DuckDBManager


class AuditLogger:
    """Gestionnaire d'audit trail pour Ask PRISM."""
    
    def __init__(self, db_manager: DuckDBManager):
        """
        Initialise le logger d'audit.
        
        Args:
            db_manager: Instance DuckDBManager pour stocker les logs
        """
        self.db_manager = db_manager
        self._ensure_audit_table()
    
    def _ensure_audit_table(self):
        """Crée la table d'audit si elle n'existe pas."""
        conn = self.db_manager._get_connection()
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_qa (
                audit_id VARCHAR PRIMARY KEY,
                timestamp TIMESTAMP NOT NULL,
                question TEXT NOT NULL,
                intent VARCHAR NOT NULL,
                answer_md TEXT,
                sql_query TEXT,
                sql_params TEXT,
                execution_time_ms INTEGER,
                row_count INTEGER,
                filters TEXT,
                period_start DATE,
                period_end DATE,
                exclusions TEXT,
                sample_sizes TEXT,
                citations_count INTEGER,
                dataset_id VARCHAR,
                user_params TEXT,
                controls TEXT,
                error_message TEXT
            )
        """)
    
    def log_interaction(
        self,
        question: str,
        answer: QaAnswer,
        explain: Optional[ExplainInfo] = None,
        dataset_id: Optional[str] = None,
        user_params: Optional[Dict] = None,
        error: Optional[str] = None
    ) -> str:
        """
        Enregistre une interaction dans l'audit trail.
        
        Args:
            question: Question posée
            answer: Réponse générée
            explain: Informations d'explication (SQL, contrôles)
            dataset_id: ID du dataset utilisé
            user_params: Paramètres utilisateur (période, filtres, etc.)
            error: Message d'erreur si applicable
            
        Returns:
            ID de l'audit entry
        """
        audit_id = f"audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{abs(hash(question)) % 100000}"
        timestamp = datetime.now()
        
        # Préparer les données
        explain_info = explain or answer.explain
        
        sql_query = None
        if explain_info and explain_info.sql:
            sql_query = explain_info.sql[:10000]  # Limiter à 10k caractères
        
        sql_params = None
        if explain_info and explain_info.params:
            sql_params = json.dumps(explain_info.params)
        
        execution_time = None
        if explain_info and explain_info.execution_time_ms is not None:
            execution_time = explain_info.execution_time_ms
        
        filters_json = None
        if answer.explain and answer.explain.params:
            filters_json = json.dumps(answer.explain.params)
        elif explain_info and explain_info.params:
            filters_json = json.dumps(explain_info.params)
        
        period_start = None
        period_end = None
        if explain_info and explain_info.period:
            period_start_str = explain_info.period.get("start")
            period_end_str = explain_info.period.get("end")
            if period_start_str:
                try:
                    period_start = datetime.fromisoformat(period_start_str).date()
                except (ValueError, AttributeError):
                    try:
                        period_start = datetime.strptime(period_start_str, "%Y-%m-%d").date()
                    except (ValueError, AttributeError):
                        pass
            if period_end_str:
                try:
                    period_end = datetime.fromisoformat(period_end_str).date()
                except (ValueError, AttributeError):
                    try:
                        period_end = datetime.strptime(period_end_str, "%Y-%m-%d").date()
                    except (ValueError, AttributeError):
                        pass
        
        exclusions_json = None
        if explain_info and explain_info.exclusions:
            exclusions_json = json.dumps(explain_info.exclusions)
        
        sample_sizes_json = None
        if explain_info and explain_info.sample_sizes:
            sample_sizes_json = json.dumps(explain_info.sample_sizes)
        
        row_count = None
        if answer.tables:
            for df in answer.tables.values():
                if isinstance(df, pd.DataFrame):
                    row_count = len(df)
                    break
        
        user_params_json = None
        if user_params:
            user_params_json = json.dumps(user_params)
        
        controls_json = None
        if explain_info and explain_info.sample_sizes:
            controls_json = json.dumps(explain_info.sample_sizes)
        
        answer_md_truncated = answer.answer_md[:5000] if answer.answer_md else None
        
        error_truncated = None
        if error:
            error_truncated = error[:1000]
        
        # Insérer dans DuckDB
        conn = self.db_manager._get_connection()
        
        conn.execute("""
            INSERT INTO audit_qa (
                audit_id, timestamp, question, intent, answer_md,
                sql_query, sql_params, execution_time_ms, row_count,
                filters, period_start, period_end, exclusions,
                sample_sizes, citations_count, dataset_id,
                user_params, controls, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            audit_id, timestamp, question, answer.intent.value,
            answer_md_truncated,
            sql_query,
            sql_params,
            execution_time,
            row_count,
            filters_json,
            period_start,
            period_end,
            exclusions_json,
            sample_sizes_json,
            len(answer.citations) if answer.citations else 0,
            dataset_id,
            user_params_json,
            controls_json,
            error_truncated,
        ))
        
        return audit_id
    
    def get_audit_trail(
        self,
        dataset_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        intent: Optional[QuestionIntent] = None,
        limit: int = 100
    ) -> pd.DataFrame:
        """
        Récupère l'audit trail selon des critères.
        
        Args:
            dataset_id: Filtrer par dataset
            start_date: Date de début
            end_date: Date de fin
            intent: Filtrer par intent
            limit: Nombre max de résultats
            
        Returns:
            DataFrame avec l'audit trail
        """
        query_parts = ["SELECT * FROM audit_qa WHERE 1=1"]
        params = []
        param_idx = 1
        
        if dataset_id:
            query_parts.append(f" AND dataset_id = ${param_idx}")
            params.append(dataset_id)
            param_idx += 1
        
        if start_date:
            query_parts.append(f" AND timestamp >= ${param_idx}")
            params.append(start_date)
            param_idx += 1
        
        if end_date:
            query_parts.append(f" AND timestamp <= ${param_idx}")
            params.append(end_date)
            param_idx += 1
        
        if intent:
            query_parts.append(f" AND intent = ${param_idx}")
            params.append(intent.value)
            param_idx += 1
        
        query_parts.append(f" ORDER BY timestamp DESC LIMIT ${param_idx}")
        params.append(limit)
        
        query = "".join(query_parts)
        
        # DuckDB.execute() accepte les paramètres comme tuple/liste
        return self.db_manager.query(query, params=params if params else None)
    
    def get_audit_entry(self, audit_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupère une entrée d'audit spécifique.
        
        Args:
            audit_id: ID de l'entrée d'audit
            
        Returns:
            Dict avec les détails de l'entrée, ou None
        """
        result = self.db_manager.query(
            "SELECT * FROM audit_qa WHERE audit_id = $1",
            params=[audit_id]
        )
        
        if result.empty:
            return None
        
        row = result.iloc[0]
        
        return {
            "audit_id": str(row["audit_id"]),
            "timestamp": row["timestamp"],
            "question": str(row["question"]),
            "intent": str(row["intent"]),
            "answer_md": str(row["answer_md"]) if pd.notna(row["answer_md"]) else "",
            "sql_query": str(row["sql_query"]) if pd.notna(row["sql_query"]) else None,
            "sql_params": json.loads(row["sql_params"]) if pd.notna(row["sql_params"]) else {},
            "execution_time_ms": int(row["execution_time_ms"]) if pd.notna(row["execution_time_ms"]) else None,
            "row_count": int(row["row_count"]) if pd.notna(row["row_count"]) else None,
            "filters": json.loads(row["filters"]) if pd.notna(row["filters"]) else {},
            "period": {
                "start": str(row["period_start"])[:10] if pd.notna(row["period_start"]) else None,  # Prendre seulement la date (YYYY-MM-DD)
                "end": str(row["period_end"])[:10] if pd.notna(row["period_end"]) else None,
            },
            "exclusions": json.loads(row["exclusions"]) if pd.notna(row["exclusions"]) else {},
            "sample_sizes": json.loads(row["sample_sizes"]) if pd.notna(row["sample_sizes"]) else {},
            "citations_count": int(row["citations_count"]) if pd.notna(row["citations_count"]) else 0,
            "dataset_id": str(row["dataset_id"]) if pd.notna(row["dataset_id"]) else None,
            "user_params": json.loads(row["user_params"]) if pd.notna(row["user_params"]) else {},
            "controls": json.loads(row["controls"]) if pd.notna(row["controls"]) else {},
            "error_message": str(row["error_message"]) if pd.notna(row["error_message"]) else None,
        }
    
    def export_audit_trail(
        self,
        output_path: Path,
        format: str = "xlsx",
        **filters
    ) -> Path:
        """
        Exporte l'audit trail vers un fichier.
        
        Args:
            output_path: Chemin de sortie
            format: Format d'export ('xlsx', 'csv', 'json')
            **filters: Filtres à appliquer (voir get_audit_trail)
            
        Returns:
            Chemin du fichier créé
        """
        df = self.get_audit_trail(**filters)
        
        if format == "xlsx":
            df.to_excel(output_path, index=False)
        elif format == "csv":
            df.to_csv(output_path, index=False)
        elif format == "json":
            df.to_json(output_path, orient="records", date_format="iso")
        else:
            raise ValueError(f"Format non supporté: {format}")
        
        return output_path

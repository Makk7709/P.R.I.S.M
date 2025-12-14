"""
Moteur Q&A principal - Orchestre router, text2sql, execute, composer.
"""

import pandas as pd
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime

from .schema import (
    QuestionIntent, QaAnswer, ConversationState, 
    DatasetInfo, ExplainInfo, Citation, SECURITY_CONFIG
)
from .db import DuckDBManager
from .router import QuestionRouter
from .text2sql import Text2SqlGenerator
from .execute import SqlExecutor
from .composer import AnswerComposer
from .audit import AuditLogger


class AskPrismEngine:
    """
    Moteur Q&A PRISM - Point d'entrée principal.
    
    Usage:
        engine = AskPrismEngine()
        engine.load_data(facts_df, cr_df=None)
        answer = engine.ask("Quel est le CA par département ?")
    """
    
    def __init__(self, db_path: Optional[Path] = None):
        """
        Initialise le moteur.
        
        Args:
            db_path: Chemin vers le fichier DuckDB (None = in-memory)
        """
        self.db_manager = DuckDBManager(db_path)
        self.router = QuestionRouter()
        self.text2sql = Text2SqlGenerator()
        self.executor = SqlExecutor(self.db_manager)
        self.composer = AnswerComposer()
        self.audit_logger = AuditLogger(self.db_manager)
        
        self.state = ConversationState()
        self.datasets: Dict[str, DatasetInfo] = {}
        self._is_loaded = False
    
    def load_data(
        self,
        facts_df: pd.DataFrame,
        cr_df: Optional[pd.DataFrame] = None,
        filename: str = "upload",
    ) -> DatasetInfo:
        """
        Charge les données dans DuckDB.
        
        Args:
            facts_df: DataFrame des faits (ventes)
            cr_df: DataFrame des comptes-rendus (optionnel)
            filename: Nom du fichier source
            
        Returns:
            DatasetInfo avec l'ID du dataset
        """
        timestamp = datetime.now()
        dataset_id = DatasetInfo.generate_id(filename, timestamp)
        
        # Ajouter dataset_id si absent
        if "dataset_id" not in facts_df.columns:
            facts_df = facts_df.copy()
            facts_df["dataset_id"] = dataset_id
        
        if cr_df is not None and "dataset_id" not in cr_df.columns:
            cr_df = cr_df.copy()
            cr_df["dataset_id"] = dataset_id
        
        # Construire DuckDB
        self.db_manager.build(facts_df=facts_df, cr_df=cr_df)
        
        # Enregistrer le dataset
        info = DatasetInfo(
            dataset_id=dataset_id,
            filename=filename,
            upload_timestamp=timestamp,
            row_count=len(facts_df),
            column_count=len(facts_df.columns),
        )
        self.datasets[dataset_id] = info
        self._is_loaded = True
        
        return info
    
    def ask(
        self,
        question: str,
        dataset_id: Optional[str] = None,
    ) -> QaAnswer:
        """
        Pose une question et obtient une réponse.
        
        Args:
            question: Question en langage naturel
            dataset_id: ID du dataset à interroger (None = tous)
            
        Returns:
            QaAnswer avec réponse, tables, citations, explain
        """
        if not self._is_loaded:
            return QaAnswer(
                intent=QuestionIntent.NEED_CLARIFICATION,
                answer_md="⚠️ Aucune donnée chargée. Uploadez un fichier Excel d'abord.",
            )
        
        # 1. Router la question
        route_result = self.router.route(question, self.state)
        intent = route_result["intent"]
        
        # 2. Si clarification nécessaire
        if intent == QuestionIntent.NEED_CLARIFICATION:
            answer = self.composer.compose(intent, route_result)
            # Logger dans l'audit trail
            try:
                self.audit_logger.log_interaction(
                    question=question,
                    answer=answer,
                    dataset_id=dataset_id,
                )
            except Exception:
                pass
            return answer
        
        # 3. Préparer les contraintes
        constraints = {
            "max_rows": SECURITY_CONFIG["max_result_rows"],
        }
        if dataset_id:
            constraints["dataset_id"] = dataset_id
        
        # 4. Selon l'intent
        if intent == QuestionIntent.STRUCTURED:
            return self._handle_structured(question, constraints)
        
        elif intent == QuestionIntent.QUALITATIVE:
            return self._handle_qualitative(question, constraints)
        
        elif intent == QuestionIntent.HYBRID:
            return self._handle_hybrid(question, constraints)
        
        # Fallback
        return self._handle_structured(question, constraints)
    
    def _handle_structured(
        self,
        question: str,
        constraints: Dict
    ) -> QaAnswer:
        """Traite une question structurée (SQL)."""
        # Générer le SQL
        schema = {"views": self.db_manager.list_views()}
        plan = self.text2sql.generate(question, schema, constraints)
        
        # Exécuter
        result = self.executor.execute(plan)
        
        # Composer la réponse
        answer = self.composer.compose(
            QuestionIntent.STRUCTURED,
            sql_result=result,
            question=question,
        )
        
        # Logger dans l'audit trail
        try:
            self.audit_logger.log_interaction(
                question=question,
                answer=answer,
                explain=result.get("explain"),
                dataset_id=constraints.get("dataset_id"),
                user_params=constraints,
            )
        except Exception:
            pass  # Ne pas faire échouer la requête si l'audit échoue
        
        # Mettre à jour l'historique
        self.state.add_turn(question, answer.answer_md)
        
        return answer
    
    def _handle_qualitative(
        self,
        question: str,
        constraints: Dict
    ) -> QaAnswer:
        """Traite une question qualitative (CR)."""
        # Rechercher dans les CR
        citations = self._search_cr(question, constraints)
        
        # Composer la réponse
        answer = self.composer.compose(
            QuestionIntent.QUALITATIVE,
            citations=citations,
            question=question,
        )
        
        # Logger dans l'audit trail
        try:
            self.audit_logger.log_interaction(
                question=question,
                answer=answer,
                dataset_id=constraints.get("dataset_id"),
                user_params=constraints,
            )
        except Exception:
            pass
        
        self.state.add_turn(question, answer.answer_md)
        return answer
    
    def _handle_hybrid(
        self,
        question: str,
        constraints: Dict
    ) -> QaAnswer:
        """Traite une question hybride (SQL + CR)."""
        # SQL d'abord
        schema = {"views": self.db_manager.list_views()}
        plan = self.text2sql.generate(question, schema, constraints)
        sql_result = self.executor.execute(plan)
        
        # CR ensuite
        citations = self._search_cr(question, constraints)
        
        # Composer
        answer = self.composer.compose(
            QuestionIntent.HYBRID,
            sql_result=sql_result,
            citations=citations,
            question=question,
        )
        
        # Logger dans l'audit trail
        try:
            self.audit_logger.log_interaction(
                question=question,
                answer=answer,
                explain=sql_result.get("explain"),
                dataset_id=constraints.get("dataset_id"),
                user_params=constraints,
            )
        except Exception:
            pass
        
        self.state.add_turn(question, answer.answer_md)
        return answer
    
    def _search_cr(
        self,
        question: str,
        constraints: Dict
    ) -> List[Citation]:
        """Recherche dans les comptes-rendus."""
        try:
            # Vérifier si v_cr_notes existe
            if "v_cr_notes" not in self.db_manager.list_views():
                return []
            
            # Recherche simple par mots-clés (BM25 simplifié)
            keywords = question.lower().split()
            keywords = [k for k in keywords if len(k) > 3]
            
            if not keywords:
                return []
            
            # Construire la requête
            like_clauses = " OR ".join([f"LOWER(text) LIKE '%{kw}%'" for kw in keywords[:5]])
            
            sql = f"""
            SELECT cr_id, cr_date, customer_id, rep, text
            FROM v_cr_notes
            WHERE {like_clauses}
            LIMIT 10
            """
            
            df = self.db_manager.query(sql)
            
            citations = []
            for _, row in df.iterrows():
                citations.append(Citation(
                    cr_id=str(row["cr_id"]),
                    cr_date=row["cr_date"],
                    customer_id=str(row["customer_id"]),
                    rep=str(row["rep"]) if pd.notna(row.get("rep")) else None,
                    snippet=str(row["text"])[:200],
                ))
            
            return citations
            
        except Exception:
            return []
    
    def get_explain(self, answer: QaAnswer) -> str:
        """Retourne le mode Explain formaté."""
        return answer.to_markdown(show_explain=True)
    
    def clear_state(self):
        """Réinitialise l'état de conversation."""
        self.state = ConversationState()

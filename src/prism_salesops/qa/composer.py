"""
Compositeur de réponses.
"""

import pandas as pd
from typing import Optional, List, Dict, Any
from .schema import QaAnswer, QuestionIntent, ExplainInfo, Citation


class AnswerComposer:
    """Compose les réponses finales."""
    
    def __init__(self, llm_client: Optional[Any] = None):
        self.llm_client = llm_client
    
    def compose(
        self,
        intent: QuestionIntent,
        sql_result: Optional[Dict] = None,
        citations: Optional[List[Citation]] = None,
        explain: Optional[ExplainInfo] = None,
        question: str = ""
    ) -> QaAnswer:
        """
        Compose une réponse complète.
        
        Returns:
            QaAnswer formatée
        """
        citations = citations or []
        
        if intent == QuestionIntent.NEED_CLARIFICATION:
            return self._compose_clarification(sql_result)
        
        if intent == QuestionIntent.QUALITATIVE:
            return self._compose_qualitative(citations, explain, question)
        
        if intent == QuestionIntent.HYBRID:
            return self._compose_hybrid(sql_result, citations, explain, question)
        
        # STRUCTURED par défaut
        return self._compose_structured(sql_result, explain, question)
    
    def _compose_structured(
        self,
        sql_result: Optional[Dict],
        explain: Optional[ExplainInfo],
        question: str
    ) -> QaAnswer:
        """Compose une réponse structurée (chiffres)."""
        if not sql_result or not sql_result.get("success"):
            error_explain = sql_result.get("explain") if sql_result else explain
            return QaAnswer(
                intent=QuestionIntent.STRUCTURED,
                answer_md="❌ Erreur lors de l'exécution de la requête.",
                explain=error_explain,
            )
        
        df = sql_result.get("df", pd.DataFrame())
        stats = sql_result.get("stats", {})
        
        if df.empty:
            empty_explain = sql_result.get("explain") if sql_result else explain
            return QaAnswer(
                intent=QuestionIntent.STRUCTURED,
                answer_md="📭 Aucune donnée trouvée pour cette requête.",
                explain=empty_explain,
            )
        
        # Générer le résumé
        answer_parts = [f"### 📊 Résultats\n"]
        
        # Résumé rapide
        if len(df) == 1 and len(df.columns) <= 3:
            # Résultat simple (ex: total)
            for col in df.columns:
                val = df.iloc[0][col]
                if isinstance(val, (int, float)):
                    answer_parts.append(f"**{col}**: {val:,.2f}")
                else:
                    answer_parts.append(f"**{col}**: {val}")
        else:
            # Tableau
            answer_parts.append(f"*{len(df)} résultats trouvés*")
            if stats.get("truncated"):
                answer_parts.append(f"⚠️ Résultats limités à {len(df)} lignes.")
        
        # S'assurer que explain est bien récupéré
        final_explain = sql_result.get("explain") if sql_result else explain
        
        return QaAnswer(
            intent=QuestionIntent.STRUCTURED,
            answer_md="\n\n".join(answer_parts),
            tables={"Résultats": df},
            explain=final_explain,
        )
    
    def _compose_qualitative(
        self,
        citations: List[Citation],
        explain: Optional[ExplainInfo],
        question: str
    ) -> QaAnswer:
        """Compose une réponse qualitative (CR)."""
        if not citations:
            return QaAnswer(
                intent=QuestionIntent.QUALITATIVE,
                answer_md="📭 Aucun compte-rendu trouvé pour cette recherche.\n\n"
                         "*Vérifiez que des CR ont été uploadés.*",
                explain=explain,
                clarifying_question="Voulez-vous reformuler votre question ?",
            )
        
        answer_parts = [f"### 📝 Synthèse des comptes-rendus\n"]
        answer_parts.append(f"*{len(citations)} mentions trouvées*\n")
        
        # Résumé des thèmes
        # TODO: Utiliser LLM pour synthétiser
        answer_parts.append("**Points clés relevés:**")
        for i, cit in enumerate(citations[:3], 1):
            answer_parts.append(f"{i}. {cit.snippet[:100]}...")
        
        return QaAnswer(
            intent=QuestionIntent.QUALITATIVE,
            answer_md="\n\n".join(answer_parts),
            citations=citations,
            explain=explain,
        )
    
    def _compose_hybrid(
        self,
        sql_result: Optional[Dict],
        citations: List[Citation],
        explain: Optional[ExplainInfo],
        question: str
    ) -> QaAnswer:
        """Compose une réponse hybride (chiffres + CR)."""
        answer_parts = []
        tables = {}
        
        # Partie chiffres
        if sql_result and sql_result.get("success"):
            df = sql_result.get("df", pd.DataFrame())
            if not df.empty:
                answer_parts.append("### 📊 Données chiffrées\n")
                answer_parts.append(f"*{len(df)} résultats*")
                tables["Données"] = df
        
        # Partie CR
        if citations:
            answer_parts.append("\n### 📝 Éclairages terrain\n")
            for cit in citations[:3]:
                answer_parts.append(cit.to_markdown())
        
        if not answer_parts:
            return QaAnswer(
                intent=QuestionIntent.HYBRID,
                answer_md="📭 Aucune donnée ni compte-rendu trouvé.",
                explain=explain,
            )
        
        return QaAnswer(
            intent=QuestionIntent.HYBRID,
            answer_md="\n\n".join(answer_parts),
            tables=tables,
            citations=citations,
            explain=sql_result.get("explain", explain) if sql_result else explain,
        )
    
    def _compose_clarification(self, result: Optional[Dict]) -> QaAnswer:
        """Compose une demande de clarification."""
        clarifying = result.get("clarifying_question", "Pouvez-vous préciser votre question ?") if result else ""
        options = result.get("options", []) if result else []
        
        return QaAnswer(
            intent=QuestionIntent.NEED_CLARIFICATION,
            answer_md=f"🤔 **Clarification nécessaire**\n\n{clarifying}",
            clarifying_question=clarifying,
            options=options,
        )

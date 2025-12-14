"""
Schémas Pydantic pour le module Q&A PRISM.
Définit les structures de données pour les questions, réponses, et état.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Dict, Any
import hashlib


class QuestionIntent(Enum):
    """Type de question détecté."""
    STRUCTURED = "STRUCTURED"      # Chiffres → SQL
    QUALITATIVE = "QUALITATIVE"    # CR → Recherche sémantique
    HYBRID = "HYBRID"              # SQL + CR
    NEED_CLARIFICATION = "NEED_CLARIFICATION"  # Question ambiguë


@dataclass
class SqlPlan:
    """Plan d'exécution SQL généré."""
    query: str
    view_level: str  # "EVENTS" ou "LINES"
    params: Dict[str, Any] = field(default_factory=dict)
    filters: Dict[str, Any] = field(default_factory=dict)
    rationale: str = ""
    safety_checks: List[str] = field(default_factory=list)
    
    def has_limit(self) -> bool:
        """Vérifie si le SQL contient un LIMIT."""
        return "LIMIT" in self.query.upper()


@dataclass
class Citation:
    """Citation d'un compte-rendu commercial."""
    cr_id: str
    cr_date: date
    customer_id: str
    rep: Optional[str] = None
    snippet: str = ""
    source_row: Optional[int] = None
    
    def to_markdown(self) -> str:
        """Formate la citation en markdown."""
        rep_info = f" ({self.rep})" if self.rep else ""
        return f"> *\"{self.snippet}\"*\n> — {self.customer_id}{rep_info}, {self.cr_date}"


@dataclass
class ExplainInfo:
    """Informations de traçabilité (mode Explain)."""
    sql: Optional[str] = None
    params: Dict[str, Any] = field(default_factory=dict)
    period: Optional[Dict[str, str]] = None
    exclusions: Dict[str, int] = field(default_factory=dict)
    sample_sizes: Dict[str, int] = field(default_factory=dict)
    dataset_id: Optional[str] = None
    execution_time_ms: Optional[int] = None


@dataclass
class QaAnswer:
    """Réponse complète du module Q&A."""
    intent: QuestionIntent
    answer_md: str
    tables: Dict[str, Any] = field(default_factory=dict)  # nom -> DataFrame
    citations: List[Citation] = field(default_factory=list)
    explain: Optional[ExplainInfo] = None
    clarifying_question: Optional[str] = None
    options: List[str] = field(default_factory=list)
    
    def has_citations(self) -> bool:
        """Vérifie si la réponse contient des citations."""
        return len(self.citations) > 0
    
    def to_markdown(self, show_explain: bool = True) -> str:
        """Génère le markdown complet de la réponse."""
        parts = [self.answer_md]
        
        if self.citations:
            parts.append("\n### 📝 Sources (CR)")
            for cit in self.citations[:5]:  # Max 5 citations affichées
                parts.append(cit.to_markdown())
        
        if show_explain and self.explain:
            parts.append("\n---\n### 🔍 Mode Explain")
            if self.explain.sql:
                parts.append(f"```sql\n{self.explain.sql}\n```")
            if self.explain.period:
                parts.append(f"**Période**: {self.explain.period.get('start', '?')} → {self.explain.period.get('end', '?')}")
            if self.explain.exclusions:
                excl_str = ", ".join(f"{k}: {v}" for k, v in self.explain.exclusions.items())
                parts.append(f"**Exclusions**: {excl_str}")
            if self.explain.sample_sizes:
                sizes_str = ", ".join(f"{k}: {v}" for k, v in self.explain.sample_sizes.items())
                parts.append(f"**Échantillons**: {sizes_str}")
        
        return "\n\n".join(parts)


@dataclass
class DatasetInfo:
    """Informations sur un dataset uploadé."""
    dataset_id: str
    filename: str
    upload_timestamp: datetime
    row_count: int
    column_count: int
    
    @staticmethod
    def generate_id(filename: str, timestamp: datetime) -> str:
        """Génère un ID unique pour le dataset."""
        key = f"{filename}_{timestamp.isoformat()}"
        return hashlib.md5(key.encode()).hexdigest()[:12]


@dataclass
class ConversationState:
    """État de la conversation (mémoire courte)."""
    # Contexte actif
    dataset_id: Optional[str] = None  # "all" ou ID spécifique
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    reps: List[str] = field(default_factory=list)
    depts: List[str] = field(default_factory=list)
    countries: List[str] = field(default_factory=list)
    product_families: List[str] = field(default_factory=list)
    
    # Historique (5 derniers tours)
    history: List[Dict[str, str]] = field(default_factory=list)
    max_history: int = 5
    
    def add_turn(self, question: str, answer: str):
        """Ajoute un tour à l'historique."""
        self.history.append({"question": question, "answer": answer[:500]})
        if len(self.history) > self.max_history:
            self.history.pop(0)
    
    def get_context_summary(self) -> str:
        """Résume le contexte actif."""
        parts = []
        if self.dataset_id and self.dataset_id != "all":
            parts.append(f"Dataset: {self.dataset_id}")
        if self.period_start and self.period_end:
            parts.append(f"Période: {self.period_start} → {self.period_end}")
        if self.reps:
            parts.append(f"Reps: {', '.join(self.reps)}")
        if self.depts:
            parts.append(f"Depts: {', '.join(self.depts)}")
        return " | ".join(parts) if parts else "Aucun filtre actif"
    
    def clear_filters(self):
        """Réinitialise les filtres."""
        self.reps = []
        self.depts = []
        self.countries = []
        self.product_families = []


# Constantes de sécurité
SECURITY_CONFIG = {
    "max_file_size_mb": 100,
    "max_result_rows": 1000,
    "llm_timeout_sec": 25,
    "sql_timeout_sec": 5,
    "max_sql_retries": 2,
    "force_limit": True,
    "default_limit": 1000,
    "allowed_sql_keywords": ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", 
                              "HAVING", "LIMIT", "OFFSET", "JOIN", "LEFT JOIN",
                              "INNER JOIN", "WITH", "AS", "AND", "OR", "IN",
                              "BETWEEN", "LIKE", "IS NULL", "IS NOT NULL",
                              "COUNT", "SUM", "AVG", "MIN", "MAX", "DISTINCT"],
    "forbidden_sql_keywords": ["DROP", "DELETE", "INSERT", "UPDATE", "ALTER",
                                "CREATE", "TRUNCATE", "EXEC", "EXECUTE"],
    "allowed_views": ["v_sales_lines", "v_sales_events", "v_controls", 
                      "v_cr_notes", "v_datasets"],
}

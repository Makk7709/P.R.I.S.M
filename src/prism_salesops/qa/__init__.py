"""
PRISM Ask & Explain - Module Q&A pour dirigeants.

Permet de poser des questions naturelles sur les données Excel
et d'obtenir des réponses chiffrées (SQL) + qualitatives (CR).
"""

from .schema import (
    QuestionIntent,
    SqlPlan,
    QaAnswer,
    Citation,
    ConversationState,
    DatasetInfo,
)
from .db import DuckDBManager
from .router import QuestionRouter
from .text2sql import Text2SqlGenerator
from .execute import SqlExecutor
from .composer import AnswerComposer
from .audit import AuditLogger
from .engine import AskPrismEngine

__all__ = [
    "QuestionIntent",
    "SqlPlan", 
    "QaAnswer",
    "Citation",
    "ConversationState",
    "DatasetInfo",
    "DuckDBManager",
    "QuestionRouter",
    "Text2SqlGenerator",
    "SqlExecutor",
    "AnswerComposer",
    "AuditLogger",
    "AskPrismEngine",
]

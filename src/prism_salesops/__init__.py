"""
PRISM SalesOps Autopilot
========================
Module d'analyse automatisée des exports commerciaux Excel.

MVP: Un seul fichier uploadé → diagnostic, normalisation, analyses, contrôles, dashboard.
"""

__version__ = "0.1.0"
__author__ = "PRISM Team"

from .config import SalesOpsConfig
from .normalize import normalize_text, code_norm, head_token
from .io import read_excel_robust, detect_header_row
from .headers import detect_columns, ColumnDetectionError
from .classify import is_logistique, is_return, extract_country, extract_dept
from .facts import build_facts_table
from .cadence import compute_cadence_metrics
from .outputs import build_detail, build_top10, build_resume_rep
from .controls import military_controls_report
from .export_xlsx import write_workbook

__all__ = [
    "SalesOpsConfig",
    "normalize_text", "code_norm", "head_token",
    "read_excel_robust", "detect_header_row",
    "detect_columns", "ColumnDetectionError",
    "is_logistique", "is_return", "extract_country", "extract_dept",
    "build_facts_table",
    "compute_cadence_metrics",
    "build_detail", "build_top10", "build_resume_rep",
    "military_controls_report",
    "write_workbook",
]

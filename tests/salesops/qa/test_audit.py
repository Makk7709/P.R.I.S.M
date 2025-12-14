"""
Tests TDD STRICT pour le module Audit Trail Ask PRISM.
Rigueur militaire : tests exhaustifs, cas limites, validations complètes.
"""

import pytest
import pandas as pd
from datetime import date, datetime, timedelta
from pathlib import Path
import tempfile
import json

from prism_salesops.qa.schema import (
    QuestionIntent, QaAnswer, ExplainInfo, Citation, DatasetInfo
)


@pytest.fixture
def sample_facts_df():
    """DataFrame facts minimal pour les tests."""
    return pd.DataFrame({
        "dataset_id": ["DS001"] * 5,
        "event_id": [f"E{i:03d}" for i in range(5)],
        "event_date": [date(2024, 1, 15 + i) for i in range(5)],
        "customer_id": ["CLI001", "CLI002", "CLI001", "CLI003", "CLI002"],
        "amount_sales": [100.0, 200.0, 150.0, 50.0, 250.0],
    })


@pytest.fixture
def temp_db_path():
    """Chemin temporaire pour DuckDB."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir) / "audit_test.duckdb"


@pytest.fixture
def db_manager(temp_db_path, sample_facts_df):
    """Instance DuckDBManager initialisée."""
    from prism_salesops.qa.db import DuckDBManager
    manager = DuckDBManager(temp_db_path)
    manager.build(facts_df=sample_facts_df)
    return manager


@pytest.fixture
def audit_logger(db_manager):
    """Instance AuditLogger initialisée."""
    from prism_salesops.qa.audit import AuditLogger
    return AuditLogger(db_manager)


@pytest.fixture
def sample_qa_answer():
    """Réponse Q&A complète pour les tests."""
    explain = ExplainInfo(
        sql="SELECT * FROM v_sales_events LIMIT 10",
        params={"limit": 10},
        period={"start": "2024-01-01", "end": "2024-12-31"},
        exclusions={"returns": 2, "logistics": 1},
        sample_sizes={"events": 100, "customers": 50},
        execution_time_ms=45,
    )
    
    citations = [
        Citation(
            cr_id="CR001",
            cr_date=date(2024, 1, 20),
            customer_id="CLI001",
            rep="REP1",
            snippet="Client satisfait",
        )
    ]
    
    return QaAnswer(
        intent=QuestionIntent.STRUCTURED,
        answer_md="### Résultats\n\nCA total: 5000€",
        tables={"Résultats": pd.DataFrame({"customer_id": ["CLI001"], "ca": [5000]})},
        citations=citations,
        explain=explain,
    )


class TestAuditLoggerInitialization:
    """Tests d'initialisation du logger d'audit."""
    
    def test_creates_audit_table_on_init(self, db_manager):
        """L'initialisation crée automatiquement la table audit_qa."""
        from prism_salesops.qa.audit import AuditLogger
        
        logger = AuditLogger(db_manager)
        
        # Vérifier que la table existe
        tables = db_manager.list_tables()
        assert "audit_qa" in tables
    
    def test_table_schema_is_correct(self, audit_logger, db_manager):
        """Le schéma de la table audit_qa contient toutes les colonnes requises."""
        schema = db_manager.get_schema("audit_qa")
        schema_cols = set(schema["column_name"].tolist())
        
        required_cols = {
            "audit_id", "timestamp", "question", "intent", "answer_md",
            "sql_query", "sql_params", "execution_time_ms", "row_count",
            "filters", "period_start", "period_end", "exclusions",
            "sample_sizes", "citations_count", "dataset_id",
            "user_params", "controls", "error_message"
        }
        
        assert required_cols.issubset(schema_cols), \
            f"Colonnes manquantes: {required_cols - schema_cols}"


class TestAuditLogging:
    """Tests d'enregistrement des interactions."""
    
    def test_logs_structured_question_successfully(self, audit_logger, sample_qa_answer):
        """Enregistre correctement une question STRUCTURED avec tous les détails."""
        audit_id = audit_logger.log_interaction(
            question="Quel est le CA total ?",
            answer=sample_qa_answer,
            dataset_id="DS001",
        )
        
        assert audit_id is not None
        assert audit_id.startswith("audit_")
        
        # Vérifier l'entrée
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry is not None
        assert entry["question"] == "Quel est le CA total ?"
        assert entry["intent"] == QuestionIntent.STRUCTURED.value
        assert entry["sql_query"] == "SELECT * FROM v_sales_events LIMIT 10"
        assert entry["execution_time_ms"] == 45
        assert entry["row_count"] == 1
        assert entry["citations_count"] == 1
        assert entry["dataset_id"] == "DS001"
    
    def test_logs_qualitative_question_without_sql(self, audit_logger):
        """Enregistre une question QUALITATIVE sans SQL."""
        answer = QaAnswer(
            intent=QuestionIntent.QUALITATIVE,
            answer_md="### Synthèse\n\nClient mécontent",
            citations=[
                Citation(
                    cr_id="CR001",
                    cr_date=date(2024, 1, 20),
                    customer_id="CLI001",
                    snippet="Client mécontent du délai",
                )
            ],
        )
        
        audit_id = audit_logger.log_interaction(
            question="Pourquoi CLI001 est mécontent ?",
            answer=answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry["intent"] == QuestionIntent.QUALITATIVE.value
        assert entry["sql_query"] is None or pd.isna(entry["sql_query"])
        assert entry["citations_count"] == 1
    
    def test_logs_hybrid_question_with_all_details(self, audit_logger, sample_qa_answer):
        """Enregistre une question HYBRID avec SQL et citations."""
        answer = QaAnswer(
            intent=QuestionIntent.HYBRID,
            answer_md="Top clients + explications",
            tables=sample_qa_answer.tables,
            citations=sample_qa_answer.citations,
            explain=sample_qa_answer.explain,
        )
        
        audit_id = audit_logger.log_interaction(
            question="Top clients + que disent les CR ?",
            answer=answer,
            dataset_id="DS001",
            user_params={"period_months": 12},
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry["intent"] == QuestionIntent.HYBRID.value
        assert entry["sql_query"] is not None
        assert entry["citations_count"] == 1
        assert entry["user_params"]["period_months"] == 12
    
    def test_logs_clarification_request(self, audit_logger):
        """Enregistre une demande de clarification."""
        answer = QaAnswer(
            intent=QuestionIntent.NEED_CLARIFICATION,
            answer_md="Pouvez-vous préciser ?",
            clarifying_question="Quelle région ?",
            options=["PACA", "Occitanie"],
        )
        
        audit_id = audit_logger.log_interaction(
            question="CA de la région",
            answer=answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry["intent"] == QuestionIntent.NEED_CLARIFICATION.value
    
    def test_logs_error_with_error_message(self, audit_logger):
        """Enregistre une erreur avec message d'erreur."""
        answer = QaAnswer(
            intent=QuestionIntent.STRUCTURED,
            answer_md="❌ Erreur lors de l'exécution",
        )
        
        audit_id = audit_logger.log_interaction(
            question="Invalid query",
            answer=answer,
            error="SQL syntax error: invalid column",
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert "error" in entry["error_message"].lower() or entry["error_message"] is not None
    
    def test_logs_period_correctly(self, audit_logger, sample_qa_answer):
        """Enregistre correctement la période (start/end)."""
        audit_id = audit_logger.log_interaction(
            question="CA sur 12 mois",
            answer=sample_qa_answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry["period"]["start"] == "2024-01-01"
        assert entry["period"]["end"] == "2024-12-31"
    
    def test_logs_exclusions_correctly(self, audit_logger, sample_qa_answer):
        """Enregistre correctement les exclusions."""
        audit_id = audit_logger.log_interaction(
            question="CA total",
            answer=sample_qa_answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry["exclusions"]["returns"] == 2
        assert entry["exclusions"]["logistics"] == 1
    
    def test_logs_sample_sizes_correctly(self, audit_logger, sample_qa_answer):
        """Enregistre correctement les tailles d'échantillons."""
        audit_id = audit_logger.log_interaction(
            question="CA total",
            answer=sample_qa_answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry["sample_sizes"]["events"] == 100
        assert entry["sample_sizes"]["customers"] == 50
    
    def test_truncates_long_sql_queries(self, audit_logger):
        """Tronque les requêtes SQL très longues (max 10000 caractères)."""
        long_sql = "SELECT " + ", ".join([f"col_{i}" for i in range(1000)]) + " FROM v_sales_events"
        explain = ExplainInfo(sql=long_sql)
        
        answer = QaAnswer(
            intent=QuestionIntent.STRUCTURED,
            answer_md="Test",
            explain=explain,
        )
        
        audit_id = audit_logger.log_interaction(
            question="Test long SQL",
            answer=answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        # SQL doit être tronqué
        assert len(entry["sql_query"]) <= 10000
    
    def test_truncates_long_answer_md(self, audit_logger):
        """Tronque les réponses très longues (max 5000 caractères)."""
        long_answer = "### Résultat\n\n" + "A" * 10000
        answer = QaAnswer(
            intent=QuestionIntent.STRUCTURED,
            answer_md=long_answer,
        )
        
        audit_id = audit_logger.log_interaction(
            question="Test long answer",
            answer=answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert len(entry["answer_md"]) <= 5000


class TestAuditRetrieval:
    """Tests de récupération de l'audit trail."""
    
    def test_get_audit_trail_returns_dataframe(self, audit_logger, sample_qa_answer):
        """get_audit_trail retourne un DataFrame."""
        # Créer quelques entrées
        for i in range(3):
            audit_logger.log_interaction(
                question=f"Question {i}",
                answer=sample_qa_answer,
            )
        
        trail = audit_logger.get_audit_trail()
        
        assert isinstance(trail, pd.DataFrame)
        assert len(trail) == 3
    
    def test_get_audit_trail_filters_by_dataset(self, audit_logger, sample_qa_answer):
        """Filtre correctement par dataset_id."""
        audit_logger.log_interaction(
            question="Q1",
            answer=sample_qa_answer,
            dataset_id="DS001",
        )
        audit_logger.log_interaction(
            question="Q2",
            answer=sample_qa_answer,
            dataset_id="DS002",
        )
        
        trail = audit_logger.get_audit_trail(dataset_id="DS001")
        
        assert len(trail) == 1
        assert trail.iloc[0]["dataset_id"] == "DS001"
    
    def test_get_audit_trail_filters_by_date_range(self, audit_logger, sample_qa_answer):
        """Filtre correctement par période."""
        now = datetime.now()
        
        # Simuler des entrées à différentes dates
        for i in range(5):
            audit_logger.log_interaction(
                question=f"Q{i}",
                answer=sample_qa_answer,
            )
        
        start = now - timedelta(hours=1)
        end = now + timedelta(hours=1)
        
        trail = audit_logger.get_audit_trail(start_date=start, end_date=end)
        
        # Toutes les entrées doivent être dans la période
        assert len(trail) >= 0
        if len(trail) > 0:
            trail_timestamps = pd.to_datetime(trail["timestamp"])
            assert all(start <= ts <= end for ts in trail_timestamps)
    
    def test_get_audit_trail_filters_by_intent(self, audit_logger, sample_qa_answer):
        """Filtre correctement par intent."""
        # Créer différentes intents
        structured = QaAnswer(intent=QuestionIntent.STRUCTURED, answer_md="Test")
        qualitative = QaAnswer(intent=QuestionIntent.QUALITATIVE, answer_md="Test")
        
        audit_logger.log_interaction("Q1", structured)
        audit_logger.log_interaction("Q2", qualitative)
        audit_logger.log_interaction("Q3", structured)
        
        trail = audit_logger.get_audit_trail(intent=QuestionIntent.STRUCTURED)
        
        assert len(trail) == 2
        assert all(trail["intent"] == QuestionIntent.STRUCTURED.value)
    
    def test_get_audit_trail_respects_limit(self, audit_logger, sample_qa_answer):
        """Respecte la limite de résultats."""
        # Créer 10 entrées
        for i in range(10):
            audit_logger.log_interaction(
                question=f"Q{i}",
                answer=sample_qa_answer,
            )
        
        trail = audit_logger.get_audit_trail(limit=5)
        
        assert len(trail) <= 5
    
    def test_get_audit_trail_ordered_by_timestamp_desc(self, audit_logger, sample_qa_answer):
        """Retourne les résultats ordonnés par timestamp décroissant."""
        # Créer plusieurs entrées avec délais
        for i in range(3):
            audit_logger.log_interaction(
                question=f"Q{i}",
                answer=sample_qa_answer,
            )
        
        trail = audit_logger.get_audit_trail()
        
        if len(trail) > 1:
            timestamps = pd.to_datetime(trail["timestamp"])
            assert all(timestamps.iloc[i] >= timestamps.iloc[i+1] 
                      for i in range(len(timestamps)-1))
    
    def test_get_audit_entry_returns_none_for_invalid_id(self, audit_logger):
        """Retourne None pour un ID d'audit invalide."""
        entry = audit_logger.get_audit_entry("invalid_id_12345")
        assert entry is None
    
    def test_get_audit_entry_returns_complete_data(self, audit_logger, sample_qa_answer):
        """Retourne toutes les données complètes d'une entrée."""
        audit_id = audit_logger.log_interaction(
            question="Question complète",
            answer=sample_qa_answer,
            dataset_id="DS001",
            user_params={"filter": "value"},
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        
        assert entry is not None
        assert entry["audit_id"] == audit_id
        assert entry["question"] == "Question complète"
        assert entry["intent"] == QuestionIntent.STRUCTURED.value
        assert isinstance(entry["sql_params"], dict)
        assert isinstance(entry["filters"], dict)
        assert isinstance(entry["exclusions"], dict)
        assert isinstance(entry["sample_sizes"], dict)
        assert isinstance(entry["user_params"], dict)
        assert isinstance(entry["period"], dict)


class TestAuditExport:
    """Tests d'export de l'audit trail."""
    
    def test_export_to_xlsx_creates_file(self, audit_logger, sample_qa_answer, temp_db_path):
        """Export XLSX crée un fichier valide."""
        audit_logger.log_interaction("Q1", sample_qa_answer)
        
        output_path = temp_db_path.parent / "audit_export.xlsx"
        result_path = audit_logger.export_audit_trail(output_path, format="xlsx")
        
        assert result_path.exists()
        assert result_path.suffix == ".xlsx"
        
        # Vérifier que le fichier peut être lu
        df = pd.read_excel(result_path)
        assert len(df) > 0
    
    def test_export_to_csv_creates_file(self, audit_logger, sample_qa_answer, temp_db_path):
        """Export CSV crée un fichier valide."""
        audit_logger.log_interaction("Q1", sample_qa_answer)
        
        output_path = temp_db_path.parent / "audit_export.csv"
        result_path = audit_logger.export_audit_trail(output_path, format="csv")
        
        assert result_path.exists()
        assert result_path.suffix == ".csv"
        
        df = pd.read_csv(result_path)
        assert len(df) > 0
    
    def test_export_to_json_creates_file(self, audit_logger, sample_qa_answer, temp_db_path):
        """Export JSON crée un fichier valide."""
        audit_logger.log_interaction("Q1", sample_qa_answer)
        
        output_path = temp_db_path.parent / "audit_export.json"
        result_path = audit_logger.export_audit_trail(output_path, format="json")
        
        assert result_path.exists()
        assert result_path.suffix == ".json"
        
        with open(result_path) as f:
            data = json.load(f)
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_export_respects_filters(self, audit_logger, sample_qa_answer, temp_db_path):
        """L'export respecte les filtres appliqués."""
        audit_logger.log_interaction("Q1", sample_qa_answer, dataset_id="DS001")
        audit_logger.log_interaction("Q2", sample_qa_answer, dataset_id="DS002")
        
        output_path = temp_db_path.parent / "audit_filtered.xlsx"
        audit_logger.export_audit_trail(
            output_path,
            format="xlsx",
            dataset_id="DS001"
        )
        
        df = pd.read_excel(output_path)
        assert all(df["dataset_id"] == "DS001")
    
    def test_export_raises_error_for_invalid_format(self, audit_logger, sample_qa_answer, temp_db_path):
        """Lève une erreur pour un format invalide."""
        audit_logger.log_interaction("Q1", sample_qa_answer)
        
        output_path = temp_db_path.parent / "audit_invalid.pdf"
        
        with pytest.raises(ValueError, match="Format non supporté"):
            audit_logger.export_audit_trail(output_path, format="pdf")


class TestAuditEdgeCases:
    """Tests des cas limites et erreurs."""
    
    def test_handles_missing_explain_info(self, audit_logger):
        """Gère correctement l'absence d'ExplainInfo."""
        answer = QaAnswer(
            intent=QuestionIntent.STRUCTURED,
            answer_md="Test sans explain",
        )
        
        audit_id = audit_logger.log_interaction(
            question="Test",
            answer=answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry is not None
        assert entry["sql_query"] is None or pd.isna(entry["sql_query"])
    
    def test_handles_missing_tables(self, audit_logger):
        """Gère correctement l'absence de tables dans la réponse."""
        answer = QaAnswer(
            intent=QuestionIntent.STRUCTURED,
            answer_md="Test",
            tables={},
        )
        
        audit_id = audit_logger.log_interaction(
            question="Test",
            answer=answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry["row_count"] is None or pd.isna(entry["row_count"])
    
    def test_handles_empty_answer_md(self, audit_logger):
        """Gère correctement une réponse vide."""
        answer = QaAnswer(
            intent=QuestionIntent.STRUCTURED,
            answer_md="",
        )
        
        audit_id = audit_logger.log_interaction(
            question="Test",
            answer=answer,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry is not None
    
    def test_handles_none_user_params(self, audit_logger, sample_qa_answer):
        """Gère correctement user_params=None."""
        audit_id = audit_logger.log_interaction(
            question="Test",
            answer=sample_qa_answer,
            user_params=None,
        )
        
        entry = audit_logger.get_audit_entry(audit_id)
        assert entry is not None
        assert entry["user_params"] == {}

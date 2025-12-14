"""
PHASE 3 - Tests TDD pour Text-to-SQL.
"""

import pytest
from prism_salesops.qa.schema import SqlPlan, SECURITY_CONFIG


class TestText2SqlGenerator:
    """Tests pour Text2SqlGenerator."""
    
    # === Validation SQL ===
    
    def test_validates_select_only(self):
        """Seul SELECT est autorisé."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        assert generator.validate_sql("SELECT * FROM v_sales_lines") is True
        assert generator.validate_sql("DROP TABLE v_sales_lines") is False
        assert generator.validate_sql("DELETE FROM v_sales_lines") is False
        assert generator.validate_sql("INSERT INTO v_sales_lines VALUES (1)") is False
        assert generator.validate_sql("UPDATE v_sales_lines SET x=1") is False
    
    def test_validates_allowed_views_only(self):
        """Seules les vues autorisées sont acceptées."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        assert generator.validate_sql("SELECT * FROM v_sales_lines") is True
        assert generator.validate_sql("SELECT * FROM v_sales_events") is True
        assert generator.validate_sql("SELECT * FROM v_controls") is True
        assert generator.validate_sql("SELECT * FROM secret_table") is False
        assert generator.validate_sql("SELECT * FROM users") is False
    
    def test_requires_limit_for_open_queries(self):
        """Les requêtes ouvertes doivent avoir un LIMIT."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        # Sans LIMIT - invalide pour requête ouverte
        sql = "SELECT * FROM v_sales_lines"
        assert generator.validate_sql(sql, require_limit=True) is False
        
        # Avec LIMIT - valide
        sql_with_limit = "SELECT * FROM v_sales_lines LIMIT 100"
        assert generator.validate_sql(sql_with_limit, require_limit=True) is True
    
    def test_adds_limit_if_missing(self):
        """Ajoute automatiquement un LIMIT si absent."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        sql = "SELECT * FROM v_sales_lines"
        fixed_sql = generator.ensure_limit(sql, max_rows=1000)
        
        assert "LIMIT" in fixed_sql.upper()
        assert "1000" in fixed_sql
    
    def test_does_not_add_limit_if_present(self):
        """N'ajoute pas de LIMIT si déjà présent."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        sql = "SELECT * FROM v_sales_lines LIMIT 50"
        fixed_sql = generator.ensure_limit(sql, max_rows=1000)
        
        # Doit garder le LIMIT original
        assert fixed_sql.count("LIMIT") == 1
        assert "50" in fixed_sql
    
    # === Génération SQL ===
    
    def test_generates_ca_by_dept(self):
        """Génère SQL correct pour CA par département."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        plan = generator.generate(
            question="Quel est le CA par département ?",
            schema_catalog={"views": ["v_sales_events"]},
        )
        
        assert isinstance(plan, SqlPlan)
        assert "SELECT" in plan.query.upper()
        assert "dept" in plan.query.lower()
        assert "amount_sales" in plan.query.lower() or "sum" in plan.query.lower()
        assert generator.validate_sql(plan.query)
    
    def test_generates_top_10_clients(self):
        """Génère SQL correct pour Top 10 clients."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        plan = generator.generate(
            question="Top 10 clients par CA",
            schema_catalog={"views": ["v_sales_events"]},
        )
        
        assert "LIMIT" in plan.query.upper()
        assert "10" in plan.query
        assert "ORDER BY" in plan.query.upper()
    
    def test_uses_events_view_for_cadence(self):
        """Utilise v_sales_events pour les métriques de cadence."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        plan = generator.generate(
            question="Nombre de commandes par client",
            schema_catalog={"views": ["v_sales_events", "v_sales_lines"]},
        )
        
        assert plan.view_level == "EVENTS"
        assert "v_sales_events" in plan.query.lower()
    
    def test_uses_lines_view_for_product_detail(self):
        """Utilise v_sales_lines pour le détail produit."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        plan = generator.generate(
            question="Détail des ventes par code article",
            schema_catalog={"views": ["v_sales_events", "v_sales_lines"]},
        )
        
        assert plan.view_level == "LINES"
        assert "v_sales_lines" in plan.query.lower()
    
    def test_includes_rationale(self):
        """Le plan inclut une justification."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        plan = generator.generate(
            question="CA total",
            schema_catalog={"views": ["v_sales_events"]},
        )
        
        assert plan.rationale != ""
    
    def test_includes_safety_checks(self):
        """Le plan inclut les vérifications de sécurité."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        plan = generator.generate(
            question="CA total",
            schema_catalog={"views": ["v_sales_events"]},
        )
        
        assert len(plan.safety_checks) > 0
    
    # === Filtres ===
    
    def test_applies_period_filter(self):
        """Applique le filtre de période."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        plan = generator.generate(
            question="CA sur les 6 derniers mois",
            schema_catalog={"views": ["v_sales_events"]},
            constraints={"period_months": 6},
        )
        
        assert "event_date" in plan.query.lower() or "date" in plan.query.lower()
        assert "WHERE" in plan.query.upper() or ">" in plan.query
    
    def test_applies_dataset_filter(self):
        """Applique le filtre dataset_id."""
        from prism_salesops.qa.text2sql import Text2SqlGenerator
        
        generator = Text2SqlGenerator()
        
        plan = generator.generate(
            question="CA total",
            schema_catalog={"views": ["v_sales_events"]},
            constraints={"dataset_id": "DS001"},
        )
        
        assert "dataset_id" in plan.query.lower()

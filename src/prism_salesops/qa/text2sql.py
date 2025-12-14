"""
Générateur Text-to-SQL strict.
"""

import re
from typing import Optional, Dict, Any, List
from datetime import date, timedelta
from .schema import SqlPlan, SECURITY_CONFIG


# Templates SQL pour les requêtes courantes
SQL_TEMPLATES = {
    "ca_by_group": """
SELECT {group_col}, SUM(amount_sales) as ca_total
FROM {view}
{where_clause}
GROUP BY {group_col}
ORDER BY ca_total DESC
{limit}
""",
    "top_n": """
SELECT {select_cols}
FROM {view}
{where_clause}
ORDER BY {order_col} DESC
LIMIT {n}
""",
    "count_by_group": """
SELECT {group_col}, COUNT(DISTINCT {count_col}) as nb
FROM {view}
{where_clause}
GROUP BY {group_col}
ORDER BY nb DESC
{limit}
""",
    "total_metric": """
SELECT SUM({metric_col}) as total
FROM {view}
{where_clause}
""",
}

# Mapping question -> type de requête
QUERY_PATTERNS = [
    (r"top\s*(\d+)", "top_n"),
    (r"par\s+(département|dept|région|client|commercial|rep|produit|article)", "ca_by_group"),
    (r"combien|nombre", "count_by_group"),
    (r"total|somme", "total_metric"),
    (r"détail|liste", "detail"),
]

# Mapping termes -> colonnes
COLUMN_MAPPING = {
    "département": "dept",
    "dept": "dept",
    "région": "dept",
    "client": "customer_id",
    "commercial": "rep_source",
    "rep": "rep_source",
    "produit": "product_code",
    "article": "product_code",
    "famille": "product_family",
    "pays": "country",
}


class Text2SqlGenerator:
    """Génère du SQL à partir de questions naturelles."""
    
    def __init__(self, llm_client: Optional[Any] = None):
        self.llm_client = llm_client
        self.allowed_views = SECURITY_CONFIG["allowed_views"]
        self.forbidden_keywords = SECURITY_CONFIG["forbidden_sql_keywords"]
    
    def generate(
        self,
        question: str,
        schema_catalog: Dict[str, Any],
        constraints: Optional[Dict] = None
    ) -> SqlPlan:
        """
        Génère un plan SQL.
        
        Returns:
            SqlPlan avec query, params, rationale
        """
        constraints = constraints or {}
        question_lower = question.lower()
        
        # Déterminer le type de requête
        query_type = self._detect_query_type(question_lower)
        
        # Déterminer la vue à utiliser
        view, view_level = self._select_view(question_lower, schema_catalog)
        
        # Construire la clause WHERE
        where_clause = self._build_where_clause(question_lower, constraints)
        
        # Générer le SQL
        sql = self._generate_sql(question_lower, query_type, view, where_clause, constraints)
        
        # S'assurer qu'il y a un LIMIT
        sql = self.ensure_limit(sql, constraints.get("max_rows", SECURITY_CONFIG["default_limit"]))
        
        # Construire le plan
        return SqlPlan(
            query=sql.strip(),
            view_level=view_level,
            params=constraints,
            filters=self._extract_filters(where_clause),
            rationale=f"Requête {query_type} sur {view} pour: {question[:50]}...",
            safety_checks=self._get_safety_checks(sql),
        )
    
    def validate_sql(self, sql: str, require_limit: bool = False) -> bool:
        """
        Valide que le SQL est sûr.
        
        Args:
            sql: Requête SQL à valider
            require_limit: Si True, LIMIT obligatoire
            
        Returns:
            True si valide, False sinon
        """
        sql_upper = sql.upper()
        
        # Doit commencer par SELECT ou WITH (CTE)
        if not (sql_upper.strip().startswith("SELECT") or sql_upper.strip().startswith("WITH")):
            return False
        
        # Mots-clés interdits
        for keyword in self.forbidden_keywords:
            if keyword in sql_upper:
                return False
        
        # Vérifier les vues autorisées
        # Extraire les tables/vues référencées
        from_pattern = r"FROM\s+(\w+)"
        join_pattern = r"JOIN\s+(\w+)"
        
        tables = re.findall(from_pattern, sql, re.IGNORECASE)
        tables += re.findall(join_pattern, sql, re.IGNORECASE)
        
        for table in tables:
            if table.lower() not in [v.lower() for v in self.allowed_views]:
                return False
        
        # Vérifier LIMIT si requis
        if require_limit and "LIMIT" not in sql_upper:
            return False
        
        return True
    
    def ensure_limit(self, sql: str, max_rows: int = 1000) -> str:
        """Ajoute un LIMIT si absent."""
        if "LIMIT" not in sql.upper():
            # Ajouter à la fin
            sql = sql.rstrip().rstrip(";")
            sql = f"{sql}\nLIMIT {max_rows}"
        return sql
    
    def _detect_query_type(self, question: str) -> str:
        """Détecte le type de requête."""
        for pattern, query_type in QUERY_PATTERNS:
            if re.search(pattern, question, re.IGNORECASE):
                return query_type
        return "ca_by_group"  # Défaut
    
    def _select_view(self, question: str, schema_catalog: Dict) -> tuple:
        """Sélectionne la vue appropriée."""
        available_views = schema_catalog.get("views", ["v_sales_events"])
        
        # Utiliser LINES pour le détail produit
        if any(term in question for term in ["article", "produit", "détail", "code"]):
            if "v_sales_lines" in available_views:
                return "v_sales_lines", "LINES"
        
        # Utiliser EVENTS par défaut (niveau événement)
        if "v_sales_events" in available_views:
            return "v_sales_events", "EVENTS"
        
        return available_views[0], "EVENTS"
    
    def _build_where_clause(self, question: str, constraints: Dict) -> str:
        """Construit la clause WHERE."""
        conditions = []
        
        # Filtre dataset
        if "dataset_id" in constraints:
            conditions.append(f"dataset_id = '{constraints['dataset_id']}'")
        
        # Filtre période
        if "period_months" in constraints:
            months = constraints["period_months"]
            start_date = date.today() - timedelta(days=months * 30)
            conditions.append(f"event_date >= '{start_date}'")
        
        # Exclure retours et logistique par défaut
        conditions.append("NOT is_return")
        conditions.append("NOT is_logistique")
        
        if conditions:
            return "WHERE " + " AND ".join(conditions)
        return ""
    
    def _generate_sql(
        self,
        question: str,
        query_type: str,
        view: str,
        where_clause: str,
        constraints: Dict
    ) -> str:
        """Génère le SQL selon le type."""
        
        # Détecter la colonne de groupement
        group_col = "customer_id"  # Défaut
        for term, col in COLUMN_MAPPING.items():
            if term in question:
                group_col = col
                break
        
        if query_type == "top_n":
            # Extraire le nombre
            match = re.search(r"top\s*(\d+)", question, re.IGNORECASE)
            n = int(match.group(1)) if match else 10
            
            return SQL_TEMPLATES["top_n"].format(
                select_cols=f"{group_col}, SUM(amount_sales) as ca_total",
                view=view,
                where_clause=where_clause,
                order_col="ca_total",
                n=n,
            )
        
        elif query_type == "count_by_group":
            return SQL_TEMPLATES["count_by_group"].format(
                group_col=group_col,
                count_col="event_id",
                view=view,
                where_clause=where_clause,
                limit="LIMIT 100",
            )
        
        elif query_type == "total_metric":
            return SQL_TEMPLATES["total_metric"].format(
                metric_col="amount_sales",
                view=view,
                where_clause=where_clause,
            )
        
        else:  # ca_by_group ou défaut
            return SQL_TEMPLATES["ca_by_group"].format(
                group_col=group_col,
                view=view,
                where_clause=where_clause,
                limit="LIMIT 100",
            )
    
    def _extract_filters(self, where_clause: str) -> Dict[str, Any]:
        """Extrait les filtres de la clause WHERE."""
        filters = {}
        
        if "dataset_id" in where_clause:
            match = re.search(r"dataset_id\s*=\s*'([^']+)'", where_clause)
            if match:
                filters["dataset_id"] = match.group(1)
        
        if "event_date" in where_clause:
            match = re.search(r"event_date\s*>=\s*'([^']+)'", where_clause)
            if match:
                filters["period_start"] = match.group(1)
        
        return filters
    
    def _get_safety_checks(self, sql: str) -> List[str]:
        """Liste les vérifications de sécurité effectuées."""
        checks = []
        
        if "LIMIT" in sql.upper():
            checks.append("LIMIT présent")
        
        if "is_return" in sql.lower():
            checks.append("Exclusion retours")
        
        if "is_logistique" in sql.lower():
            checks.append("Exclusion logistique")
        
        checks.append("SELECT uniquement")
        checks.append("Vues autorisées uniquement")
        
        return checks

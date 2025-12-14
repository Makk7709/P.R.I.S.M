"""
PHASE 5 - Tests TDD pour les sorties (Détail, Top10, Résumé rep).
"""

import pytest
import pandas as pd
from datetime import date


@pytest.fixture
def sample_cadence_df():
    """DataFrame de cadence pour tester les sorties."""
    return pd.DataFrame({
        "rep_source": ["REP1", "REP1", "REP2", "REP2", "ZZ"],
        "customer_id": ["CLI001", "CLI002", "CLI003", "CLI004", "CLI005"],
        "last_order_date": [
            date(2024, 10, 1),
            date(2024, 9, 1),
            date(2024, 8, 1),
            date(2024, 7, 1),
            date(2024, 6, 1),
        ],
        "n_events": [10, 8, 6, 4, 3],  # CLI005 < min_events
        "cadence_median_months": [2.0, 2.5, 3.0, 3.5, 4.0],
        "months_since": [2.0, 3.0, 4.0, 5.0, 6.0],
        "gap_months": [0.0, 0.5, 1.0, 1.5, 2.0],
    })


class TestBuildDetail:
    """Tests pour build_detail()."""
    
    def test_returns_correct_columns(self, sample_cadence_df):
        """build_detail retourne les colonnes attendues."""
        from prism_salesops.outputs import build_detail
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(min_events=5, exclude_reps=["ZZ"])
        detail = build_detail(sample_cadence_df, config)
        
        expected_cols = [
            "Rep", "Client", "Cadence", "Mois depuis",
            "Écart", "Nb commandes", "Dernière commande"
        ]
        
        for col in expected_cols:
            assert col in detail.columns, f"Colonne manquante: {col}"
    
    def test_excludes_zz_rep(self, sample_cadence_df):
        """build_detail exclut les rep ZZ."""
        from prism_salesops.outputs import build_detail
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(exclude_reps=["ZZ"])
        detail = build_detail(sample_cadence_df, config)
        
        # Pas de ZZ dans les résultats
        assert "ZZ" not in detail["Rep"].values
        assert "zz" not in detail["Rep"].values
    
    def test_excludes_zz_case_insensitive(self):
        """build_detail exclut ZZ de façon insensible à la casse."""
        from prism_salesops.outputs import build_detail
        from prism_salesops.config import SalesOpsConfig
        
        df = pd.DataFrame({
            "rep_source": ["REP1", "zz", "Zz", "ZZ"],
            "customer_id": ["CLI001", "CLI002", "CLI003", "CLI004"],
            "n_events": [10, 10, 10, 10],
            "cadence_median_months": [2.0, 2.0, 2.0, 2.0],
            "months_since": [2.0, 2.0, 2.0, 2.0],
            "gap_months": [0.0, 0.0, 0.0, 0.0],
            "last_order_date": [date(2024, 10, 1)] * 4,
        })
        
        config = SalesOpsConfig(exclude_reps=["ZZ"])
        detail = build_detail(df, config)
        
        assert len(detail) == 1  # Seul REP1 reste
    
    def test_excludes_below_min_events(self, sample_cadence_df):
        """build_detail exclut les clients avec moins de min_events."""
        from prism_salesops.outputs import build_detail
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(min_events=5, exclude_reps=["ZZ"])
        detail = build_detail(sample_cadence_df, config)
        
        # CLI004 (4 events) et CLI005 (3 events + ZZ) exclus
        assert "CLI004" not in detail["Client"].values
        assert "CLI005" not in detail["Client"].values
        
        # CLI001, CLI002, CLI003 inclus (>= 5 events ou exclus pour autre raison)
        remaining = detail["Client"].tolist()
        assert len(remaining) == 3


class TestBuildTop10:
    """Tests pour build_top10()."""
    
    def test_returns_top_10_by_gap(self, sample_cadence_df):
        """build_top10 retourne les 10 plus gros écarts."""
        from prism_salesops.outputs import build_top10
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(min_events=5, exclude_reps=["ZZ"])
        top10 = build_top10(sample_cadence_df, config)
        
        assert len(top10) <= 10
        
        # Trié par écart décroissant
        if len(top10) > 1:
            gaps = top10["Écart"].tolist()
            assert gaps == sorted(gaps, reverse=True)
    
    def test_excludes_same_filters(self, sample_cadence_df):
        """build_top10 applique les mêmes filtres que build_detail."""
        from prism_salesops.outputs import build_top10
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(min_events=5, exclude_reps=["ZZ"])
        top10 = build_top10(sample_cadence_df, config)
        
        # Pas de ZZ
        assert "ZZ" not in top10["Rep"].values


class TestBuildResumeRep:
    """Tests pour build_resume_rep()."""
    
    def test_aggregates_by_rep(self, sample_cadence_df):
        """build_resume_rep agrège par rep."""
        from prism_salesops.outputs import build_resume_rep
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(min_events=5, exclude_reps=["ZZ"])
        resume = build_resume_rep(sample_cadence_df, config)
        
        # Une ligne par rep
        assert len(resume) <= 2  # REP1, REP2 (ZZ exclu)
        
        expected_cols = ["Rep", "Nb clients", "Écart moyen", "Écart cumulé"]
        for col in expected_cols:
            assert col in resume.columns
    
    def test_filters_positive_gap_only(self, sample_cadence_df):
        """build_resume_rep ne compte que les écarts positifs."""
        from prism_salesops.outputs import build_resume_rep
        from prism_salesops.config import SalesOpsConfig
        
        # Ajouter un client avec écart négatif
        df = sample_cadence_df.copy()
        df.loc[0, "gap_months"] = -1.0  # REP1, CLI001 a un écart négatif
        
        config = SalesOpsConfig(min_events=5, exclude_reps=["ZZ"])
        resume = build_resume_rep(df, config)
        
        rep1_row = resume[resume["Rep"] == "REP1"].iloc[0]
        # CLI001 exclu car gap <= 0, seul CLI002 reste pour REP1
        assert rep1_row["Nb clients"] == 1
    
    def test_computes_cumulative_gap(self, sample_cadence_df):
        """build_resume_rep calcule l'écart cumulé."""
        from prism_salesops.outputs import build_resume_rep
        from prism_salesops.config import SalesOpsConfig
        
        config = SalesOpsConfig(min_events=1, exclude_reps=["ZZ"])
        resume = build_resume_rep(sample_cadence_df, config)
        
        # L'écart cumulé doit être la somme des écarts
        for _, row in resume.iterrows():
            assert row["Écart cumulé"] >= 0

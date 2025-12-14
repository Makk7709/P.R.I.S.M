"""
Fixtures partagées pour les tests SalesOps.
Génère des DataFrames et fichiers Excel synthétiques.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import date, timedelta
from pathlib import Path
import tempfile
import os


@pytest.fixture
def temp_dir():
    """Crée un répertoire temporaire pour les tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def sample_dataframe():
    """DataFrame minimal représentant un export commercial."""
    return pd.DataFrame({
        "Code Client Facturé": ["CLI001", "CLI002", "CLI001", "CLI003", "CLI002"],
        "Date de Livraison": [
            date(2024, 1, 15),
            date(2024, 2, 20),
            date(2024, 3, 10),
            date(2024, 4, 5),
            date(2024, 5, 12),
        ],
        "Numéro de Livraison": ["BL001", "BL002", "BL003", "BL004", "BL005"],
        "Code Article": ["ART001", "ART002", "ART001", "ART003", "ART002"],
        "Désignation": ["Produit A", "Produit B", "Produit A", "Produit C", "Produit B"],
        "Quantité": [10, 20, 15, 5, 25],
        "Montant Vente": [100.0, 200.0, 150.0, 50.0, 250.0],
        "CP Livré": ["75001", "69001", "75001", "31000", "69001"],
        "Rep": ["REP1", "REP2", "REP1", "REP1", "REP2"],
    })


@pytest.fixture
def dataframe_with_noise():
    """DataFrame avec lignes de bruit en haut (simule export réel)."""
    # Lignes parasites
    noise_rows = pd.DataFrame({
        "A": ["Rapport Export Commercial", None, "Période: 2024"],
        "B": [None, None, None],
        "C": [None, None, None],
        "D": [None, None, None],
        "E": [None, None, None],
        "F": [None, None, None],
        "G": [None, None, None],
        "H": [None, None, None],
        "I": [None, None, None],
    })
    
    # Ligne d'entêtes
    header_row = pd.DataFrame({
        "A": ["Code Client Facturé"],
        "B": ["Date de Livraison"],
        "C": ["Numéro de Livraison"],
        "D": ["Code Article"],
        "E": ["Désignation"],
        "F": ["Quantité"],
        "G": ["Montant Vente"],
        "H": ["CP Livré"],
        "I": ["Rep"],
    })
    
    # Données
    data_rows = pd.DataFrame({
        "A": ["CLI001", "CLI002", "CLI001"],
        "B": ["2024-01-15", "2024-02-20", "2024-03-10"],
        "C": ["BL001", "BL002", "BL003"],
        "D": ["ART001", "ART002", "ART001"],
        "E": ["Produit A", "Produit B", "Produit A"],
        "F": [10, 20, 15],
        "G": [100.0, 200.0, 150.0],
        "H": ["75001", "69001", "75001"],
        "I": ["REP1", "REP2", "REP1"],
    })
    
    return pd.concat([noise_rows, header_row, data_rows], ignore_index=True)


@pytest.fixture
def dataframe_with_returns():
    """DataFrame contenant des retours (quantités/montants négatifs)."""
    return pd.DataFrame({
        "Code Client Facturé": ["CLI001", "CLI001", "CLI002", "CLI002"],
        "Date de Livraison": [
            date(2024, 1, 15),
            date(2024, 2, 20),  # Retour
            date(2024, 3, 10),
            date(2024, 4, 5),
        ],
        "Code Article": ["ART001", "ART001", "ART002", "ART002"],
        "Quantité": [10, -5, 20, -10],  # Retours négatifs
        "Montant Vente": [100.0, -50.0, 200.0, -100.0],
        "Rep": ["REP1", "REP1", "REP2", "REP2"],
    })


@pytest.fixture
def dataframe_with_logistics():
    """DataFrame contenant des lignes logistiques."""
    return pd.DataFrame({
        "Code Client Facturé": ["CLI001", "CLI001", "CLI002", "CLI002"],
        "Date de Livraison": [
            date(2024, 1, 15),
            date(2024, 1, 15),  # Ligne logistique
            date(2024, 2, 20),
            date(2024, 2, 20),  # Ligne logistique
        ],
        "Code Article": ["ART001", "TRANSPORT", "ART002", "PALETTE"],
        "Désignation": ["Produit A", "Frais de transport", "Produit B", "Location palette"],
        "Quantité": [10, 1, 20, 2],
        "Montant Vente": [100.0, 25.0, 200.0, 15.0],
        "Rep": ["REP1", "REP1", "REP2", "REP2"],
    })


@pytest.fixture
def dataframe_without_delivery_number():
    """DataFrame sans numéro de livraison (doit générer event_id par hash)."""
    return pd.DataFrame({
        "Code Client Facturé": ["CLI001", "CLI001", "CLI002"],
        "Date de Livraison": [
            date(2024, 1, 15),
            date(2024, 1, 15),  # Même client, même date = même événement
            date(2024, 2, 20),
        ],
        "Code Article": ["ART001", "ART002", "ART001"],
        "Quantité": [10, 5, 20],
        "Montant Vente": [100.0, 50.0, 200.0],
        "Rep": ["REP1", "REP1", "REP2"],
    })


@pytest.fixture
def dataframe_for_cadence():
    """DataFrame pour tester les calculs de cadence avec historique."""
    dates = [
        date(2024, 1, 15),
        date(2024, 2, 15),  # +1 mois
        date(2024, 4, 15),  # +2 mois
        date(2024, 7, 15),  # +3 mois
        date(2024, 10, 15), # +3 mois
    ]
    return pd.DataFrame({
        "Code Client Facturé": ["CLI001"] * 5,
        "Date de Livraison": dates,
        "Numéro de Livraison": [f"BL{i:03d}" for i in range(1, 6)],
        "Code Article": ["ART001"] * 5,
        "Quantité": [10] * 5,
        "Montant Vente": [100.0] * 5,
        "Rep": ["REP1"] * 5,
    })


@pytest.fixture
def dataframe_zz_rep():
    """DataFrame avec rep ZZ à exclure."""
    return pd.DataFrame({
        "Code Client Facturé": ["CLI001", "CLI002", "CLI003"],
        "Date de Livraison": [
            date(2024, 1, 15),
            date(2024, 2, 20),
            date(2024, 3, 10),
        ],
        "Code Article": ["ART001", "ART002", "ART003"],
        "Quantité": [10, 20, 30],
        "Montant Vente": [100.0, 200.0, 300.0],
        "Rep": ["REP1", "ZZ", "zz"],  # ZZ et zz doivent être exclus
    })


def create_excel_from_df(df: pd.DataFrame, path: Path, sheet_name: str = "Sheet1"):
    """Crée un fichier Excel à partir d'un DataFrame."""
    df.to_excel(path, sheet_name=sheet_name, index=False)
    return path


@pytest.fixture
def sample_excel(temp_dir, sample_dataframe):
    """Crée un fichier Excel temporaire avec données propres."""
    path = temp_dir / "sample_export.xlsx"
    create_excel_from_df(sample_dataframe, path)
    return path


@pytest.fixture
def noisy_excel(temp_dir, dataframe_with_noise):
    """Crée un fichier Excel avec lignes de bruit."""
    path = temp_dir / "noisy_export.xlsx"
    dataframe_with_noise.to_excel(path, index=False, header=False)
    return path

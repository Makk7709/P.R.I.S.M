"""
Configuration centralisée pour PRISM SalesOps.
Utilise dataclasses pour la validation et les defaults.
"""

from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional


@dataclass
class SalesOpsConfig:
    """Configuration principale du pipeline SalesOps."""
    
    # Date de référence pour les calculs de cadence
    date_du_jour: date = field(default_factory=date.today)
    
    # Mode période (pour V1, MVP peut ignorer)
    mode_periode: str = "rolling_12m"
    
    # Suffixe pour les fichiers de sortie
    suffixe_sortie: str = "modifie"
    
    # Options de contacts (V1)
    ajouter_contacts: bool = False
    supprimer_tel_email_a_la_fin: bool = True
    
    # Filtres pour les analyses
    min_events: int = 5
    exclude_reps: List[str] = field(default_factory=lambda: ["ZZ"])
    
    # Mots-clés pour détecter les lignes logistiques
    logistique_keywords: List[str] = field(default_factory=lambda: [
        "transport", "palette", "palettes", "frais", "port", 
        "livraison", "manutention", "emballage", "carton",
        "caisse", "forfait", "expedition", "envoi"
    ])
    
    # Colonnes essentielles (doivent être présentes)
    essential_columns: List[str] = field(default_factory=lambda: [
        "customer_id", "event_date"
    ])
    
    # Aliases pour la détection de colonnes
    column_aliases: dict = field(default_factory=lambda: {
        "customer_id": [
            "code client facturé", "code client facture", 
            "client facturé", "client facture",
            "code client", "client", "code"
        ],
        "event_date": [
            "date de livraison", "date livraison", "livraison",
            "date bl", "date_livraison", "date"
        ],
        "delivery_number": [
            "numéro de livraison", "numero de livraison",
            "num livraison", "n° livraison", "n°bl", "bl"
        ],
        "product_code": [
            "code article", "article", "code produit", "produit",
            "référence", "reference", "ref"
        ],
        "designation": [
            "désignation", "designation", "libellé", "libelle",
            "description", "nom produit"
        ],
        "quantity": [
            "quantité", "quantite", "qté", "qte", "qty"
        ],
        "amount_sales": [
            "montant vente", "ca", "chiffre affaires", 
            "montant ht", "prix vente", "vente"
        ],
        "amount_purchase": [
            "montant achat", "prix achat", "coût", "cout", "achat"
        ],
        "cp_liv": [
            "cp livré", "cp_liv", "code postal", "cp",
            "cp livraison", "postal"
        ],
        "rep": [
            "rep", "représentant", "representant", 
            "commercial", "vendeur"
        ],
        "customer_name": [
            "nom client", "raison sociale", "client livré",
            "client_livre", "société", "societe"
        ]
    })
    
    # Constante pour conversion jours → mois
    days_per_month: float = 30.4375
    
    def get_aliases(self, canonical_name: str) -> List[str]:
        """Retourne les aliases pour une colonne canonique."""
        return self.column_aliases.get(canonical_name, [])
    
    def is_excluded_rep(self, rep: str) -> bool:
        """Vérifie si un rep doit être exclu (insensible à la casse)."""
        if rep is None:
            return False
        return rep.upper().strip() in [r.upper() for r in self.exclude_reps]

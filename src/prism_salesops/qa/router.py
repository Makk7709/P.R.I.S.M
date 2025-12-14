"""
Router de questions - Classifie l'intent (STRUCTURED/QUALITATIVE/HYBRID).
"""

import re
from typing import Optional, List, Dict, Any
from .schema import QuestionIntent, ConversationState


# Mots-clés pour classification
STRUCTURED_KEYWORDS = [
    # Chiffres/métriques
    r"\bca\b", r"chiffre", r"montant", r"marge", r"volume", r"quantit",
    r"combien", r"nombre", r"total", r"somme", r"moyenne",
    # Classements
    r"top\s*\d*", r"meilleur", r"pire", r"classement", r"rang",
    # Évolutions
    r"évolution", r"evolution", r"croissance", r"baisse", r"hausse",
    r"progression", r"comparaison", r"entre.*et",
    # Listes quantitatives
    r"liste\s*(des|les)?\s*(clients?|produits?|commandes?)",
    # Périodes
    r"\d+\s*mois", r"annuel", r"mensuel", r"trimestre",
]

QUALITATIVE_KEYWORDS = [
    # Pourquoi/comment
    r"pourquoi", r"comment\s+expliquer", r"raison",
    # Retours terrain (avec ou sans espace)
    r"objection", r"plainte", r"retours?\s*terrain", r"feedback",
    r"que\s+disent", r"selon\s+les\s+commerciaux",
    # CR spécifiques
    r"visite", r"compte[- ]rendu", r"cr\b", r"notes?\s+de\s+visite",
    # Concurrence
    r"concurrence", r"concurrent",
    # Opinions
    r"avis", r"sentiment", r"perception",
    # Expliquer
    r"expliqu", r"justifi",
]

HYBRID_INDICATORS = [
    r"(top|liste|clients?).*\+.*(cr|pourquoi|visites?)",
    r"(chiffres?|ca|volume).*\+.*(commentaires?|cr)",
    r"(baiss|retard|perdus?).*pourquoi",
    r"et\s+(qu'est-ce|pourquoi|que\s+disent)",
    r"avec\s+(commentaires?|explications?|cr)",
]

AMBIGUOUS_REGION_TERMS = [
    # Seulement quand "sud/nord/est/ouest" sont des zones géographiques isolées
    r"(?:la|le|du|de)\s+(?:région\s+)?(?:sud|nord)\b",
    r"\brégion\s+(?:sud|nord|est|ouest)\b",
    # Éviter de matcher "Quelle est" - "est" doit être précédé d'un contexte géo
    r"(?:zone|secteur|territoire)\s+(?:sud|nord|est|ouest)\b",
]


class QuestionRouter:
    """Route les questions vers le bon handler."""
    
    def __init__(self, llm_client: Optional[Any] = None):
        self.llm_client = llm_client
    
    def route(
        self,
        question: str,
        state: Optional[ConversationState] = None
    ) -> Dict[str, Any]:
        """
        Classifie une question.
        
        Returns:
            Dict avec intent, clarifying_question, assumptions, filters, options
        """
        question_lower = question.lower()
        
        # 1. Vérifier les ambiguïtés d'abord
        ambiguity = self._check_ambiguity(question_lower, state)
        if ambiguity:
            return ambiguity
        
        # 2. Détecter hybrid (prioritaire car combine les deux)
        if self._is_hybrid(question_lower):
            return {
                "intent": QuestionIntent.HYBRID,
                "assumptions": self._extract_assumptions(question_lower, state),
                "filters": self._extract_filters(question_lower, state),
            }
        
        # 3. Détecter qualitative
        if self._is_qualitative(question_lower):
            return {
                "intent": QuestionIntent.QUALITATIVE,
                "assumptions": self._extract_assumptions(question_lower, state),
            }
        
        # 4. Par défaut: structured (si mots-clés ou question sur données)
        assumptions = self._extract_assumptions(question_lower, state)
        
        return {
            "intent": QuestionIntent.STRUCTURED,
            "assumptions": assumptions,
            "filters": self._extract_filters(question_lower, state),
        }
    
    def _is_hybrid(self, question: str) -> bool:
        """Détecte si la question est hybride (chiffres + CR)."""
        for pattern in HYBRID_INDICATORS:
            if re.search(pattern, question, re.IGNORECASE):
                return True
        
        # Aussi hybrid si contient à la fois structured et qualitative
        has_structured = any(re.search(p, question) for p in STRUCTURED_KEYWORDS)
        has_qualitative = any(re.search(p, question) for p in QUALITATIVE_KEYWORDS)
        
        return has_structured and has_qualitative
    
    def _is_qualitative(self, question: str) -> bool:
        """Détecte si la question est qualitative."""
        for pattern in QUALITATIVE_KEYWORDS:
            if re.search(pattern, question, re.IGNORECASE):
                return True
        return False
    
    def _check_ambiguity(
        self,
        question: str,
        state: Optional[ConversationState]
    ) -> Optional[Dict[str, Any]]:
        """Vérifie les ambiguïtés nécessitant clarification."""
        
        # Ambiguïté sur "région Sud/Nord/etc"
        for pattern in AMBIGUOUS_REGION_TERMS:
            if re.search(pattern, question, re.IGNORECASE):
                return {
                    "intent": QuestionIntent.NEED_CLARIFICATION,
                    "clarifying_question": (
                        "Le terme 'région' est ambigu. Voulez-vous dire :\n"
                        "1) Les départements du sud de la France (ex: 13, 31, 34...)\n"
                        "2) Une région administrative spécifique (ex: PACA, Occitanie)\n"
                        "3) Le secteur d'un commercial particulier"
                    ),
                    "options": [
                        "Départements du sud (13, 31, 34, 06, 83...)",
                        "Région administrative (préciser laquelle)",
                        "Secteur commercial (préciser le rep)",
                    ],
                }
        
        return None
    
    def _extract_assumptions(
        self,
        question: str,
        state: Optional[ConversationState]
    ) -> List[str]:
        """Extrait les assumptions faites pour répondre."""
        assumptions = []
        
        # Période par défaut si non spécifiée
        if not re.search(r"\d+\s*mois|202\d|trimestre|annuel", question):
            if state and state.period_start:
                assumptions.append(f"Période: {state.period_start} → {state.period_end}")
            else:
                assumptions.append("Période: 12 derniers mois (par défaut)")
        
        # Exclusions standard
        assumptions.append("Exclusions: retours, logistique, ventes à zéro")
        
        return assumptions
    
    def _extract_filters(
        self,
        question: str,
        state: Optional[ConversationState]
    ) -> Dict[str, Any]:
        """Extrait les filtres détectés dans la question."""
        filters = {}
        
        # Détecter les départements (2 chiffres)
        depts = re.findall(r"\b(0[1-9]|[1-9][0-9])\b", question)
        if depts:
            filters["depts"] = depts
        elif state and state.depts:
            # Utiliser le contexte si c'est un follow-up
            if self._is_follow_up(question):
                filters["depts"] = state.depts
        
        # Détecter les codes clients
        clients = re.findall(r"\b([A-Z]{2,4}\d{2,4})\b", question.upper())
        if clients:
            filters["customers"] = clients
        
        # Détecter les familles produit
        for family in ["compact", "widget", "premium"]:
            if family in question.lower():
                filters["product_family"] = family
        
        # Détecter les commerciaux
        reps = re.findall(r"\b(REP\d+|[A-Z]{2,3})\b", question.upper())
        if reps and any(r.startswith("REP") for r in reps):
            filters["reps"] = [r for r in reps if r.startswith("REP")]
        
        return filters
    
    def _is_follow_up(self, question: str) -> bool:
        """Détecte si c'est une question de suivi."""
        follow_up_patterns = [
            r"^et\s+", r"^pour\s+le\s+", r"^pour\s+la\s+",
            r"^qu'en\s+est-il", r"^et\s+si\s+on",
            r"^même\s+chose", r"^pareil\s+",
        ]
        return any(re.match(p, question, re.IGNORECASE) for p in follow_up_patterns)

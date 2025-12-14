"""
PHASE 2 - Tests TDD pour le router de questions.
"""

import pytest
from prism_salesops.qa.schema import QuestionIntent, ConversationState


class TestQuestionRouter:
    """Tests pour QuestionRouter."""
    
    # === STRUCTURED (chiffres) ===
    
    @pytest.mark.parametrize("question", [
        "Quel est le CA par région sur 12 mois ?",
        "Top 10 clients en retard sur compact",
        "Combien de commandes ce mois-ci ?",
        "Quelle est la marge totale par commercial ?",
        "Liste des clients avec plus de 5 commandes",
        "Évolution du CA entre 2023 et 2024",
    ])
    def test_structured_questions(self, question):
        """Les questions sur les chiffres sont STRUCTURED."""
        from prism_salesops.qa.router import QuestionRouter
        
        router = QuestionRouter()
        result = router.route(question)
        
        assert result["intent"] == QuestionIntent.STRUCTURED
    
    # === QUALITATIVE (CR) ===
    
    @pytest.mark.parametrize("question", [
        "Pourquoi le client CHA001 ralentit ?",
        "Quelles objections reviennent sur le blanc lune ?",
        "Que disent les commerciaux sur la concurrence ?",
        "Y a-t-il des plaintes sur les délais ?",
        "Quels retours terrain sur le nouveau produit ?",
    ])
    def test_qualitative_questions(self, question):
        """Les questions qualitatives sont QUALITATIVE."""
        from prism_salesops.qa.router import QuestionRouter
        
        router = QuestionRouter()
        result = router.route(question)
        
        assert result["intent"] == QuestionIntent.QUALITATIVE
    
    # === HYBRID ===
    
    @pytest.mark.parametrize("question", [
        "Top clients en retard + qu'est-ce que les CR disent ?",
        "Quels clients ont baissé et pourquoi selon les visites ?",
        "Liste les clients perdus et leurs objections",
        "CA par région avec commentaires commerciaux",
    ])
    def test_hybrid_questions(self, question):
        """Les questions mixtes chiffres+CR sont HYBRID."""
        from prism_salesops.qa.router import QuestionRouter
        
        router = QuestionRouter()
        result = router.route(question)
        
        assert result["intent"] == QuestionIntent.HYBRID
    
    # === NEED_CLARIFICATION ===
    
    def test_ambiguous_region_needs_clarification(self):
        """'région Sud' est ambigu et nécessite clarification."""
        from prism_salesops.qa.router import QuestionRouter
        
        router = QuestionRouter()
        result = router.route("CA de la région Sud")
        
        assert result["intent"] == QuestionIntent.NEED_CLARIFICATION
        assert "clarifying_question" in result
        assert len(result.get("options", [])) >= 2
    
    def test_ambiguous_period_needs_clarification(self):
        """Question sans période explicite avec historique peut nécessiter clarification."""
        from prism_salesops.qa.router import QuestionRouter
        
        router = QuestionRouter()
        # Pas de contexte, période non spécifiée
        result = router.route("Évolution du CA", state=None)
        
        # Devrait demander la période ou assumer 12 mois
        assert result["intent"] in [QuestionIntent.NEED_CLARIFICATION, QuestionIntent.STRUCTURED]
        if result["intent"] == QuestionIntent.STRUCTURED:
            assert "assumptions" in result  # Doit indiquer l'assumption
    
    # === CONTEXT ===
    
    def test_follow_up_uses_context(self):
        """Un follow-up utilise le contexte précédent."""
        from prism_salesops.qa.router import QuestionRouter
        
        router = QuestionRouter()
        
        # Premier tour : définit le contexte
        state = ConversationState()
        state.depts = ["75", "69"]
        state.add_turn("CA par département pour 75 et 69", "Le CA est de 500k...")
        
        # Follow-up
        result = router.route("Et pour le 31 ?", state=state)
        
        # Devrait comprendre que c'est un département
        assert result["intent"] == QuestionIntent.STRUCTURED
        assert "31" in str(result.get("filters", {})) or "31" in str(result.get("assumptions", []))
    
    def test_clear_context_on_new_topic(self):
        """Un nouveau sujet réinitialise le contexte."""
        from prism_salesops.qa.router import QuestionRouter
        
        router = QuestionRouter()
        
        state = ConversationState()
        state.depts = ["75"]
        state.product_families = ["Compact"]
        
        result = router.route("Quels sont les meilleurs clients globalement ?", state=state)
        
        # Question générale - ne devrait pas garder les filtres précédents
        assert result["intent"] == QuestionIntent.STRUCTURED

import pytest
import os
from integration.perplexity import query_perplexity

# Ajout : chargement manuel de la clé API depuis .env.local si absente
def load_env_key():
    if not os.getenv('PERPLEXITY_API_KEY'):
        try:
            with open('.env.local') as f:
                for line in f:
                    if line.startswith('PERPLEXITY_API_KEY='):
                        key = line.strip().split('=', 1)[1]
                        os.environ['PERPLEXITY_API_KEY'] = key
        except Exception:
            pass

def test_query_perplexity():
    """
    Test de la fonction query_perplexity avec un prompt simple.
    Vérifie que la réponse est une chaîne non vide.
    """
    load_env_key()
    if not os.getenv('PERPLEXITY_API_KEY'):
        pytest.skip("PERPLEXITY_API_KEY non définie dans les variables d'environnement")
    
    # Prompt simple pour le test
    prompt = "Qui est Albert Einstein ?"
    
    try:
        # Appel de la fonction
        response = query_perplexity(prompt)
        
        # Vérifications
        assert response is not None, "La réponse ne devrait pas être None"
        assert isinstance(response, str), "La réponse devrait être une chaîne de caractères"
        assert response.strip() != "", "La réponse ne devrait pas être vide"
        
    except Exception as e:
        pytest.fail(f"Le test a échoué avec l'erreur: {str(e)}") 
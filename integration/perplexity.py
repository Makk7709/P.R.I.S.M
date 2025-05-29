import os
import requests
import logging
import time
from typing import Optional
from datetime import datetime
from pathlib import Path

# Configuration du logging spécifique à Perplexity
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

perplexity_logger = logging.getLogger("perplexity")
perplexity_logger.setLevel(logging.INFO)

# Handler pour le fichier de log
file_handler = logging.FileHandler(log_dir / "perplexity.log")
file_handler.setFormatter(logging.Formatter("[%(asctime)s] %(levelname)s - %(message)s"))
perplexity_logger.addHandler(file_handler)

class PerplexityAPIError(Exception):
    """Exception personnalisée pour les erreurs de l'API Perplexity"""
    pass

def query_perplexity(prompt: str, model: str = "llama-3.1-sonar-small-128k-online") -> str:
    """
    Envoie une requête à l'API Perplexity avec retry automatique et logging.
    
    Args:
        prompt (str): La requête à envoyer à l'API
        model (str): Le modèle à utiliser (par défaut: llama-3.1-sonar-small-128k-online)
        
    Returns:
        str: La réponse de l'API
        
    Raises:
        ValueError: Si la clé API est manquante
        PerplexityAPIError: En cas d'échec de l'API
        requests.exceptions.RequestException: En cas d'erreur réseau
    """
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        error_msg = "Clé API Perplexity manquante dans les variables d'environnement"
        perplexity_logger.error(error_msg)
        raise ValueError(error_msg)

    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    max_retries = 3
    timeout = 10  # secondes
    retry_delay = 1  # seconde

    for attempt in range(max_retries):
        try:
            perplexity_logger.info(f"PROMPT - {prompt}")
            
            response = requests.post(url, headers=headers, json=payload, timeout=timeout)
            
            if response.status_code == 200:
                data = response.json()
                response_content = data["choices"][0]["message"]["content"]
                perplexity_logger.info(f"RESPONSE - {response_content}")
                return response_content
            else:
                error_msg = f"Erreur API Perplexity - Status {response.status_code} - {response.text}"
                perplexity_logger.error(error_msg)
                
                if attempt < max_retries - 1:
                    perplexity_logger.info(f"Tentative {attempt + 1}/{max_retries} échouée. Nouvelle tentative dans {retry_delay}s...")
                    time.sleep(retry_delay)
                    continue
                raise PerplexityAPIError(error_msg)
                
        except requests.exceptions.Timeout:
            error_msg = f"Timeout après {timeout} secondes"
            perplexity_logger.error(error_msg)
            if attempt < max_retries - 1:
                perplexity_logger.info(f"Tentative {attempt + 1}/{max_retries} échouée. Nouvelle tentative dans {retry_delay}s...")
                time.sleep(retry_delay)
                continue
            raise PerplexityAPIError(error_msg)
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Erreur réseau: {str(e)}"
            perplexity_logger.error(error_msg)
            if attempt < max_retries - 1:
                perplexity_logger.info(f"Tentative {attempt + 1}/{max_retries} échouée. Nouvelle tentative dans {retry_delay}s...")
                time.sleep(retry_delay)
                continue
            raise PerplexityAPIError(error_msg)

    raise PerplexityAPIError("Échec après tous les retries")

def query_perplexity_old(prompt: str) -> Optional[str]:
    """
    Envoie une requête à l'API Perplexity et retourne la réponse.
    
    Args:
        prompt (str): La requête à envoyer à l'API
        
    Returns:
        Optional[str]: La réponse de l'API ou None en cas d'erreur
    """
    api_key = os.getenv('PERPLEXITY_API_KEY')
    if not api_key:
        logger.error("PERPLEXITY_API_KEY non définie dans les variables d'environnement")
        return None
        
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "pplx-7b-online",
        "messages": [{"role": "user", "content": prompt}]
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        
        data = response.json()
        return data.get('choices', [{}])[0].get('message', {}).get('content')
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Erreur lors de la requête à l'API Perplexity: {str(e)}")
        return None
    except (KeyError, IndexError) as e:
        logger.error(f"Erreur lors du parsing de la réponse: {str(e)}")
        return None 
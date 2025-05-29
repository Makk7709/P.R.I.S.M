import pytest
import os
import time
from unittest.mock import patch, MagicMock
from integration.perplexity import query_perplexity, PerplexityAPIError
import logging
import requests

# Configuration pour les tests
TEST_API_KEY = "test_api_key"
TEST_PROMPT = "Test prompt"
TEST_RESPONSE = "Test response"

@pytest.fixture
def mock_env():
    """Fixture pour simuler la présence de la clé API"""
    with patch.dict(os.environ, {"PERPLEXITY_API_KEY": TEST_API_KEY}):
        yield

@pytest.fixture
def mock_requests():
    """Fixture pour mocker les requêtes HTTP"""
    with patch("requests.post") as mock_post:
        yield mock_post

def test_query_success(mock_env, mock_requests):
    """Test d'une requête réussie"""
    # Configuration du mock
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": TEST_RESPONSE}}]
    }
    mock_requests.return_value = mock_response

    # Test
    response = query_perplexity(TEST_PROMPT)
    assert response == TEST_RESPONSE
    mock_requests.assert_called_once()

def test_query_invalid_model(mock_env, mock_requests):
    """Test avec un modèle invalide"""
    # Configuration du mock
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.text = "Invalid model"
    mock_requests.return_value = mock_response

    # Test
    with pytest.raises(PerplexityAPIError):
        query_perplexity(TEST_PROMPT, model="invalid-model")
    
    # Vérifie que 3 tentatives ont été faites
    assert mock_requests.call_count == 3

def test_query_timeout(mock_env, mock_requests):
    """Test du timeout et du retry"""
    # Configuration du mock pour simuler un timeout
    mock_requests.side_effect = [
        requests.exceptions.Timeout(),
        MagicMock(status_code=200, json=lambda: {"choices": [{"message": {"content": TEST_RESPONSE}}]})
    ]

    # Test
    response = query_perplexity(TEST_PROMPT)
    assert response == TEST_RESPONSE
    assert mock_requests.call_count == 2

def test_query_network_error(mock_env, mock_requests):
    """Test d'une erreur réseau"""
    # Configuration du mock pour simuler une erreur réseau
    mock_requests.side_effect = requests.exceptions.RequestException("Network error")

    # Test
    with pytest.raises(PerplexityAPIError):
        query_perplexity(TEST_PROMPT)
    
    # Vérifie que 3 tentatives ont été faites
    assert mock_requests.call_count == 3

def test_logging_prompt_and_response(mock_env, mock_requests, caplog):
    """Test du logging des prompts et réponses"""
    # Configuration du mock
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": TEST_RESPONSE}}]
    }
    mock_requests.return_value = mock_response

    # Test
    with caplog.at_level(logging.INFO):
        query_perplexity(TEST_PROMPT)
        
        # Vérifie les logs
        assert any(f"PROMPT - {TEST_PROMPT}" in record.message for record in caplog.records)
        assert any(f"RESPONSE - {TEST_RESPONSE}" in record.message for record in caplog.records)

def test_logging_errors(mock_env, mock_requests, caplog):
    """Test du logging des erreurs"""
    # Configuration du mock pour simuler une erreur
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.text = "Error message"
    mock_requests.return_value = mock_response

    # Test avec capture de tous les niveaux de log
    with caplog.at_level(logging.INFO):
        with pytest.raises(PerplexityAPIError):
            query_perplexity(TEST_PROMPT)
        
        # Vérifie les logs d'erreur et de tentative
        error_logs = [record for record in caplog.records if record.levelno >= logging.ERROR]
        info_logs = [record for record in caplog.records if record.levelno == logging.INFO]
        
        assert any("Erreur API Perplexity" in record.message for record in error_logs)
        assert any("Tentative" in record.message for record in info_logs) 
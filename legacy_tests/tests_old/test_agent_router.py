import pytest
from unittest.mock import Mock, patch
import logging
from pathlib import Path
from src.agent_router import AgentRouter, TaskContext, ProviderType, BaseProvider

# Configuration du logging pour les tests
@pytest.fixture(autouse=True)
def setup_logging():
    log_file = Path("logs/orchestration.log")
    log_file.parent.mkdir(exist_ok=True)
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )

@pytest.fixture
def mock_providers():
    providers = {
        ProviderType.PERPLEXITY: Mock(spec=BaseProvider),
        ProviderType.OPENAI: Mock(spec=BaseProvider),
        ProviderType.CLAUDE: Mock(spec=BaseProvider)
    }
    return providers

@pytest.fixture
def agent_router(mock_providers):
    return AgentRouter(providers=mock_providers)

def test_route_task_accuracy_priority(agent_router, mock_providers):
    """Test que les tâches nécessitant une haute précision sont routées vers Perplexity."""
    context = TaskContext(
        task_type="accuracy",
        description="Analyse précise de données techniques",
        priority="high"
    )
    
    result = agent_router.route_task(context)
    
    assert result.provider == ProviderType.PERPLEXITY
    mock_providers[ProviderType.PERPLEXITY].process.assert_called_once_with(context)
    mock_providers[ProviderType.OPENAI].process.assert_not_called()
    mock_providers[ProviderType.CLAUDE].process.assert_not_called()

def test_route_task_creativity_priority(agent_router, mock_providers):
    """Test que les tâches nécessitant de la créativité sont routées vers OpenAI."""
    context = TaskContext(
        task_type="creativity",
        description="Génération de contenu créatif",
        priority="high"
    )
    
    result = agent_router.route_task(context)
    
    assert result.provider == ProviderType.OPENAI
    mock_providers[ProviderType.OPENAI].process.assert_called_once_with(context)
    mock_providers[ProviderType.PERPLEXITY].process.assert_not_called()
    mock_providers[ProviderType.CLAUDE].process.assert_not_called()

def test_route_task_strategic_priority(agent_router, mock_providers):
    """Test que les tâches nécessitant une analyse stratégique sont routées vers Claude."""
    context = TaskContext(
        task_type="strategy",
        description="Analyse stratégique de marché",
        priority="high"
    )
    
    result = agent_router.route_task(context)
    
    assert result.provider == ProviderType.CLAUDE
    mock_providers[ProviderType.CLAUDE].process.assert_called_once_with(context)
    mock_providers[ProviderType.PERPLEXITY].process.assert_not_called()
    mock_providers[ProviderType.OPENAI].process.assert_not_called()

def test_fallback_on_failure(agent_router, mock_providers):
    """Test le mécanisme de fallback en cas d'échec du fournisseur principal."""
    # Simuler un échec du fournisseur principal (Perplexity)
    mock_providers[ProviderType.PERPLEXITY].process.side_effect = Exception("API Error")
    
    context = TaskContext(
        task_type="accuracy",
        description="Analyse précise de données techniques",
        priority="high"
    )
    
    result = agent_router.route_task(context)
    
    # Vérifier que le fallback a été effectué vers OpenAI
    assert result.provider == ProviderType.OPENAI
    mock_providers[ProviderType.PERPLEXITY].process.assert_called_once_with(context)
    mock_providers[ProviderType.OPENAI].process.assert_called_once_with(context)

def test_logging_of_decisions(agent_router, mock_providers, caplog):
    """Test que les décisions de routage sont correctement enregistrées."""
    context = TaskContext(
        task_type="accuracy",
        description="Analyse précise de données techniques",
        priority="high"
    )
    
    with caplog.at_level(logging.DEBUG):
        agent_router.route_task(context)
    
    # Vérifier que les informations essentielles sont présentes dans les logs
    assert "Routing task to PERPLEXITY" in caplog.text
    assert "Task context:" in caplog.text
    assert "task_type='accuracy'" in caplog.text
    assert "description='Analyse précise de données techniques'" in caplog.text
    assert "priority='high'" in caplog.text

def test_invalid_context_handling(agent_router):
    """Test la gestion des contextes de tâche invalides."""
    # Test avec un contexte incomplet
    with pytest.raises(ValueError):
        agent_router.route_task(TaskContext(
            task_type="",
            description="",
            priority="high"
        ))
    
    # Test avec un type de tâche invalide
    with pytest.raises(ValueError):
        agent_router.route_task(TaskContext(
            task_type="invalid_type",
            description="Test description",
            priority="high"
        )) 
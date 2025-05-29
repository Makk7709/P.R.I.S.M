import logging
import os
from typing import Dict, Optional
from enum import Enum
from dataclasses import dataclass

# Configuration du logging
logging.basicConfig(
    filename='logs/orchestration.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('agent_router')

class TaskType(Enum):
    RESEARCH = "research"
    ANALYSIS = "analysis"
    GENERATION = "generation"
    ETHICAL = "ethical"
    STRATEGIC = "strategic"

class AIProvider(Enum):
    PERPLEXITY = "perplexity"
    OPENAI = "openai"
    CLAUDE = "claude"

@dataclass
class TaskContext:
    task_type: TaskType
    requires_accuracy: bool = False
    requires_creativity: bool = False
    requires_ethical_judgment: bool = False
    requires_strategic_thinking: bool = False
    max_tokens: Optional[int] = None
    temperature: float = 0.7

class AgentRouter:
    def __init__(self):
        self.provider_weights = {
            AIProvider.PERPLEXITY: {
                TaskType.RESEARCH: 0.9,
                TaskType.ANALYSIS: 0.7,
                TaskType.GENERATION: 0.3,
                TaskType.ETHICAL: 0.4,
                TaskType.STRATEGIC: 0.5
            },
            AIProvider.OPENAI: {
                TaskType.RESEARCH: 0.6,
                TaskType.ANALYSIS: 0.7,
                TaskType.GENERATION: 0.9,
                TaskType.ETHICAL: 0.6,
                TaskType.STRATEGIC: 0.7
            },
            AIProvider.CLAUDE: {
                TaskType.RESEARCH: 0.7,
                TaskType.ANALYSIS: 0.8,
                TaskType.GENERATION: 0.7,
                TaskType.ETHICAL: 0.9,
                TaskType.STRATEGIC: 0.9
            }
        }

    def _determine_task_type(self, task_description: str) -> TaskType:
        """Détermine le type de tâche à partir de sa description."""
        task_description = task_description.lower()
        
        if any(word in task_description for word in ['recherche', 'find', 'search', 'look up']):
            return TaskType.RESEARCH
        elif any(word in task_description for word in ['analyse', 'analyze', 'evaluate', 'assess']):
            return TaskType.ANALYSIS
        elif any(word in task_description for word in ['génère', 'generate', 'create', 'write']):
            return TaskType.GENERATION
        elif any(word in task_description for word in ['éthique', 'ethical', 'moral', 'right']):
            return TaskType.ETHICAL
        elif any(word in task_description for word in ['stratégie', 'strategy', 'plan', 'tactical']):
            return TaskType.STRATEGIC
        
        return TaskType.ANALYSIS  # Type par défaut

    def _select_provider(self, context: TaskContext) -> AIProvider:
        """Sélectionne le fournisseur d'IA optimal en fonction du contexte."""
        scores = {}
        
        for provider in AIProvider:
            base_score = self.provider_weights[provider][context.task_type]
            
            # Ajustements basés sur les exigences spécifiques
            if context.requires_accuracy and provider == AIProvider.PERPLEXITY:
                base_score *= 1.2
            if context.requires_creativity and provider == AIProvider.OPENAI:
                base_score *= 1.2
            if context.requires_ethical_judgment and provider == AIProvider.CLAUDE:
                base_score *= 1.2
            if context.requires_strategic_thinking and provider == AIProvider.CLAUDE:
                base_score *= 1.2
                
            scores[provider] = base_score
        
        selected_provider = max(scores.items(), key=lambda x: x[1])[0]
        logger.info(f"Selected provider {selected_provider} for task type {context.task_type}")
        return selected_provider

    def _call_provider(self, provider: AIProvider, task_description: str, context: TaskContext) -> str:
        """Appelle le fournisseur d'IA sélectionné."""
        try:
            # TODO: Implémenter les appels réels aux API
            if provider == AIProvider.PERPLEXITY:
                return "Réponse de Perplexity"
            elif provider == AIProvider.OPENAI:
                return "Réponse d'OpenAI"
            elif provider == AIProvider.CLAUDE:
                return "Réponse de Claude"
        except Exception as e:
            logger.error(f"Error calling {provider}: {str(e)}")
            return self._fallback_call(task_description, context)

    def _fallback_call(self, task_description: str, context: TaskContext) -> str:
        """Gère les appels de secours en cas d'échec du fournisseur principal."""
        logger.warning("Attempting fallback call")
        # TODO: Implémenter la logique de fallback
        return "Réponse de secours"

    def route_task(self, task_description: str, context: Dict) -> str:
        """
        Route une tâche vers le fournisseur d'IA optimal.
        
        Args:
            task_description: Description de la tâche à exécuter
            context: Dictionnaire contenant le contexte de la tâche
            
        Returns:
            str: Réponse du fournisseur d'IA
        """
        task_type = self._determine_task_type(task_description)
        task_context = TaskContext(
            task_type=task_type,
            requires_accuracy=context.get('requires_accuracy', False),
            requires_creativity=context.get('requires_creativity', False),
            requires_ethical_judgment=context.get('requires_ethical_judgment', False),
            requires_strategic_thinking=context.get('requires_strategic_thinking', False),
            max_tokens=context.get('max_tokens'),
            temperature=context.get('temperature', 0.7)
        )
        
        selected_provider = self._select_provider(task_context)
        return self._call_provider(selected_provider, task_description, task_context) 
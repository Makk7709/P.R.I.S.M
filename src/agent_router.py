import logging
from enum import Enum
from dataclasses import dataclass
from typing import Optional, Dict, Type

class ProviderType(Enum):
    PERPLEXITY = "perplexity"
    OPENAI = "openai"
    CLAUDE = "claude"

@dataclass
class TaskContext:
    task_type: str
    description: str
    priority: str

@dataclass
class TaskResult:
    provider: ProviderType
    response: str
    error: Optional[str] = None

class BaseProvider:
    def process(self, context: TaskContext) -> str:
        raise NotImplementedError

class PerplexityProvider(BaseProvider):
    def process(self, context: TaskContext) -> str:
        return "Perplexity response"

class OpenAIProvider(BaseProvider):
    def process(self, context: TaskContext) -> str:
        return "OpenAI response"

class ClaudeProvider(BaseProvider):
    def process(self, context: TaskContext) -> str:
        return "Claude response"

class AgentRouter:
    def __init__(self, providers: Optional[Dict[ProviderType, BaseProvider]] = None):
        self.logger = logging.getLogger(__name__)
        self.providers = providers or {
            ProviderType.PERPLEXITY: PerplexityProvider(),
            ProviderType.OPENAI: OpenAIProvider(),
            ProviderType.CLAUDE: ClaudeProvider()
        }
        self.fallback_order = [
            ProviderType.PERPLEXITY,
            ProviderType.OPENAI,
            ProviderType.CLAUDE
        ]

    def _validate_context(self, context: TaskContext):
        if not context.task_type or not context.description:
            raise ValueError("Task type and description are required")
        if context.task_type not in ["accuracy", "creativity", "strategy"]:
            raise ValueError(f"Invalid task type: {context.task_type}")

    def _select_provider(self, context: TaskContext) -> ProviderType:
        if context.task_type == "accuracy":
            return ProviderType.PERPLEXITY
        elif context.task_type == "creativity":
            return ProviderType.OPENAI
        elif context.task_type == "strategy":
            return ProviderType.CLAUDE
        raise ValueError(f"Unknown task type: {context.task_type}")

    def route_task(self, context: TaskContext) -> TaskResult:
        self._validate_context(context)
        
        selected_provider = self._select_provider(context)
        self.logger.debug(f"Routing task to {selected_provider.name}")
        self.logger.debug(f"Task context: {context}")
        
        # Try the selected provider first
        try:
            response = self.providers[selected_provider].process(context)
            return TaskResult(provider=selected_provider, response=response)
        except Exception as e:
            self.logger.warning(f"Error with {selected_provider.name}: {str(e)}")
            
            # Try fallback providers
            for provider in self.fallback_order:
                if provider != selected_provider:
                    try:
                        response = self.providers[provider].process(context)
                        self.logger.info(f"Fallback to {provider.name} successful")
                        return TaskResult(provider=provider, response=response)
                    except Exception as fallback_error:
                        self.logger.error(f"Fallback to {provider.name} failed: {str(fallback_error)}")
            
            return TaskResult(
                provider=selected_provider,
                response="",
                error="All providers failed"
            ) 
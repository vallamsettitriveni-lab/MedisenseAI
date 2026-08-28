import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any
from app.config import settings

class BaseLLMProvider(ABC):
    @abstractmethod
    def generate_explanation(self, prompt: str) -> str:
        pass

class LocalOllamaProvider(BaseLLMProvider):
    def __init__(self, base_url: str = None, model_name: str = None):
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model_name = model_name or settings.DEFAULT_LLM_MODEL

    def generate_explanation(self, prompt: str) -> str:
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": prompt,
                        "stream": False
                    }
                )
                if response.status_code == 200:
                    return response.json().get("response", "")
        except Exception as e:
            print(f"Ollama local connection error: {e}. Utilizing local template generator fallback.")
        return ""

class FutureCloudProvider(BaseLLMProvider):
    def generate_explanation(self, prompt: str) -> str:
        # Placeholder for Cloud API integration (e.g. Anthropic, OpenAI)
        raise NotImplementedError("Cloud Provider not configured.")

class LLMService:
    def __init__(self, provider: BaseLLMProvider = None):
        self.provider = provider or LocalOllamaProvider()

    def generate(self, prompt: str) -> str:
        res = self.provider.generate_explanation(prompt)
        if res:
            return res
        return self._rule_based_explanation_fallback(prompt)

    def _rule_based_explanation_fallback(self, prompt: str) -> str:
        """
        Fallback educational text when local Ollama is not active or responding.
        Strictly compliant with non-diagnostic safety instructions.
        """
        return (
            "Based on the extracted lab findings:\n\n"
            "• **Observed Status**: Certain values deviate from the reference range on your lab sheet.\n"
            "• **General Educational Insights**: Laboratory reference ranges indicate target physiological baselines. Deviations can occur due to dietary factors, stress, temporary hydration changes, or underlying health conditions.\n"
            "• **Questions to Discuss with Your Doctor**:\n"
            "  1. What do these abnormal results mean in the context of my overall medical history?\n"
            "  2. Do I need any follow-up blood tests or diagnostic panels?\n"
            "  3. Are there specific lifestyle adjustments appropriate for me?\n"
        )

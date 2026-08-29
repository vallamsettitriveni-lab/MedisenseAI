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
            # Short 1.5s timeout so cloud deployments (Render/Vercel) without Ollama don't hang
            with httpx.Client(timeout=1.5) as client:
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
        except Exception:
            pass
        return ""

class LLMService:
    def __init__(self, provider: BaseLLMProvider = None):
        self.provider = provider or LocalOllamaProvider()

    def generate(self, prompt: str) -> str:
        res = self.provider.generate_explanation(prompt)
        if res and len(res.strip()) > 20:
            return res
        return self._rule_based_explanation_fallback(prompt)

    def _rule_based_explanation_fallback(self, prompt: str) -> str:
        """
        Instant fallback educational text compliant with non-diagnostic safety instructions.
        """
        return (
            "• **Comprehensive Overview**: Your lab report has been parsed and structured into the health baseline table above.\n\n"
            "• **Educational Guidance**: Standard physiological reference ranges reflect typical baselines for healthy adults. Any flags (LOW or HIGH) highlight areas to discuss with your doctor to assess diet, hydration, sleep, or appropriate follow-up tests.\n\n"
            "• **Questions to Discuss with Your Doctor**:\n"
            "  1. How do these test parameters compare to my personal health baseline and medical history?\n"
            "  2. Are any confirmatory or expanded panels recommended?\n"
            "  3. What dietary or lifestyle habits can best support my optimal health goals?"
        )

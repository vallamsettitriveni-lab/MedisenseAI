import re

class SafetyFilter:
    PROHIBITED_TERMS = [
        r"\byou have\b",
        r"\byou are diagnosed with\b",
        r"\bconfirmed diagnosis\b",
        r"\bprescribe\b",
        r"\bdosage\b",
        r"\btake \d+ mg\b"
    ]

    @classmethod
    def sanitize_explanation(cls, raw_text: str) -> str:
        sanitized = raw_text

        # 1. Replace definitive diagnostic statements with neutral educational phrasing
        for pattern in cls.PROHIBITED_TERMS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                sanitized = re.sub(
                    pattern,
                    "results indicate possible variation to discuss with a doctor regarding",
                    sanitized,
                    flags=re.IGNORECASE
                )

        # 2. Append standard mandatory safety disclaimer
        disclaimer = (
            "\n\n---\n"
            "**Medical Safety & Educational Disclaimer**:\n"
            "This AI interpretation is provided for educational and decision-support purposes only. "
            "It does NOT constitute a clinical medical diagnosis or treatment plan. "
            "Reference ranges can vary between different laboratories. "
            "Please consult a licensed healthcare professional to evaluate your lab results together with your medical history."
        )

        if "Medical Safety & Educational Disclaimer" not in sanitized:
            sanitized += disclaimer

        return sanitized

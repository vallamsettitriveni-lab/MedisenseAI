import pytest
from app.ai.extraction.extractor import LabExtractor
from app.models.lab_result import LabStatus
from app.ai.safety.filter import SafetyFilter

def test_deterministic_lab_status_evaluation():
    extractor = LabExtractor()

    # Test LOW status
    assert extractor.evaluate_status(10.2, ref_min=13.0, ref_max=17.0) == LabStatus.LOW

    # Test HIGH status
    assert extractor.evaluate_status(110.0, ref_min=70.0, ref_max=99.0) == LabStatus.HIGH

    # Test NORMAL status
    assert extractor.evaluate_status(14.5, ref_min=13.0, ref_max=17.0) == LabStatus.NORMAL

def test_safety_filter_sanitization():
    raw_unsafe_text = "You have anemia. You are diagnosed with chronic iron deficiency. Take 50 mg iron daily."
    sanitized = SafetyFilter.sanitize_explanation(raw_unsafe_text)

    # Must remove direct diagnostic claims
    assert "You have" not in sanitized
    assert "diagnosed with" not in sanitized
    # Must append safety disclaimer
    assert "Medical Safety & Educational Disclaimer" in sanitized

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.report import ReportStatus
from app.models.lab_result import LabStatus

class LabResultSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    test_name: str
    value: float
    unit: Optional[str] = None
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    status: LabStatus

    class Config:
        from_attributes = True

class AIExplanationSchema(BaseModel):
    id: Optional[uuid.UUID] = None
    structured_summary: Optional[dict] = None
    lifestyle_suggestions: Optional[str] = None
    precautions: Optional[str] = None
    generated_at: datetime

    class Config:
        from_attributes = True

class ReportResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    file_name: str
    file_url: str
    report_date: datetime
    processing_status: ReportStatus
    uploaded_at: datetime
    lab_results: List[LabResultSchema] = []
    ai_explanation: Optional[AIExplanationSchema] = None

    class Config:
        from_attributes = True

class ReportComparisonItem(BaseModel):
    test_name: str
    unit: Optional[str] = None
    previous_value: Optional[float] = None
    current_value: float
    absolute_change: Optional[float] = None
    percentage_change: Optional[float] = None
    direction: str # "INCREASED", "DECREASED", "NO_CHANGE"
    previous_status: Optional[LabStatus] = None
    current_status: LabStatus

class ReportComparisonResponse(BaseModel):
    old_report_id: Optional[uuid.UUID] = None
    new_report_id: uuid.UUID
    comparisons: List[ReportComparisonItem]

class TrendDataPoint(BaseModel):
    date: str
    value: float
    status: LabStatus
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None

class TrendSeriesResponse(BaseModel):
    test_name: str
    unit: Optional[str] = None
    data_points: List[TrendDataPoint]

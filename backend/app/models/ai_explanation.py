import uuid
from datetime import datetime
from sqlalchemy import Column, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.session import Base

class AIExplanation(Base):
    __tablename__ = "ai_explanations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, unique=True)
    structured_summary = Column(JSON, nullable=True) # Cross-compatible JSON column
    lifestyle_suggestions = Column(Text, nullable=True)
    precautions = Column(Text, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    report = relationship("Report", back_populates="ai_explanation")

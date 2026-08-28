# AI Health Report Interpreter & Patient–Doctor Management System

A full-stack, enterprise-grade application for medical lab report analysis, longitudinal lab value comparison, AI RAG explanations, non-diagnostic safety evaluation, and complete patient-doctor appointment management.

---

## 🌟 Key Features

* **3 Role System**: Patient, Doctor, and Admin with RBAC authorization.
* **Deterministic Lab Evaluation**: `LOW`, `NORMAL`, and `HIGH` flags computed by exact mathematical range checks (`value < reference_min` or `value > reference_max`), preventing AI hallucination.
* **PDF & OCR Parsing**: Automatic text parsing (PyMuPDF) and OCR for scanned documents (PaddleOCR/Tesseract).
* **Longitudinal Comparison & Graphs**: Quantitative delta calculations (`absolute_change`, `% change`, trend direction) and interactive Recharts visualizations.
* **Local RAG & AI Explanations**: Zero-cost, privacy-first AI explanations using local Ollama (`qwen2.5:7b` / `llama3`), `sentence-transformers`, and `pgvector`.
* **Appointment Scheduling**: Doctor availability slot generation with atomic double-booking prevention.
* **Admin Governance**: Account approval workflows, audit logs, and medical knowledge base management.

---

## 🚀 Monorepo Architecture

* `frontend/`: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts.
* `backend/`: Python, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, PyMuPDF, pgvector.
* `knowledge-base/`: Reference laboratory range definitions and medical guidelines for RAG retrieval.
* `docker-compose.yml`: One-click local deployment with PostgreSQL + pgvector and Ollama.

---

## 🛠️ Quick Start (Local Development)

### 1. Database & Local Services
```bash
docker-compose up -d postgres ollama
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp ../.env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
Swagger API Docs available at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Web Dashboard available at: `http://localhost:3000`

---

## 🔒 Safety & Privacy Disclaimer
This system is an **educational and decision-support tool**. It does **not** provide clinical diagnosis or prescribe medical treatments. All medical interpretations must be performed by a qualified healthcare professional.

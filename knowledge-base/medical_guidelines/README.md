# Medical Knowledge Base Documents

This directory contains markdown and text guidelines used by the RAG (Retrieval-Augmented Generation) pipeline.

## Structure
- Place medical guideline files here (e.g. `anemia_guidelines.txt`, `diabetes_screening.txt`, `vitamin_d_deficiency.txt`).
- Admin users can upload new guideline documents via the `/admin/knowledge/upload` API endpoint or place them in this folder.
- Ingested files are automatically chunked and embedded into `knowledge_chunks` table in PostgreSQL using `sentence-transformers`.

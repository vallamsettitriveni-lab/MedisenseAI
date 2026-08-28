from typing import List
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from app.models.knowledge import KnowledgeChunk, KnowledgeDocument
from app.config import settings

class RAGPipeline:
    def __init__(self):
        try:
            self.embedder = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        except Exception as e:
            print(f"Warning loading SentenceTransformer: {e}")
            self.embedder = None

    def get_embedding(self, text: str) -> List[float]:
        if self.embedder:
            return self.embedder.encode(text).tolist()
        # Mock vector if embedder unavailable
        return [0.0] * 384

    def retrieve_context(self, query: str, db: Session, top_k: int = 3) -> str:
        if not self.embedder:
            return "General medical baseline guidelines apply."

        query_vector = self.get_embedding(query)
        try:
            chunks = db.query(KnowledgeChunk).order_by(
                KnowledgeChunk.embedding.l2_distance(query_vector)
            ).limit(top_k).all()

            if chunks:
                return "\n\n".join([chunk.content for chunk in chunks])
        except Exception as e:
            print(f"Vector search error: {e}")

        return "Consult reference ranges provided on official laboratory reports."

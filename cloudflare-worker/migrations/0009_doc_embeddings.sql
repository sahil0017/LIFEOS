CREATE TABLE IF NOT EXISTS document_embeddings (
  document_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  vector_json TEXT NOT NULL
);

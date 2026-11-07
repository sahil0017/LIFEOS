CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(title, content, content='documents', content_rowid='rowid');

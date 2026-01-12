-- Clean up: Supprimer la table de queue embedding_jobs (plus nécessaire)
-- Passage à un système lazy embeddings "à la demande"

DROP TABLE IF EXISTS embedding_jobs CASCADE;

-- Commentaire pour documentation
COMMENT ON TABLE chunks IS 'Chunks de PDF avec embeddings générés à la demande';
COMMENT ON TABLE papers IS 'Papers avec embedding_status: pending, processing, partial, complete, error';

Plan RAG-001: Système RAG Moderne pour ReviewXiv

 Objectif

 Remplacer le système actuel (envoi de TOUTES les pages au LLM) par un système RAG moderne avec embeddings, recherche hybride,
  re-ranking et MMR.

 État Actuel (Problèmes)

 - Les chunks sont créés (500 chars, 50 overlap) mais jamais utilisés
 - Le chat envoie TOUTES les pages au LLM (~32K tokens par message)
 - 2 appels LLM par message (chat + extraction citations)
 - Pas d'embeddings, pas de pgvector, pas de recherche vectorielle

 Stack Technique Choisie

 | Composant     | Choix                                  | Coût             |
 |---------------|----------------------------------------|------------------|
 | Embeddings    | qwen/qwen3-embedding-8b via OpenRouter | $0.01/1M tokens  |
 | Vector Store  | Supabase pgvector                      | Inclus           |
 | Hybrid Search | BM25 (tsvector) + Vector similarity    | Inclus           |
 | Re-ranking    | LLM-based via OpenRouter (qwen3-1.7b)  | ~$0.02/1M tokens |
 | MMR           | Fonction SQL custom                    | Inclus           |

 Architecture Cible

 User Message
     │
     ▼
 ┌─────────────────────────────────────┐
 │ 1. Embed query via OpenRouter       │
 │    (qwen3-embedding-8b)             │
 └─────────────────────────────────────┘
     │
     ▼
 ┌─────────────────────────────────────┐
 │ 2. Hybrid Search (BM25 + Vector)    │
 │    - Full-text search (tsvector)    │
 │    - Vector similarity (pgvector)   │
 │    - Combine scores (0.3/0.7)       │
 └─────────────────────────────────────┘
     │
     ▼
 ┌─────────────────────────────────────┐
 │ 3. MMR for Diversity                │
 │    - Lambda 0.7 (relevance)         │
 │    - Select diverse top-K chunks    │
 └─────────────────────────────────────┘
     │
     ▼
 ┌─────────────────────────────────────┐
 │ 4. LLM Re-ranking (optional)        │
 │    - Score top-20 → select top-8    │
 │    - Use lightweight model          │
 └─────────────────────────────────────┘
     │
     ▼
 ┌─────────────────────────────────────┐
 │ 5. Build context from chunks        │
 │    - Include chunk metadata         │
 │    - Preserve offset for citations  │
 └─────────────────────────────────────┘
     │
     ▼
 ┌─────────────────────────────────────┐
 │ 6. Call LLM with focused context    │
 │    - ~4K tokens instead of ~32K     │
 │    - Better precision               │
 └─────────────────────────────────────┘

 ---
 Phase 1: Database Setup

 1.1 Activer pgvector

 CREATE EXTENSION IF NOT EXISTS vector;

 1.2 Migration: Ajouter colonne embedding

 Fichier: Nouvelle migration Supabase

 -- Ajouter colonne embedding (4096 dims pour qwen3-embedding-8b)
 ALTER TABLE chunks
 ADD COLUMN embedding vector(4096),
 ADD COLUMN embedding_model text,
 ADD COLUMN embedded_at timestamptz;

 -- Index HNSW pour recherche vectorielle rapide
 CREATE INDEX idx_chunks_embedding_hnsw
 ON chunks USING hnsw (embedding vector_cosine_ops)
 WITH (m = 16, ef_construction = 64)
 WHERE embedding IS NOT NULL;

 -- Index pour filtrer par paper_id
 CREATE INDEX idx_chunks_paper_embedding
 ON chunks (paper_id) WHERE embedding IS NOT NULL;

 1.3 Migration: Full-text search pour BM25

 -- Colonne tsvector générée automatiquement
 ALTER TABLE chunks
 ADD COLUMN content_tsv tsvector
 GENERATED ALWAYS AS (to_tsvector('french', content)) STORED;

 -- Index GIN pour recherche full-text
 CREATE INDEX idx_chunks_content_tsv ON chunks USING gin(content_tsv);

 1.4 Migration: Status embedding sur papers

 ALTER TABLE papers
 ADD COLUMN embedding_status text DEFAULT 'pending',
 ADD COLUMN embedded_chunks int DEFAULT 0,
 ADD COLUMN total_chunks int DEFAULT 0;

 ---
 Phase 2: API Embeddings

 2.1 Nouveau fichier: src/lib/embeddings/openrouter.ts

 Client pour générer des embeddings via OpenRouter.

 // Fonctions principales:
 // - generateEmbeddings(texts: string[]): Promise<number[][]>
 // - generateQueryEmbedding(query: string): Promise<number[]>

 2.2 Nouvelle route: src/app/api/embeddings/generate/route.ts

 Génère les embeddings pour tous les chunks d'un paper.

 - POST avec { paperId: string }
 - Traitement par batch de 25 chunks
 - Mise à jour de embedding_status sur le paper
 - Retry logic pour erreurs API

 2.3 Modifier: src/app/api/papers/ingest/route.ts

 Après création des chunks (ligne ~152), trigger la génération async:

 // Trigger async embedding generation
 fetch(new URL("/api/embeddings/generate", request.url), {
   method: "POST",
   body: JSON.stringify({ paperId: paper.id }),
 }).catch(console.error);

 ---
 Phase 3: Fonctions SQL pour Retrieval

 3.1 Fonction: search_chunks_hybrid

 Combine BM25 (full-text) et vector similarity.

 CREATE FUNCTION search_chunks_hybrid(
   query_embedding vector(4096),
   query_text text,
   target_paper_id uuid,
   match_count int DEFAULT 10,
   vector_weight float DEFAULT 0.7,
   text_weight float DEFAULT 0.3
 ) RETURNS TABLE (...);

 3.2 Fonction: search_chunks_mmr

 Maximum Marginal Relevance pour diversité.

 CREATE FUNCTION search_chunks_mmr(
   query_embedding vector(4096),
   target_paper_id uuid,
   match_count int DEFAULT 10,
   lambda float DEFAULT 0.7
 ) RETURNS TABLE (...);

 ---
 Phase 4: API Search

 4.1 Nouvelle route: src/app/api/search/chunks/route.ts

 Endpoint principal de recherche sémantique.

 interface SearchRequest {
   paperId: string;
   query: string;
   options?: {
     topK?: number;           // default: 8
     useHybrid?: boolean;     // default: true
     useMmr?: boolean;        // default: true
     mmrLambda?: number;      // default: 0.7
     useReranking?: boolean;  // default: true
   };
 }

 4.2 Nouveau fichier: src/lib/reranking/llm-reranker.ts

 Re-ranking via LLM (OpenRouter).

 // Utilise un modèle léger pour scorer query-chunk pairs
 // Prompt: "Score relevance 0-10: Query: X, Passage: Y"

 ---
 Phase 5: Intégration Chat

 5.1 Modifier: src/app/api/chat/route.ts

 Remplacer buildPageContext par recherche RAG.

 Avant (lignes 34-42):
 const context = buildPageContext(body.pages, body.highlightContext);
 const truncatedContext = context.slice(0, 32000);

 Après:
 // Recherche sémantique
 const { chunks } = await searchChunks(body.paperId, body.message, {
   topK: 8,
   useHybrid: true,
   useMmr: true,
 });

 // Build context from chunks avec metadata pour citations
 const context = buildChunkContext(chunks, body.highlightContext);

 5.2 Nouveau fichier: src/lib/rag/context-builder.ts

 Construit le contexte avec metadata pour extraction de citations.

 // Format:
 // [PAGE 3]
 // [CHUNK:uuid:1250-1750]
 // Le texte du chunk...

 5.3 Modifier: src/components/chat/ChatPanel.tsx

 - Ne plus envoyer pages à chaque message
 - Afficher indicateur "RAG enabled" / embedding status

 ---
 Phase 6: Types TypeScript

 6.1 Nouveau fichier: src/types/rag.ts

 interface ChunkWithEmbedding { ... }
 interface ChunkSearchResult { ... }
 interface RetrievalOptions { ... }
 interface ContextChunk { ... }

 ---
 Fichiers à Créer/Modifier

 | Action | Fichier                                  | Description                        |
 |--------|------------------------------------------|------------------------------------|
 | CREATE | src/types/rag.ts                         | Types pour le système RAG          |
 | CREATE | src/lib/embeddings/openrouter.ts         | Client embeddings OpenRouter       |
 | CREATE | src/lib/reranking/llm-reranker.ts        | Re-ranking LLM-based               |
 | CREATE | src/lib/rag/context-builder.ts           | Construction contexte RAG          |
 | CREATE | src/app/api/embeddings/generate/route.ts | API génération embeddings          |
 | CREATE | src/app/api/embeddings/status/route.ts   | API status embeddings              |
 | CREATE | src/app/api/search/chunks/route.ts       | API recherche sémantique           |
 | MODIFY | src/app/api/papers/ingest/route.ts       | Trigger embedding async            |
 | MODIFY | src/app/api/chat/route.ts                | Utiliser RAG au lieu de full pages |
 | MODIFY | src/components/chat/ChatPanel.tsx        | UI indicateur RAG                  |
 | MODIFY | src/lib/citations/prompts.ts             | Prompts adaptés RAG                |
 | CREATE | Migrations Supabase (4 fichiers)         | Schema DB                          |

 ---
 Variables d'Environnement

 # Déjà existant
 OPENROUTER_API_KEY=xxx

 # Aucune nouvelle clé requise - tout passe par OpenRouter

 ---
 Estimation des Coûts

 | Opération                           | Volume      | Coût        |
 |-------------------------------------|-------------|-------------|
 | Embedding 100K chunks               | 50M tokens  | $0.50       |
 | Query embedding (1K queries/jour)   | 500K tokens | $0.005/jour |
 | Re-ranking (1K queries × 20 chunks) | 2M tokens   | $0.04/jour  |
 | Total mensuel                       | -           | ~$2-3       |

 vs. actuel: ~$50-100/mois (envoi full pages)

 ---
 Ordre d'Implémentation

 1. Phase 1: Database migrations (pgvector, tsvector, indexes)
 2. Phase 2: API embeddings + client OpenRouter
 3. Phase 3: Fonctions SQL (hybrid search, MMR)
 4. Phase 4: API search + re-ranking
 5. Phase 5: Intégration chat + UI
 6. Phase 6: Tests + backfill embeddings existants

 ---
 Critères de Succès

 - Embeddings générés automatiquement à l'ingestion
 - Recherche hybride fonctionnelle (BM25 + vector)
 - MMR pour diversité des résultats
 - Re-ranking optionnel via LLM
 - Chat utilise seulement top-K chunks (~8)
 - Citations préservées avec offsets corrects
 - Réduction >80% des tokens envoyés au LLM
 - UI indique status embedding du paper

 ---
 Sources

 - https://openrouter.ai/docs/api/reference/embeddings
 - https://openrouter.ai/qwen/qwen3-embedding-8b
 - https://qwenlm.github.io/blog/qwen3-embedding/
 - https://github.com/pgvector/pgvector
# Product Backlog — ReviewXiv

## 🎯 Vision & Objectives

ReviewXiv est un outil de lecture et d'annotation de documents scientifiques (PDF) avec assistant IA intégré. L'objectif est de fournir une expérience "import intelligent" avec extraction automatique des métadonnées, navigation avancée, et Q&A contextuel.

---

## 📋 Backlog Items

### 🔴 Priorité Haute

#### Epic: Consolidation du PDF Viewer

- **[TECH-001]** Garder uniquement le viewer react-pdf-highlighter
  - **Description**: Supprimer les autres implémentations de viewer PDF et ne conserver que celle basée sur react-pdf-highlighter.
  - **Fichiers concernés**: `src/components/pdf/`, `src/components/pdf-v2/`, `src/components/pdf-highlighter/`
  - **Acceptance Criteria**:
    - [ ] Un seul viewer fonctionnel basé sur react-pdf-highlighter
    - [ ] Suppression du code mort/dupliqué
    - [ ] Highlights, annotations et sélection fonctionnels
  - **Estimation**: 5 points
  - **Status**: Not Started
  - **Dependencies**: None

---

#### Epic: Recherche & Navigation Bibliothèque (F1)

- **[F1-001]** Recherche et filtres dans la bibliothèque
  - **User Story**: En tant qu'utilisateur, je veux rechercher et filtrer mes documents pour naviguer rapidement dans une grande collection.
  - **Contexte**: Le modèle `Paper` contient déjà `tags` et `reading_status` mais aucune UI/endpoint de gestion.
  - **Fichiers concernés**: `src/types/paper.ts`, `src/app/library/page.tsx`, `src/app/library/DocumentRow.tsx`
  - **Acceptance Criteria**:
    - [ ] Barre de recherche full-text (titre, auteurs, abstract)
    - [ ] Filtres par tags
    - [ ] Filtres par statut de lecture (non lu, en cours, terminé)
    - [ ] Tri par date d'ajout, titre, dernière lecture
  - **Estimation**: 8 points
  - **Status**: Not Started
  - **Dependencies**: None

---

#### Epic: RAG & Index Sémantique

- **[RAG-001]** Exploitation des chunks pour le chat IA
  - **User Story**: En tant qu'utilisateur, je veux des réponses IA plus rapides et précises basées sur les passages pertinents du document.
  - **Contexte**: Le pipeline d'ingestion crée des chunks mais ils ne sont pas exploités dans le chat. Actuellement toutes les pages sont envoyées au LLM (coûteux et lent).
  - **Fichiers concernés**: `src/app/api/papers/ingest/route.ts`, `src/app/api/chat/route.ts`, `src/components/chat/ChatPanel.tsx`, tables `chunks`
  - **Acceptance Criteria**:
    - [ ] Index sémantique des chunks (embeddings)
    - [ ] Recherche vectorielle pour récupérer les chunks pertinents
    - [ ] Limitation du contexte envoyé au LLM (top-k chunks)
    - [ ] Réduction significative des coûts API
  - **Estimation**: 13 points
  - **Status**: Not Started
  - **Dependencies**: None

---

### 🟠 Priorité Moyenne

#### Epic: Métadonnées Intelligentes (F2)

- **[F2-001]** Extraction automatique des métadonnées arXiv/DOI
  - **User Story**: En tant qu'utilisateur, je veux que le titre, abstract et auteurs soient automatiquement extraits lors de l'import d'un paper.
  - **Contexte**: `arxivUrl` est stocké à l'ingestion mais aucune extraction automatique n'est effectuée.
  - **Fichiers concernés**: `src/app/api/papers/ingest/route.ts`, `src/types/paper.ts`
  - **Acceptance Criteria**:
    - [ ] Extraction automatique depuis arXiv API si URL arXiv fournie
    - [ ] Extraction via DOI si disponible (CrossRef API)
    - [ ] Pré-remplissage des champs titre, auteurs, abstract, date de publication
    - [ ] Fallback sur OCR si métadonnées non disponibles
  - **Estimation**: 8 points
  - **Status**: Not Started
  - **Dependencies**: None

---

#### Epic: Historique Chat Multi-Conversations (F4)

- **[F4-001]** UI de navigation entre conversations
  - **User Story**: En tant que chercheur, je veux revenir à mes discussions antérieures sur un document pour retrouver mes analyses.
  - **Contexte**: Les conversations et messages sont persistés en DB, mais pas d'UI de navigation.
  - **Fichiers concernés**: `src/app/api/chat/route.ts`, `src/types/paper.ts`, `src/components/chat/ChatPanel.tsx`
  - **Acceptance Criteria**:
    - [ ] Liste des conversations passées dans le panneau chat
    - [ ] Création de nouvelle conversation
    - [ ] Chargement d'une conversation existante
    - [ ] Suppression d'une conversation
  - **Estimation**: 5 points
  - **Status**: Not Started
  - **Dependencies**: None

---

#### Epic: Export Highlights & Notes (F5)

- **[F5-001]** Export Markdown/BibTeX/Zotero
  - **User Story**: En tant que chercheur, je veux exporter mes annotations pour les intégrer dans mon workflow de recherche externe.
  - **Contexte**: Highlights et notes existent mais aucune fonctionnalité d'export.
  - **Fichiers concernés**: `src/components/highlights/HighlightsPanel.tsx`, `src/components/notes/NotesPanel.tsx`, nouvelles routes API
  - **Acceptance Criteria**:
    - [ ] Export Markdown des highlights avec citations
    - [ ] Export Markdown des notes
    - [ ] Export BibTeX des références
    - [ ] Export compatible Zotero (RDF ou JSON)
  - **Estimation**: 5 points
  - **Status**: Not Started
  - **Dependencies**: None

---

#### Epic: Collections & Tags Éditables

- **[TAG-001]** UI d'édition des tags
  - **User Story**: En tant qu'utilisateur, je veux organiser mes documents avec des tags personnalisés.
  - **Contexte**: Les tags sont affichés mais aucun flux d'édition n'est visible.
  - **Fichiers concernés**: `src/app/library/DocumentRow.tsx`, nouvelle route API tags
  - **Acceptance Criteria**:
    - [ ] Ajout de tags sur un document
    - [ ] Suppression de tags
    - [ ] Auto-complétion des tags existants
    - [ ] Création de nouveaux tags
  - **Estimation**: 5 points
  - **Status**: Not Started
  - **Dependencies**: F1-001

---

### 🟡 Priorité Basse

#### Epic: Multi-Documents QA / Library Chat (F6)

- **[F6-001]** Q&A sur plusieurs documents
  - **User Story**: En tant que chercheur, je veux poser des questions qui couvrent plusieurs papers de ma bibliothèque.
  - **Contexte**: L'app est focalisée document unique, mais la valeur croît avec des Q/A multi-papers (RAG multi-doc).
  - **Fichiers concernés**: `src/app/api/chat/route.ts`, `src/components/chat/ChatPanel.tsx`, `src/app/library`
  - **Acceptance Criteria**:
    - [ ] Sélection de plusieurs documents pour un chat
    - [ ] Contexte agrégé des documents sélectionnés
    - [ ] Citations avec référence au document source
    - [ ] Mode "Library Chat" depuis la bibliothèque
  - **Estimation**: 13 points
  - **Status**: Not Started
  - **Dependencies**: RAG-001

---

#### Epic: Personnalisation Highlights (I4)

- **[I4-001]** Couleurs et légendes configurables
  - **User Story**: En tant qu'utilisateur, je veux personnaliser les couleurs de mes highlights pour mieux organiser visuellement mes annotations.
  - **Contexte**: Les couleurs sont fixes dans HighlightsPanel.
  - **Fichiers concernés**: `src/components/highlights/HighlightsPanel.tsx`, `src/app/paper/[id]/PaperReader.tsx`
  - **Acceptance Criteria**:
    - [ ] Palette de couleurs sélectionnable
    - [ ] Légendes personnalisables (ex: "Important", "À revoir", "Citation")
    - [ ] Persistance des préférences utilisateur
  - **Estimation**: 3 points
  - **Status**: Not Started
  - **Dependencies**: None

---

## 🐛 Bugs & Technical Debt

### Critique

- **[BUG-001]** Suppression de paper laisse des orphelins en DB
  - **Severity**: Critical
  - **Description**: La suppression supprime le fichier et la ligne `papers` mais pas explicitement `paper_pages`, `chunks`, `highlights`, `notes`. Si la DB n'a pas de cascade, on laisse des orphelins.
  - **Fichier**: `src/app/library/actions.ts`
  - **Status**: Open

---

### Haute

- **[BUG-002]** Erreurs d'accès aux données invisibles côté UI
  - **Severity**: High
  - **Description**: Sur la bibliothèque, une erreur Supabase est loggée mais pas remontée à l'utilisateur (UX silencieuse).
  - **Fichier**: `src/app/library/page.tsx`
  - **Status**: Open

- **[BUG-003]** Validation arXiv URL insuffisante
  - **Severity**: High
  - **Description**: Pas de validation URL côté frontend, messages d'erreur peu explicites.
  - **Fichier**: `src/components/upload/PaperUploader.tsx`
  - **Status**: Open

---

### Moyenne

- **[BUG-004]** Gestion d'erreurs silencieuse (console.error uniquement)
  - **Severity**: Medium
  - **Description**: Plusieurs erreurs sont seulement `console.error` sans feedback utilisateur.
  - **Fichiers**: `src/components/notes/NotesPanel.tsx`, `src/components/highlights/HighlightsPanel.tsx`, `src/app/library/page.tsx`
  - **Status**: Open

---

## 🔧 Améliorations Techniques / UX

### Performance

- **[I2-001]** Pagination + lazy-loading bibliothèque
  - **Constat**: La bibliothèque charge tout en une requête.
  - **Fichier**: `src/app/library/page.tsx`
  - **Valeur**: Performance et scalabilité.
  - **Estimation**: 3 points
  - **Status**: Not Started

- **[PERF-001]** Limiter la taille du contexte chat envoyé au LLM
  - **Constat**: Chaque message envoie toutes les pages → très coûteux et lent pour gros PDF.
  - **Fichiers**: `src/components/chat/ChatPanel.tsx`, `src/app/api/chat/route.ts`
  - **Valeur**: Réduction coûts API, temps de réponse amélioré.
  - **Estimation**: 5 points (inclus dans RAG-001)
  - **Status**: Not Started

---

### UX

- **[UX-001]** Statut d'ingestion en temps réel
  - **Constat**: L'upload affiche "Processing…" mais pas d'étapes d'évolution live (OCR, indexing).
  - **Fichiers**: `src/components/upload/PaperUploader.tsx`, `src/app/api/papers/ingest/route.ts`
  - **Solution**: Progression côté UI + polling ou websocket.
  - **Estimation**: 5 points
  - **Status**: Not Started

- **[I5-001]** Gestion d'erreurs user-friendly
  - **Constat**: Erreurs remontées uniquement en console, pas à l'utilisateur.
  - **Fichiers**: `src/components/notes/NotesPanel.tsx`, `src/components/highlights/HighlightsPanel.tsx`, `src/app/library/page.tsx`
  - **Valeur**: UX plus robuste et claire.
  - **Estimation**: 3 points
  - **Status**: Not Started

---

## 📊 Roadmap Suggérée

### Sprint 1 — Fondations
1. TECH-001: Consolidation viewer react-pdf-highlighter
2. BUG-001: Correction cascade suppression
3. BUG-002 + I5-001: Gestion d'erreurs user-friendly

### Sprint 2 — Recherche & Performance
1. F1-001: Recherche et filtres bibliothèque
2. I2-001: Pagination lazy-loading
3. TAG-001: Tags éditables

### Sprint 3 — RAG & Chat Intelligent
1. RAG-001: Index sémantique et limitation contexte
2. F4-001: Historique multi-conversations

### Sprint 4 — Import Intelligent
1. F2-001: Extraction métadonnées arXiv/DOI
2. UX-001: Statut d'ingestion temps réel
3. BUG-003: Validation arXiv URL

### Sprint 5 — Export & Personnalisation
1. F5-001: Export Markdown/BibTeX/Zotero
2. I4-001: Couleurs highlights configurables

### Sprint 6 — Multi-Documents
1. F6-001: Library Chat multi-documents

---

## 📝 Notes & Décisions Techniques

### 2026-01-01 — Choix du viewer PDF
Décision de ne conserver que le viewer basé sur react-pdf-highlighter pour simplifier la maintenance et garantir une expérience cohérente d'annotation.

### Architecture RAG
L'index sémantique utilisera les embeddings des chunks existants. Prévoir une migration pour ajouter une colonne `embedding` dans la table `chunks` et un index HNSW pour la recherche vectorielle (pgvector).

---

*Last updated: 2026-01-01*
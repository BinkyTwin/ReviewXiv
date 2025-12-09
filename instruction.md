Tu es un **expert en génie logiciel, en products design et en rédaction de cahier des charges (cdc)** pour des applications web utilisant des LLM (Large Language Models).
Ta mission : **rédiger un cahier des charges fonctionnel et technique extrêmement complet et structuré** pour le projet décrit ci-dessous.

---

### 🎯 Contexte utilisateur

Le projet est destiné à un **étudiant de master** qui prépare son **mémoire**.
Contraintes importantes :

* Il doit faire une **revue de littérature scientifique** à partir d’articles de recherche majoritairement en **anglais**.
* Il **n’est pas bilingue**, lit l’anglais mais avec difficulté : compréhension lente, fatigue mentale, difficultés sur le vocabulaire scientifique.
* Il souhaite un outil qui l’aide à **comprendre les articles**, pas un truc qui écrit le mémoire à sa place.
* Il tient à **respecter les sources** : les articles d’origine restent les documents de référence, l’outil n’est qu’une aide à la compréhension.

---

### 🧠 Idée générale du projet

Créer un **outil web** (ou applicatif) qui permet de :

1. **Importer un article scientifique en PDF** (revue, conférence, etc.).
2. **Analyser automatiquement le PDF** pour :

   * détecter la **structure logique** de l’article :

     * titre
     * auteurs
     * affiliation (si possible)
     * résumé / abstract
     * mots-clés
     * sections (Introduction, Literature Review, Methodology, Results, Discussion, Conclusion, References…)
   * extraire le **texte par sections** ;
   * détecter les **figures**, **tableaux**, et leur **légende** ;
   * éventuellement extraire les images (PNG/JPEG) contenues dans le PDF.
3. **Envoyer ces éléments à un LLM** (via API, par exemple OpenAI ou autre) pour obtenir :

   * soit une **traduction fidèle en français**,
   * soit une **explication/paraphrase en français simple**,
   * soit les deux (par ex. : “Texte traduit” + “Texte expliqué”).
4. **Reconstruire l’article** dans un format exploitable, tout en :

   * **conservant la structure logique** (titres, sous-titres, numérotation, Figure X, Table Y, etc.) ;
   * affichant clairement pour l’utilisateur ce qui vient :

     * du **texte original**,
     * de la **traduction**,
     * de l’**explication en français**.
5. Permettre à l’utilisateur :

   * de **naviguer section par section** ;
   * de voir éventuellement **texte original en anglais** à gauche et **version aidée en français** à droite ;
   * de **prendre des notes personnelles** par article et par section pour sa revue de littérature ;
   * d’exporter une **fiches de lecture structurée** (par ex. DOCX, Markdown ou PDF) contenant :

     * référence bibliographique,
     * synthèse de l’article,
     * points clés,
     * méthodologie,
     * résultats principaux,
     * limites, etc.

Cet outil doit servir à **comprendre** et **analyser**, pas à générer automatiquement le mémoire.

---

### ⚠️ Points de vigilance / contraintes intellectuelles

* Le LLM **ne doit pas inventer de résultats** : aucune hallucination de chiffres, d’auteurs ou de conclusions.
* L’outil doit rappeler que **seul l’article original fait foi** pour la rédaction et les citations.
* On peut admettre que le LLM :

  * reformule,
  * simplifie,
  * explicite des notions implicites,
  * mais **sans altérer les faits**.
* Les **formules mathématiques** et notations peuvent être :

  * soit laissées telles quelles,
  * soit expliquées autour en français,
  * mais pas modifiées au fond.

---

### 🏗️ Fonctionnalités principales à intégrer dans le cahier des charges

Tu dois décrire **en détail** dans le cdc au moins les aspects suivants :

1. **Gestion des utilisateurs** (même simple au début)

   * Compte local ou authentification minimale (ou mode solo/local pour un POC).
   * Gestion d’une bibliothèque d’articles importés (liste, recherche, tags, etc.).

2. **Import de PDF**

   * Upload d’un ou plusieurs PDF.
   * Gestion d’erreurs : PDF scanné, protégé, illisible, trop lourd, etc.
   * Limites éventuelles (taille max, nombre de pages, etc.).

3. **Analyse / parsing de PDF**

   * Distinction texte vs PDF scanné (OCR éventuel).
   * Extraction :

     * titre, auteurs, abstract, keywords (si repérables),
     * sections et sous-sections (structure hiérarchique),
     * figures et légendes,
     * tableaux (au minimum légende + tentative d’extraction structurée).
   * Proposer les options technologiques possibles (pymupdf, pdfplumber, pdfminer.six, GROBID, etc. – sans coder mais en expliquant).

4. **Interaction avec le LLM**

   * Description du **prompting** et de la logique :

     * prompts différents pour traduction fidèle,
     * prompts différents pour explication en français clair,
     * stratégie pour découper un long article en blocs (sections, paragraphes) sans perdre le contexte.
   * Gestion du coût et du temps (batching par section, etc.).
   * Mécanisme pour afficher clairement les **limites du LLM** (pas une source académique).

5. **Reconstruction du document**

   * Format interne de représentation (par exemple une structure JSON : article → sections → paragraphes → figures, etc.).
   * Génération :

     * d’un affichage web structuré,
     * et/ou d’un export dans un ou plusieurs formats (Markdown, DOCX, LaTeX, PDF…).
   * Conservation de la structure logique :

     * numéros de section,
     * titres,
     * références aux figures / tableaux (même si les images sont à part).

6. **Interface utilisateur**

   * Vue globale : liste d’articles importés.
   * Vue article :

     * navigation par sections (menu latéral ou onglets),
     * affichage possible en **bilingue** (anglais / français),
     * affichage clair du texte original vs texte généré (couleurs, blocs séparés, etc.).
   * Espace “**notes personnelles**” par article et par section.
   * Option pour générer une **fiche de lecture** semi-automatique.

7. **Exigences non fonctionnelles**

   * Performance (temps de traitement acceptable pour un PDF standard).
   * Sécurité / confidentialité :

     * Ne pas stocker les PDF sur des serveurs non maîtrisés, ou définir des règles claires.
     * Gestion de données potentiellement sous droit d’auteur.
   * Conformité RGPD de base (si des comptes utilisateurs existent).
   * UX simple, pensée pour un étudiant non-tech.

8. **Gestion des risques**

   * Hallucinations du modèle (décrire comment les mitiger côté interface / messages).
   * Mauvaise reconnaissance de structure pour certains PDF.
   * Cas des PDF scannés (nécessité éventuelle d’OCR).
   * Limites de taille (troncature de texte pour le LLM, segmentation en chunks, etc.).

9. **Roadmap / versions**

   * **MVP** (version minimale fonctionnelle) :

     * upload PDF,
     * extraction texte simple par sections,
     * explication/traduction via LLM,
     * affichage web structuré.
   * **V2 / V3** :

     * extraction fine de figures / tableaux,
     * export DOCX / LaTeX,
     * fiches de lecture générées automatiquement,
     * recherche plein texte dans la bibliothèque,
     * tagging, classement par thématiques, etc.

---

### 📑 Structure attendue du cahier des charges

Tu dois produire un **document structuré**, clair et actionnable, avec au minimum les sections suivantes :

1. **Résumé exécutif du projet**
2. **Contexte et enjeux**
3. **Objectifs du projet**
4. **Périmètre fonctionnel** (ce que fait le système)
5. **Périmètre hors-champ** (ce que le système ne fera pas)
6. **Profils utilisateurs et cas d’usage principaux** (user stories)
7. **Exigences fonctionnelles détaillées** (par module)
8. **Exigences non fonctionnelles**
9. **Contraintes techniques et technologiques** (sans imposer une stack fixe, mais avec des propositions réalistes)
10. **Architecture logique proposée** (modules, flux de données, interactions avec le LLM, etc.)
11. **Risques & limites du système**
12. **Critères de succès / indicateurs de qualité**
13. **Roadmap / priorisation (MVP vs évolutions)**

---

### 🔍 Gestion des zones d’incertitude

Si certaines informations manquent (par exemple choix précis de stack, budget, type d’hébergement, modèle de LLM exact, etc.) :

* **Formule des hypothèses explicites** (par exemple : “Hypothèse : usage d’un LLM accessible via API type OpenAI”).
* Continue quand même le cahier des charges en te basant sur ces hypothèses.
* Le cdc doit être suffisamment clair pour que :

  * un développeur
  * ou une petite équipe technique
    puisse démarrer un POC à partir de ce document.

---

### ❌ Ce que tu NE DOIS PAS faire

* Ne pas écrire de code.
* Ne pas faire de maquette HTML/CSS.
* Ne pas rédiger le mémoire de l’étudiant.
* Ne pas simplifier excessivement : le cdc doit rester **professionnel, complet et précis**.

---

**Maintenant, rédige le cahier des charges complet en suivant toutes ces consignes.**

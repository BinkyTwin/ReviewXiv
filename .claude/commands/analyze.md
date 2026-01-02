Analyse un PDF pour le projet reviewxiv.

## Fichier a analyser : $ARGUMENTS

## Instructions

1. **Verifie que le fichier existe**
   ```bash
   ls -la $ARGUMENTS
   ```

2. **Extrais les informations de base**
   - Nombre de pages
   - Taille du fichier
   - Presence de texte extractible

3. **Teste l'extraction de texte**
   - Utilise PyMuPDF pour extraire le texte
   - Verifie la qualite de l'extraction
   - Identifie les pages problematiques

4. **Rapport**
   Resume les resultats :
   - Pages avec texte : X
   - Pages sans texte (scans) : Y
   - Qualite globale de l'extraction
   - Recommandations (OCR necessaire ?)

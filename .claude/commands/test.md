Lance les tests pour reviewxiv.

## Cible : $ARGUMENTS

## Instructions

1. **Si $ARGUMENTS est vide** :
   - Lance les tests backend :
     ```bash
     cd reviewxiv-api && pytest -v
     ```
   - Lance les tests frontend :
     ```bash
     cd reviewxiv-app && npm test
     ```

2. **Si $ARGUMENTS specifie un module** :
   - Backend : `cd reviewxiv-api && pytest -v $ARGUMENTS`
   - Frontend : `cd reviewxiv-app && npm test -- $ARGUMENTS`

3. **Analyse les resultats** :
   - Si tests passent : resume brievement
   - Si tests echouent :
     a. Identifie les erreurs
     b. Propose des corrections
     c. Demande si tu dois les appliquer

4. **Apres correction** :
   - Relance les tests pour verifier
   - Continue jusqu'a ce que tout passe

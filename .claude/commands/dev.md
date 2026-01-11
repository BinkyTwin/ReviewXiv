Demarre l'environnement de developpement reviewxiv.

## Instructions

1. **Verifie les dependances**
   ```bash
   # Backend
   cd reviewxiv-api && pip install -r requirements.txt 2>/dev/null || echo "requirements.txt manquant"

   # Frontend
   cd reviewxiv-app && npm install 2>/dev/null || echo "package.json manquant"
   ```

2. **Demarre les serveurs**
   - Backend (port 8000) :
     ```bash
     cd reviewxiv-api && uvicorn main:app --reload &
     ```
   - Frontend (port 5173) :
     ```bash
     cd reviewxiv-app && npm run dev &
     ```

3. **Verifie que tout fonctionne**
   - Backend : `curl http://localhost:8000/health` ou `/docs`
   - Frontend : Ouvrir http://localhost:5173

4. **Affiche les URLs**
   - API : http://localhost:8000
   - API Docs : http://localhost:8000/docs
   - Frontend : http://localhost:5173

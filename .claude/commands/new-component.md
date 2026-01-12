Cree un nouveau composant React pour reviewxiv.

## Composant a creer : $ARGUMENTS

## Instructions

1. **Verifie que le composant n'existe pas deja**
   - Cherche dans `reviewxiv-app/src/components/` un fichier similaire

2. **Cree le fichier** dans le bon dossier :
   - `components/pdf/` pour tout ce qui touche au viewer PDF
   - `components/chat/` pour l'interface de chat
   - `components/ui/` pour les composants generiques
   - `components/` pour les composants principaux

3. **Structure obligatoire** :
```jsx
/**
 * $ARGUMENTS Component
 * Description courte du composant
 */

export function $ARGUMENTS({ prop1, prop2, onAction }) {
  // State
  // Callbacks
  // Effects

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Contenu */}
    </div>
  );
}
```

4. **Style** :
   - Utilise UNIQUEMENT les tokens CSS (bg-background, etc.)
   - Pas de couleurs arbitraires
   - Dark mode par defaut

5. **Apres creation** :
   - Ajoute un export si pertinent
   - Teste le composant

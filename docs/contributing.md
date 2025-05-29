# Guide de contribution à P.R.I.S.M.

Ce guide vous aidera à contribuer au projet P.R.I.S.M. de manière efficace.

## Avant de commencer

### Prérequis

- Connaissance de JavaScript (ES6+)
- Compréhension des concepts de base de Three.js
- Familiarité avec Git
- Compréhension des principes de développement web

### Environnement de développement

1. **Configuration de l'environnement**
   ```bash
   # Cloner le repository
   git clone [URL_DU_REPO]
   cd PRISM

   # Installer les dépendances
   npm install

   # Démarrer le serveur de développement
   npm run dev
   ```

2. **Outils recommandés**
   - VS Code avec extensions :
     - ESLint
     - Prettier
     - GitLens
     - JavaScript (ES6) code snippets
   - Chrome DevTools
   - Git

## Processus de contribution

### 1. Création d'une branche

```bash
# Créer une nouvelle branche
git checkout -b feature/nom-de-la-fonctionnalite

# Ou pour une correction de bug
git checkout -b fix/nom-du-bug
```

### 2. Développement

#### Standards de code

- Suivez le style de code existant
- Utilisez ESLint et Prettier
- Écrivez des tests unitaires
- Documentez votre code
- Utilisez des commits atomiques

#### Structure des commits

```
type(scope): description

[body]

[footer]
```

Types de commits :
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage
- `refactor` : Refactoring
- `test` : Tests
- `chore` : Maintenance

### 3. Tests

#### Tests unitaires

```bash
# Exécuter les tests
npm test

# Exécuter les tests avec couverture
npm run test:coverage
```

#### Tests manuels

1. Vérifiez la compatibilité cross-browser
2. Testez sur différents appareils
3. Vérifiez les performances
4. Testez l'accessibilité

### 4. Documentation

#### Mise à jour de la documentation

- Mettez à jour le README si nécessaire
- Documentez les nouvelles fonctionnalités
- Ajoutez des commentaires au code
- Mettez à jour les guides d'utilisation

#### Format de documentation

```markdown
# Titre

## Description
Description détaillée de la fonctionnalité.

## Utilisation
Exemples d'utilisation.

## API
Description de l'API si applicable.

## Notes
Informations supplémentaires.
```

### 5. Pull Request

#### Préparation

1. Mettez à jour votre branche
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. Résolvez les conflits si nécessaire

3. Vérifiez les tests
   ```bash
   npm test
   ```

#### Soumission

1. Créez une Pull Request sur GitHub
2. Remplissez le template de PR
3. Attendez la revue de code
4. Répondez aux commentaires
5. Effectuez les modifications demandées

## Bonnes pratiques

### Code

- Écrivez du code propre et maintenable
- Utilisez des noms explicites
- Évitez la duplication de code
- Suivez le principe DRY
- Utilisez des commentaires pertinents

### Performance

- Optimisez les performances
- Minimisez les dépendances
- Utilisez le lazy loading
- Optimisez les assets
- Surveillez la taille du bundle

### Sécurité

- Validez les entrées
- Évitez les injections
- Utilisez HTTPS
- Protégez les données sensibles
- Suivez les bonnes pratiques OWASP

### Accessibilité

- Suivez les WCAG 2.1
- Utilisez des attributs ARIA
- Assurez la navigation au clavier
- Fournissez des alternatives textuelles
- Testez avec des lecteurs d'écran

## Ressources

### Documentation

- [Documentation Three.js](https://threejs.org/docs/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)

### Outils

- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [VS Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/)
- [GitHub](https://github.com/)

### Communauté

- [Stack Overflow](https://stackoverflow.com/)
- [GitHub Discussions](https://github.com/features/discussions)
- [Discord](https://discord.gg/)

## Support

Si vous avez des questions :
1. Consultez la documentation
2. Vérifiez les issues existantes
3. Posez une question dans les discussions
4. Contactez l'équipe de maintenance 
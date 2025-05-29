# Guide d'installation de P.R.I.S.M.

Ce guide vous aidera à installer et configurer P.R.I.S.M. sur votre système.

## Prérequis

- Un navigateur web moderne (Chrome, Firefox, Safari, Edge)
- JavaScript activé
- Accès au microphone
- Connexion Internet pour les dépendances externes

## Installation

### 1. Cloner le repository

```bash
git clone [URL_DU_REPO]
cd PRISM
```

### 2. Configuration de l'environnement

#### Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
PRISM_ENV=development
PRISM_DEBUG=true
PRISM_API_KEY=votre_clé_api
```

#### Configuration du serveur

Si vous souhaitez exécuter P.R.I.S.M. sur un serveur local :

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm run dev
```

### 3. Configuration du navigateur

#### Permissions

Assurez-vous que votre navigateur autorise :
- L'accès au microphone
- Le stockage local
- L'exécution de JavaScript

#### Extensions recommandées

Pour une meilleure expérience de développement :
- React Developer Tools
- Redux DevTools
- WebGL Inspector

## Vérification de l'installation

1. Ouvrez `index.html` dans votre navigateur
2. Vérifiez que la console ne montre pas d'erreurs
3. Testez l'accès au microphone
4. Vérifiez que la visualisation 3D fonctionne

## Dépannage

### Problèmes courants

1. **Erreur d'accès au microphone**
   - Vérifiez les permissions du navigateur
   - Assurez-vous qu'aucune autre application n'utilise le microphone

2. **Problèmes de performance**
   - Vérifiez les paramètres de votre carte graphique
   - Désactivez les extensions de navigateur non essentielles

3. **Erreurs de chargement**
   - Vérifiez votre connexion Internet
   - Videz le cache du navigateur

### Support

Si vous rencontrez des problèmes :
1. Consultez la documentation
2. Vérifiez les issues existantes
3. Créez une nouvelle issue si nécessaire

## Mise à jour

Pour mettre à jour P.R.I.S.M. :

```bash
git pull origin main
npm install
```

## Sécurité

- Ne partagez jamais votre clé API
- Gardez vos dépendances à jour
- Utilisez HTTPS en production
- Activez la protection contre les attaques XSS

## Production

Pour déployer en production :

1. Construisez l'application :
```bash
npm run build
```

2. Testez la version de production :
```bash
npm run test:prod
```

3. Déployez les fichiers générés dans le dossier `dist/` 
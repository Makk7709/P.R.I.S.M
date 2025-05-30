# 🎤 Guide de Démarrage PRISM Voice Chat V2

## 🚀 Démarrage Rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
Copiez le fichier d'exemple et configurez vos clés API :
```bash
cp env.example .env
```

Éditez le fichier `.env` avec vos vraies clés API :
```env
# Configuration PRISM
PRISM_MODE=TEST
PRISM_TURBO_MODE=true
PRISM_SKIP_CONTEXT=true

# Configuration des APIs IA (optionnel pour les tests)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Configuration ElevenLabs pour synthèse vocale premium
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Configuration serveur
PORT=3000
NODE_ENV=development
```

### 3. Démarrer le serveur
```bash
npm start
```

### 4. Accéder à l'interface
Ouvrez votre navigateur et allez sur :
```
http://localhost:3000
```

## 🎯 Fonctionnalités

### ✅ **Mode Test (sans clés API)**
- Interface vocale complète
- Réponses simulées intelligentes
- TTS du navigateur pour la synthèse vocale
- Reconnaissance vocale fonctionnelle

### 🎤 **Mode Premium (avec ElevenLabs)**
- Synthèse vocale haute qualité avec ElevenLabs
- Voix adaptatives selon le contexte
- Expressivité émotionnelle
- Paramètres vocaux optimisés

### 🧠 **Mode Complet (avec toutes les APIs)**
- Orchestration IA multi-modèles
- Réponses contextuelles avancées
- Amélioration vocale intelligente
- Performance optimisée

## 🔧 Configuration ElevenLabs

### Obtenir une clé API ElevenLabs
1. Créez un compte sur [ElevenLabs](https://elevenlabs.io)
2. Allez dans votre profil → API Keys
3. Créez une nouvelle clé API
4. Copiez la clé dans votre fichier `.env`

### Voix disponibles
PRISM utilise 4 voix différentes selon le contexte :
- **Rachel** : Voix amicale pour les conversations générales
- **Adam** : Voix professionnelle pour les analyses
- **Antoni** : Voix énergique pour les urgences
- **Bella** : Voix confiante pour les présentations

## 🎮 Utilisation

### Interface Vocale
1. **Cliquez sur "🔊 Test Audio"** pour activer la synthèse vocale
2. **Tapez votre message** ou utilisez le bouton 🎤 pour la reconnaissance vocale
3. **Sélectionnez le type de tâche** pour optimiser la réponse
4. **Écoutez la réponse** avec la voix adaptée au contexte

### Types de tâches disponibles
- **🤖 Auto-détection** : PRISM détecte automatiquement le type
- **💬 Général** : Conversation normale
- **🎯 Stratégie** : Analyses stratégiques
- **📈 Marketing** : Campagnes et stratégies marketing
- **💰 Finance** : Analyses financières
- **📧 Email** : Rédaction d'emails
- **⚖️ Éthique** : Réflexions éthiques
- **🔍 Recherche** : Recherche d'informations

## 🛠️ Dépannage

### Problème : Pas de synthèse vocale
**Solution** : Cliquez sur "🔊 Test Audio" pour activer la synthèse vocale

### Problème : Voix robotique
**Solutions** :
1. Vérifiez que `ELEVENLABS_API_KEY` est configurée dans `.env`
2. Redémarrez le serveur après avoir ajouté la clé
3. Vérifiez les logs du serveur pour les erreurs ElevenLabs

### Problème : Erreur API
**Solutions** :
1. Vérifiez vos clés API dans le fichier `.env`
2. En mode test, les réponses sont simulées (normal)
3. Consultez les logs du serveur pour plus de détails

### Problème : Reconnaissance vocale ne fonctionne pas
**Solutions** :
1. Autorisez l'accès au microphone dans votre navigateur
2. Utilisez Chrome ou Firefox (recommandé)
3. Vérifiez que votre microphone fonctionne

## 📊 Métriques et Monitoring

L'interface affiche en temps réel :
- **Temps de réponse** en millisecondes
- **Nombre d'appels API** effectués
- **État du système** (actif/erreur)
- **Taux de succès** des requêtes

## 🎯 Tests

### Test de la configuration ElevenLabs
```bash
npm run voice-test
```

### Test de l'API vocale
Allez sur : `http://localhost:3000/api/test-voice`

## 🔄 Modes de Fonctionnement

### Mode TEST (par défaut)
- Réponses simulées rapides
- Pas d'appels API externes coûteux
- Idéal pour les démonstrations

### Mode PROD
```env
PRISM_MODE=PROD
PRISM_TURBO_MODE=false
```
- Appels API réels
- Contexte complet
- Performance optimisée

## 💡 Conseils d'Utilisation

1. **Première utilisation** : Commencez par "Bonjour" pour tester
2. **Synthèse vocale** : Activez-la dès le début pour une meilleure expérience
3. **Types de tâches** : Utilisez l'auto-détection ou sélectionnez manuellement
4. **Reconnaissance vocale** : Parlez clairement et attendez la fin de l'enregistrement
5. **ElevenLabs** : La première génération peut prendre quelques secondes

## 🎉 Profitez de PRISM !

Votre assistant IA vocal est maintenant prêt. Explorez les différentes fonctionnalités et découvrez la puissance de la synthèse vocale expressive !

---

**Support** : Consultez les logs du serveur pour le débogage
**Version** : PRISM Voice Chat V2
**Dernière mise à jour** : Décembre 2024 
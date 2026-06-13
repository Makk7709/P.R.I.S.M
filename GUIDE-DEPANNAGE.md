# 🔧 Guide de Dépannage PRISM - Tests Vocaux

## 🚨 Problème : Les tests ne se lancent pas et la page est figée

### Solutions Rapides

#### 1. **Utiliser l'Interface Corrigée**

- Accédez à : `http://localhost:3001`
- Cliquez sur **"Tests Vocaux Corrigés"** au lieu de l'interface simple
- Cette version gère mieux les erreurs d'initialisation

#### 2. **Diagnostic Système**

- Accédez à : `http://localhost:3001/diagnostic-tests.html`
- Lancez le **"Diagnostic Complet"** pour identifier les problèmes
- Vérifiez l'état des composants critiques

#### 3. **Vider le Cache du Navigateur**

```bash
# Sur Mac : Cmd + Shift + R
# Sur PC : Ctrl + Shift + R
```

#### 4. **Redémarrer le Serveur**

```bash
# Arrêter le serveur
pkill -f "node simple-server.js"

# Redémarrer
node simple-server.js
```

### 🔍 Causes Communes

#### **Audio Context Suspendu**

- **Symptôme** : Page figée lors de l'initialisation audio
- **Solution** : L'interface corrigée gère automatiquement la reprise du contexte audio

#### **Permissions Microphone**

- **Symptôme** : Tests audio échouent
- **Solution** : Autoriser l'accès au microphone dans les paramètres du navigateur

#### **Web Audio API Non Supporté**

- **Symptôme** : Erreurs d'initialisation
- **Solution** : Utiliser un navigateur moderne (Chrome, Firefox, Safari récents)

#### **Cache Corrompu**

- **Symptôme** : Comportement incohérent
- **Solution** : Vider le cache et recharger

### 📊 Interfaces Disponibles

| Interface          | URL                                         | Description                              | Statut        |
| ------------------ | ------------------------------------------- | ---------------------------------------- | ------------- |
| **Principale**     | `http://localhost:3001`                     | Dashboard principal                      | ✅ Stable     |
| **Tests Corrigés** | `/tests/manual/prismVoiceTests-fixed.html`  | Interface robuste avec gestion d'erreurs | ✅ Recommandé |
| **Tests Simples**  | `/tests/manual/prismVoiceTests-simple.html` | Interface basique                        | ⚠️ Peut figer |
| **Diagnostic**     | `/diagnostic-tests.html`                    | Outils de diagnostic                     | ✅ Utile      |

### 🛠️ Fonctionnalités de l'Interface Corrigée

#### **Initialisation Progressive**

- Barre de progression visible
- Vérification étape par étape
- Gestion des timeouts

#### **Gestion d'Erreurs Robuste**

- Tests continuent même si certains composants échouent
- Messages d'erreur détaillés
- Fallback vers tests basiques

#### **Tests Disponibles**

1. **AdaptiveCycler Audio** - Test des fonctionnalités audio adaptatives
2. **InsightCenter Audio** - Test du centre d'analyse audio
3. **Keyboard Navigation** - Test de navigation clavier
4. **API Fallback** - Test des mécanismes de secours
5. **Error Handling** - Test de gestion d'erreurs

### 🔧 Commandes de Dépannage

#### **Vérifier l'État du Serveur**

```bash
ps aux | grep node
curl -I http://localhost:3001
```

#### **Redémarrage Complet**

```bash
# Arrêter tous les processus Node
pkill -f node

# Redémarrer le serveur
cd /Users/aminemohamed/Desktop/PRISM
node simple-server.js
```

#### **Test de Connectivité**

```bash
# Test de base
curl http://localhost:3001

# Test des fichiers de test
curl -I http://localhost:3001/tests/manual/prismVoiceTests-fixed.html
```

### 📱 Compatibilité Navigateur

| Navigateur  | Version Min | Statut       | Notes      |
| ----------- | ----------- | ------------ | ---------- |
| **Chrome**  | 66+         | ✅ Excellent | Recommandé |
| **Firefox** | 60+         | ✅ Bon       | Supporté   |
| **Safari**  | 11.1+       | ✅ Bon       | Supporté   |
| **Edge**    | 79+         | ✅ Bon       | Supporté   |

### 🚀 Optimisations

#### **Pour de Meilleures Performances**

1. Fermer les autres onglets
2. Désactiver les extensions non nécessaires
3. Utiliser le mode navigation privée
4. Vérifier la mémoire disponible

#### **Pour le Développement**

1. Ouvrir les DevTools (F12)
2. Surveiller la console pour les erreurs
3. Utiliser l'onglet Network pour les requêtes
4. Vérifier l'onglet Application pour le stockage

### 📞 Support

Si les problèmes persistent :

1. **Vérifiez les logs** dans la console du navigateur
2. **Utilisez l'outil de diagnostic** intégré
3. **Testez avec un autre navigateur**
4. **Redémarrez complètement** le système si nécessaire

### 🎯 Checklist de Dépannage

- [ ] Serveur en cours d'exécution sur le port 3001
- [ ] Navigateur moderne et à jour
- [ ] Cache navigateur vidé
- [ ] Permissions microphone accordées
- [ ] Aucune extension bloquante active
- [ ] Interface corrigée utilisée
- [ ] Diagnostic système exécuté

---

**Version** : PRISM v2.1  
**Date de création** : 10 février 2024  
**Dernière révision** : juin 2026  
**Interface recommandée** : Tests Vocaux Corrigés

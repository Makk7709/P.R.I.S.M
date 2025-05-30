# 🔍 AUDIT PRISM VOICE CHAT V2 - Guide de Diagnostic

## 🎯 OBJECTIF
Vérifier et valider le bon fonctionnement de PRISM Voice Chat V2 avec l'intégration ElevenLabs.

---

## ⚡ ÉTAPE 1: DIAGNOSTIC INITIAL

### 1.1 Vérifier les processus en cours
```bash
# Identifier tous les processus Node.js actifs
ps aux | grep node
lsof -i :3000  # Vérifier qui utilise le port 3000
lsof -i :3001  # Vérifier qui utilise le port 3001
```

### 1.2 Arrêter tous les processus Node.js
```bash
# Méthode 1: Arrêt propre
pkill -f node

# Méthode 2: Force (si nécessaire)
sudo killall node

# Méthode 3: Par port spécifique
lsof -ti:3000 | xargs kill -9
```

---

## 📁 ÉTAPE 2: AUDIT DES FICHIERS CRITIQUES

### 2.1 Vérifier la structure des fichiers
```bash
# Vérifier l'existence des fichiers essentiels
ls -la server.js
ls -la package.json
ls -la ui/prismVoiceChatV2.html
ls -la index.html
ls -la .env || echo "Fichier .env manquant"
```

### 2.2 Vérifier package.json
```bash
# Afficher la configuration de démarrage
cat package.json | grep -A 5 -B 5 "scripts"
cat package.json | grep "main"
```

### 2.3 Vérifier les variables d'environnement
```bash
# Créer le fichier .env si nécessaire
if [ ! -f .env ]; then
    echo "Création du fichier .env..."
    cp env.example .env 2>/dev/null || echo "ELEVENLABS_API_KEY=your_api_key_here" > .env
fi

# Vérifier le contenu
cat .env
```

---

## 🔧 ÉTAPE 3: TESTS DE CONFIGURATION

### 3.1 Test de syntaxe server.js
```bash
# Vérifier la syntaxe du serveur
node --check server.js
echo "✅ Syntaxe server.js: OK" || echo "❌ ERREUR syntaxe server.js"
```

### 3.2 Test des dépendances
```bash
# Vérifier les modules Node.js
npm list express 2>/dev/null || echo "❌ Express manquant"
npm list axios 2>/dev/null || echo "❌ Axios manquant"
npm list cors 2>/dev/null || echo "❌ CORS manquant"
npm list dotenv 2>/dev/null || echo "❌ Dotenv manquant"

# Installer les dépendances manquantes si nécessaire
npm install
```

---

## 🚀 ÉTAPE 4: DÉMARRAGE CONTRÔLÉ

### 4.1 Démarrage du serveur principal
```bash
# Démarrage en mode debug
echo "🚀 Démarrage du serveur PRISM..."
NODE_ENV=development node server.js &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Attendre 3 secondes
sleep 3

# Vérifier que le serveur tourne
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Serveur démarré avec succès (PID: $SERVER_PID)"
else
    echo "❌ ÉCHEC démarrage serveur"
    exit 1
fi
```

### 4.2 Test de connectivité
```bash
# Test de l'endpoint principal
curl -s http://localhost:3000/ | head -20 || echo "❌ Erreur connexion port 3000"

# Test de l'API chat
curl -s -X POST http://localhost:3000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}' | head -10 || echo "❌ API Chat non accessible"

# Test de l'interface vocale
curl -s http://localhost:3000/ui/prismVoiceChatV2.html | head -20 || echo "❌ Interface vocale non accessible"
```

---

## 🎤 ÉTAPE 5: AUDIT ELEVENLABS

### 5.1 Vérifier la configuration ElevenLabs
```bash
# Test de l'endpoint de test vocal
echo "🔊 Test de l'endpoint vocal..."
curl -s http://localhost:3000/api/test-voice || echo "❌ Endpoint test-voice non accessible"
```

### 5.2 Test avec clé API (si configurée)
```bash
# Vérifier si la clé API ElevenLabs est configurée
if grep -q "ELEVENLABS_API_KEY=sk-" .env 2>/dev/null; then
    echo "✅ Clé API ElevenLabs configurée"
    
    # Test complet de génération audio
    curl -s -X POST http://localhost:3000/api/chat \
        -H "Content-Type: application/json" \
        -d '{"message":"Test audio ElevenLabs"}' \
        | grep -o '"audioUrl":"[^"]*"' || echo "⚠️  Pas d'URL audio dans la réponse"
else
    echo "⚠️  Clé API ElevenLabs non configurée (mode fallback TTS browser)"
fi
```

---

## 🌐 ÉTAPE 6: AUDIT INTERFACE WEB

### 6.1 Test de l'interface principale
```bash
# Ouvrir automatiquement dans le navigateur
if command -v open >/dev/null 2>&1; then
    echo "🌐 Ouverture dans le navigateur..."
    open http://localhost:3000
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000
else
    echo "🌐 Ouvrez manuellement: http://localhost:3000"
fi
```

### 6.2 Vérification des logs temps réel
```bash
# Suivre les logs du serveur
echo "📊 Logs du serveur (Ctrl+C pour arrêter):"
tail -f /dev/null &  # Placeholder car les logs sont en console
```

---

## ✅ ÉTAPE 7: CHECKLIST DE VALIDATION

### Tests à effectuer manuellement:

#### 7.1 Interface Web ✓/❌
- [ ] Page d'accueil s'affiche correctement sur http://localhost:3000
- [ ] Redirection automatique vers /ui/prismVoiceChatV2.html fonctionne
- [ ] Interface Voice Chat V2 se charge sans erreur
- [ ] Bouton microphone présent et cliquable

#### 7.2 Fonctionnalités Vocales ✓/❌
- [ ] Reconnaissance vocale (microphone) fonctionne
- [ ] Messages s'affichent dans le chat
- [ ] Réponses PRISM sont générées
- [ ] Audio est lu (TTS browser ou ElevenLabs)
- [ ] Qualité audio acceptable (non robotique si ElevenLabs configuré)

#### 7.3 API Backend ✓/❌
- [ ] Endpoint /api/chat répond en POST
- [ ] Endpoint /api/test-voice accessible
- [ ] Logs montrent l'activité PRISM
- [ ] Pas d'erreurs critiques dans la console

#### 7.4 ElevenLabs (si configuré) ✓/❌
- [ ] Clé API valide dans .env
- [ ] Génération d'URLs audio dans les réponses
- [ ] Voix distinctes selon le contexte
- [ ] Audio de qualité premium

---

## 🚨 RÉSOLUTION DES PROBLÈMES COURANTS

### Problème 1: Port 3000 déjà utilisé
```bash
# Solution A: Changer de port
PORT=3001 node server.js

# Solution B: Libérer le port
lsof -ti:3000 | xargs kill -9
```

### Problème 2: Modules manquants
```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Problème 3: ElevenLabs ne fonctionne pas
```bash
# Vérifier la clé API
echo "Votre clé ElevenLabs:"
grep ELEVENLABS_API_KEY .env

# Test direct de l'API ElevenLabs
curl -X GET "https://api.elevenlabs.io/v1/voices" \
     -H "xi-api-key: $(grep ELEVENLABS_API_KEY .env | cut -d'=' -f2)"
```

### Problème 4: Interface ne se charge pas
```bash
# Vérifier les fichiers statiques
ls -la ui/
ls -la index.html

# Redémarrer le serveur
pkill -f "node server.js"
node server.js
```

---

## 📋 RAPPORT D'AUDIT FINAL

### Créer un résumé de l'audit:
```bash
echo "=== RAPPORT AUDIT PRISM VOICE V2 ===" > audit_report.txt
echo "Date: $(date)" >> audit_report.txt
echo "Serveur: $(ps aux | grep 'node server.js' | grep -v grep || echo 'Non démarré')" >> audit_report.txt
echo "Port 3000: $(lsof -i :3000 | grep LISTEN || echo 'Libre')" >> audit_report.txt
echo "ElevenLabs: $(grep ELEVENLABS_API_KEY .env 2>/dev/null | cut -c1-30 || echo 'Non configuré')..." >> audit_report.txt
echo "Interface Web: http://localhost:3000" >> audit_report.txt
echo "==================================" >> audit_report.txt

cat audit_report.txt
```

---

## 🎯 COMMANDES DE DÉMARRAGE RECOMMANDÉES

```bash
# Séquence complète de démarrage propre
echo "🔄 Nettoyage et redémarrage PRISM Voice V2..."

# 1. Arrêt propre
pkill -f node

# 2. Attendre 2 secondes
sleep 2

# 3. Démarrage serveur principal
echo "🚀 Démarrage serveur PRISM..."
node server.js

# L'interface sera accessible sur:
# 🌐 http://localhost:3000 (page d'accueil)
# 🎤 http://localhost:3000/ui/prismVoiceChatV2.html (chat vocal direct)
```

---

## ⚡ DIAGNOSTIC RAPIDE (1 minute)

```bash
# Test express complet
echo "🚀 DIAGNOSTIC EXPRESS PRISM VOICE V2"
echo "======================================"

# Arrêt processus existants
pkill -f node && sleep 1

# Test démarrage
timeout 10s node server.js &
sleep 3

# Tests de base
echo "🌐 Test page d'accueil:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "ECHEC"

echo "🎤 Test interface vocale:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ui/prismVoiceChatV2.html || echo "ECHEC"

echo "💬 Test API chat:"
curl -s -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"test"}' -o /dev/null -w "%{http_code}" || echo "ECHEC"

echo "======================================"
echo "✅ Diagnostic terminé - Vérifiez les codes de réponse (200 = OK)"
``` 
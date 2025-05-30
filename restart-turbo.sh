#!/bin/bash

echo "🚀 Redémarrage PRISM en mode TURBO"

# Arrêter le serveur existant
pkill -f "node simple-dashboard.js" 2>/dev/null || true

echo "⚡ Mode TURBO activé:"
echo "  - Cache LRU activé"
echo "  - Skip contexte pour vitesse"
echo "  - Modèles rapides"
echo "  - Réponses <50ms visées"

# Attendre un peu pour la libération du port
sleep 2

echo "🎯 Lancement serveur optimisé..."

# Lancer avec les optimisations
PRISM_TURBO_MODE=true \
PRISM_SKIP_CONTEXT=true \
OPENAI_MODEL=gpt-3.5-turbo \
ANTHROPIC_MODEL=claude-3-haiku-20240307 \
node simple-dashboard.js

echo "🔥 PRISM TURBO MODE lancé sur http://localhost:3000" 
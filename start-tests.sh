#!/bin/bash

# 🎯 PRISM Tests - Script de Lancement Rapide
# Version: 2.1
# Date: 29 Mai 2025

echo "🎯 PRISM Voice Tests - Lancement Rapide"
echo "======================================"

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "simple-server.js" ]; then
    echo "❌ Fichier simple-server.js non trouvé. Assurez-vous d'être dans le répertoire PRISM."
    exit 1
fi

# Arrêter les serveurs existants
echo "🔄 Arrêt des serveurs existants..."
pkill -f "node simple-server.js" 2>/dev/null || true
sleep 2

# Démarrer le serveur
echo "🚀 Démarrage du serveur PRISM..."
node simple-server.js &
SERVER_PID=$!

# Attendre que le serveur démarre
echo "⏳ Attente du démarrage du serveur..."
sleep 3

# Vérifier si le serveur fonctionne
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ Serveur démarré avec succès sur http://localhost:3001"
    echo ""
    echo "📋 Interfaces disponibles :"
    echo "   🏠 Dashboard principal     : http://localhost:3001"
    echo "   🔧 Tests corrigés         : http://localhost:3001/tests/manual/prismVoiceTests-fixed.html"
    echo "   🔍 Diagnostic système     : http://localhost:3001/diagnostic-tests.html"
    echo "   📊 Tests simples          : http://localhost:3001/tests/manual/prismVoiceTests-simple.html"
    echo ""
    echo "💡 Recommandation : Utilisez l'interface 'Tests corrigés' pour éviter les blocages"
    echo ""
    echo "🛑 Pour arrêter le serveur : Ctrl+C ou pkill -f 'node simple-server.js'"
    
    # Optionnel : ouvrir automatiquement le navigateur
    if command -v open &> /dev/null; then
        echo ""
        read -p "🌐 Ouvrir automatiquement le navigateur ? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open http://localhost:3001
        fi
    fi
    
    # Garder le script en vie
    echo ""
    echo "📡 Serveur en cours d'exécution (PID: $SERVER_PID)"
    echo "   Appuyez sur Ctrl+C pour arrêter"
    
    # Attendre que l'utilisateur arrête le serveur
    trap "echo ''; echo '🛑 Arrêt du serveur...'; kill $SERVER_PID 2>/dev/null; exit 0" INT
    wait $SERVER_PID
    
else
    echo "❌ Échec du démarrage du serveur"
    echo "🔍 Vérifications suggérées :"
    echo "   - Port 3001 disponible"
    echo "   - Permissions d'exécution"
    echo "   - Dépendances installées"
    exit 1
fi 
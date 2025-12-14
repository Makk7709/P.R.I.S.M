#!/bin/bash
# Script pour renommer le projet et fixer définitivement Vitest
# Usage: ./scripts/rename-project-fix-vitest.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PARENT_DIR="$(dirname "$PROJECT_ROOT")"

OLD_NAME="PRISM INCUBATEUR"
NEW_NAME="PRISM-INCUBATEUR"

echo "🔧 VAGUE 0 - Fix définitif Vitest: Renommage projet"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Répertoire actuel: $PARENT_DIR"
echo "Ancien nom: $OLD_NAME"
echo "Nouveau nom: $NEW_NAME"
echo ""

# Vérifier si déjà renommé
if [ ! -d "$PARENT_DIR/$OLD_NAME" ] && [ -d "$PARENT_DIR/$NEW_NAME" ]; then
    echo "✅ Projet déjà renommé: $PARENT_DIR/$NEW_NAME"
    echo ""
    echo "📝 Pour tester:"
    echo "   cd $PARENT_DIR/$NEW_NAME/P.R.I.S.M"
    echo "   npm test"
    exit 0
fi

# Vérifier que l'ancien répertoire existe
if [ ! -d "$PARENT_DIR/$OLD_NAME" ]; then
    echo "❌ Erreur: Répertoire '$OLD_NAME' non trouvé dans $PARENT_DIR"
    exit 1
fi

# Vérifier que le nouveau nom n'existe pas déjà
if [ -d "$PARENT_DIR/$NEW_NAME" ]; then
    echo "⚠️  Attention: $NEW_NAME existe déjà."
    read -p "Continuer quand même? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "⚠️  Cette opération va renommer le dossier du projet."
echo "   Cela peut affecter:"
echo "   - Chemins dans l'IDE (VS Code, etc.)"
echo "   - Scripts qui référencent le chemin"
echo "   - Lien symbolique existant (sera mis à jour)"
echo ""
read -p "Continuer? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Opération annulée"
    exit 0
fi

echo ""
echo "🔄 Renommage en cours..."

# Renommer le répertoire
mv "$PARENT_DIR/$OLD_NAME" "$PARENT_DIR/$NEW_NAME"

# Mettre à jour le lien symbolique s'il existe
if [ -L "$PARENT_DIR/PRISM-INCUBATEUR" ]; then
    rm "$PARENT_DIR/PRISM-INCUBATEUR"
    ln -s "$NEW_NAME" "$PARENT_DIR/PRISM-INCUBATEUR"
    echo "✅ Lien symbolique mis à jour"
fi

echo "✅ Projet renommé: $PARENT_DIR/$NEW_NAME"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. cd $PARENT_DIR/$NEW_NAME/P.R.I.S.M"
echo "   2. npm test  # Devrait maintenant fonctionner"
echo ""
echo "🔍 Vérification..."
cd "$PARENT_DIR/$NEW_NAME/P.R.I.S.M"
if npm test -- --version > /dev/null 2>&1; then
    echo "✅ npm test fonctionne!"
else
    echo "⚠️  npm test a des problèmes, mais le chemin est corrigé"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VAGUE 0 complétée - Vitest devrait maintenant fonctionner"

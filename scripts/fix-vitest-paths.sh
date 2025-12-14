#!/bin/bash
# Script pour résoudre le problème Vitest avec les espaces dans le chemin
# Crée un lien symbolique sans espaces pour permettre à Vitest de fonctionner

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PARENT_DIR="$(dirname "$PROJECT_ROOT")"
SYMLINK_NAME="PRISM-INCUBATEUR"

cd "$PARENT_DIR"

# Vérifier si le lien existe déjà
if [ -L "$SYMLINK_NAME" ]; then
    echo "✅ Lien symbolique existe déjà: $PARENT_DIR/$SYMLINK_NAME"
    echo "   → $(readlink "$SYMLINK_NAME")"
    exit 0
fi

# Créer le lien symbolique
ORIGINAL_DIR="PRISM INCUBATEUR"
if [ -d "$ORIGINAL_DIR" ]; then
    echo "🔗 Création du lien symbolique sans espaces..."
    ln -s "$ORIGINAL_DIR" "$SYMLINK_NAME"
    echo "✅ Lien créé: $PARENT_DIR/$SYMLINK_NAME → $ORIGINAL_DIR"
    echo ""
    echo "📝 Pour utiliser le projet sans espaces:"
    echo "   cd $PARENT_DIR/$SYMLINK_NAME/P.R.I.S.M"
    echo "   npm test"
else
    echo "❌ Erreur: Répertoire '$ORIGINAL_DIR' non trouvé dans $PARENT_DIR"
    exit 1
fi

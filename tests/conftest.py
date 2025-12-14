"""Configuration pytest globale."""
import sys
from pathlib import Path

# Ajouter src au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

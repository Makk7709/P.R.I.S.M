"""
CLI pour PRISM SalesOps Autopilot.
Usage: python -m prism_salesops <fichier_excel>
"""

import sys
import argparse
from pathlib import Path
from datetime import date

from .config import SalesOpsConfig
from .io import read_excel_robust
from .facts import build_facts_table
from .cadence import compute_cadence_metrics
from .outputs import build_detail, build_top10, build_resume_rep
from .controls import military_controls_report
from .export_xlsx import write_workbook


def main():
    parser = argparse.ArgumentParser(
        description="PRISM SalesOps Autopilot - Analyse d'exports commerciaux"
    )
    parser.add_argument(
        "input_file",
        type=str,
        help="Fichier Excel d'export commercial (.xlsx)"
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        default=None,
        help="Fichier de sortie (défaut: <input>_analyse.xlsx)"
    )
    parser.add_argument(
        "--min-events",
        type=int,
        default=5,
        help="Nombre minimum d'événements pour inclure un client (défaut: 5)"
    )
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Date de référence au format YYYY-MM-DD (défaut: aujourd'hui)"
    )
    
    args = parser.parse_args()
    
    # Configuration
    config = SalesOpsConfig(
        min_events=args.min_events,
        date_du_jour=date.fromisoformat(args.date) if args.date else date.today()
    )
    
    # Chemins
    input_path = Path(args.input_file)
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.parent / f"{input_path.stem}_analyse.xlsx"
    
    print(f"📂 Lecture de {input_path}...")
    
    try:
        # 1. Lecture
        df = read_excel_robust(input_path)
        print(f"   ✓ {len(df)} lignes chargées")
        
        # 2. Construction facts
        print("🔧 Construction de la table des faits...")
        facts = build_facts_table(df, config)
        print(f"   ✓ {len(facts)} lignes traitées")
        
        # 3. Calcul cadence
        print("📊 Calcul des métriques de cadence...")
        cadence = compute_cadence_metrics(facts, config)
        print(f"   ✓ {len(cadence)} clients analysés")
        
        # 4. Contrôles
        print("🔍 Contrôles militaires...")
        controls = military_controls_report(facts, config)
        for warning in controls["warnings"]:
            print(f"   {warning}")
        
        # 5. Génération des sorties
        print("📝 Génération des sorties...")
        detail = build_detail(cadence, config)
        top10 = build_top10(cadence, config)
        resume = build_resume_rep(cadence, config)
        
        # 6. Export
        print(f"💾 Export vers {output_path}...")
        sheets = {
            "Données enrichies": facts,
            "Détail": detail,
            "Top10": top10,
            "Résumé rep": resume,
            "Contrôles": controls["dataframe"],
        }
        write_workbook(output_path, sheets)
        
        print(f"\n✅ Analyse terminée !")
        print(f"   • {len(detail)} clients dans le détail")
        print(f"   • {len(top10)} clients dans le top 10 retards")
        print(f"   • Fichier: {output_path}")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

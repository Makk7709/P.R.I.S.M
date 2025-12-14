"""
Dashboard Streamlit pour PRISM SalesOps Autopilot.

Usage: streamlit run src/prism_salesops/dashboard/app.py
"""

import streamlit as st
import pandas as pd
from datetime import date, datetime
from io import BytesIO
import sys
from pathlib import Path

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from prism_salesops.config import SalesOpsConfig
from prism_salesops.io import read_excel_robust, HeaderNotFoundError
from prism_salesops.headers import detect_columns, ColumnDetectionError, get_diagnostic
from prism_salesops.facts import build_facts_table
from prism_salesops.cadence import compute_cadence_metrics
from prism_salesops.outputs import build_detail, build_top10, build_resume_rep
from prism_salesops.controls import military_controls_report
from prism_salesops.export_xlsx import write_workbook


# === Configuration page ===
st.set_page_config(
    page_title="PRISM SalesOps Autopilot",
    page_icon="🎯",
    layout="wide"
)


def main():
    st.title("🎯 PRISM SalesOps Autopilot")
    st.markdown("*Analyse automatisée des exports commerciaux*")
    
    # === Sidebar: Configuration ===
    with st.sidebar:
        st.header("⚙️ Configuration")
        
        date_ref = st.date_input(
            "Date de référence",
            value=date.today(),
            help="Date pour le calcul des retards"
        )
        
        min_events = st.number_input(
            "Minimum d'événements",
            min_value=1,
            max_value=20,
            value=5,
            help="Nombre minimum de commandes pour inclure un client"
        )
        
        exclude_reps = st.text_input(
            "Reps à exclure (séparés par virgule)",
            value="ZZ",
            help="Codes commerciaux à exclure de l'analyse"
        )
        
        st.divider()
        st.markdown("### 📋 Légende")
        st.markdown("""
        - **Cadence**: Intervalle médian entre commandes (mois)
        - **Mois depuis**: Temps écoulé depuis dernière commande
        - **Écart**: Retard par rapport à la cadence habituelle
        """)
    
    # === Main: Upload ===
    uploaded_file = st.file_uploader(
        "📂 Déposez votre fichier Excel ici",
        type=["xlsx", "xls"],
        help="Export commercial au format Excel"
    )
    
    if uploaded_file is not None:
        # Configuration
        config = SalesOpsConfig(
            date_du_jour=date_ref,
            min_events=min_events,
            exclude_reps=[r.strip() for r in exclude_reps.split(",") if r.strip()]
        )
        
        try:
            # === ÉTAPE 1: Lecture ===
            with st.spinner("📖 Lecture du fichier..."):
                # Sauvegarder temporairement
                bytes_data = uploaded_file.getvalue()
                
                # Contourner le bug openpyxl avec biltinId
                try:
                    df = pd.read_excel(BytesIO(bytes_data))
                except TypeError as e:
                    if "biltinId" in str(e) or "builtinId" in str(e):
                        # Bug connu - essayer avec engine xlrd ou en CSV
                        import warnings
                        warnings.filterwarnings('ignore')
                        
                        # Patch openpyxl pour ignorer l'attribut inconnu
                        import openpyxl
                        from openpyxl.styles.cell_style import CellStyle
                        original_init = CellStyle.__init__
                        def patched_init(self, *args, **kwargs):
                            kwargs.pop('biltinId', None)
                            kwargs.pop('builtinId', None)
                            return original_init(self, *args, **kwargs)
                        CellStyle.__init__ = patched_init
                        
                        df = pd.read_excel(BytesIO(bytes_data))
                    else:
                        raise
            
            st.success(f"✅ {len(df)} lignes chargées")
            
            # === ÉTAPE 2: Diagnostic colonnes ===
            with st.expander("🔍 Diagnostic des colonnes", expanded=False):
                diagnostic = get_diagnostic(list(df.columns), config)
                
                if diagnostic["success"]:
                    st.success("Toutes les colonnes essentielles détectées")
                    col1, col2 = st.columns(2)
                    with col1:
                        st.markdown("**Colonnes mappées:**")
                        for canon, original in diagnostic["mapping"].items():
                            st.markdown(f"- {canon} → `{original}`")
                    with col2:
                        if diagnostic["unrecognized"]:
                            st.markdown("**Colonnes non utilisées:**")
                            for col in diagnostic["unrecognized"][:10]:
                                st.markdown(f"- `{col}`")
                else:
                    st.error("❌ Colonnes manquantes")
                    for missing in diagnostic["missing"]:
                        st.markdown(f"- **{missing}** : {diagnostic['suggestions'].get(missing, [])[:3]}")
                    st.stop()
            
            # === ÉTAPE 3: Construction Facts ===
            with st.spinner("🔧 Traitement des données..."):
                facts = build_facts_table(df, config)
            
            # === ÉTAPE 4: Contrôles ===
            controls = military_controls_report(facts, config)
            
            with st.expander("🎖️ Contrôles militaires", expanded=True):
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Lignes", controls["counts"]["total_rows"])
                with col2:
                    st.metric("Clients", controls["counts"]["unique_customers"])
                with col3:
                    st.metric("Retours", controls["counts"]["returns"])
                with col4:
                    st.metric("Logistique", controls["counts"]["logistics"])
                
                if controls["warnings"]:
                    for warning in controls["warnings"]:
                        st.warning(warning)
            
            # === ÉTAPE 5: Calcul cadence ===
            with st.spinner("📊 Calcul des métriques..."):
                cadence = compute_cadence_metrics(facts, config)
            
            if cadence.empty:
                st.error("❌ Aucune donnée exploitable après exclusions (logistique/retours). Vérifier la source.")
                st.stop()
            
            # === ÉTAPE 6: Sorties ===
            detail = build_detail(cadence, config)
            top10 = build_top10(cadence, config)
            resume = build_resume_rep(cadence, config)
            
            # === Initialiser le moteur Q&A ===
            from prism_salesops.qa.engine import AskPrismEngine
            
            if "qa_engine" not in st.session_state:
                st.session_state.qa_engine = AskPrismEngine()
            
            # Charger les données dans le moteur Q&A
            st.session_state.qa_engine.load_data(facts, filename=uploaded_file.name)
            
            # === AFFICHAGE: Tabs ===
            tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
                "🤖 Ask PRISM", "📋 Détail", "🔝 Top 10 Retards", "👥 Résumé Rep", "📊 Données", "🔍 Audit Trail"
            ])
            
            with tab1:
                st.markdown("### 🤖 Ask PRISM - Posez votre question")
                st.markdown("*Posez des questions en langage naturel sur vos données*")
                
                # Input question
                question = st.text_input(
                    "Votre question",
                    placeholder="Ex: Quel est le CA par département ? Top 10 clients ?",
                    key="qa_question"
                )
                
                col_ask, col_clear = st.columns([1, 4])
                with col_ask:
                    ask_button = st.button("🔍 Demander", type="primary")
                with col_clear:
                    if st.button("🗑️ Effacer l'historique"):
                        st.session_state.qa_engine.clear_state()
                        st.success("Historique effacé")
                
                if ask_button and question:
                    with st.spinner("🤔 Analyse en cours..."):
                        answer = st.session_state.qa_engine.ask(question)
                    
                    # Afficher la réponse
                    st.markdown("---")
                    st.markdown(answer.answer_md)
                    
                    # Afficher les tables si présentes
                    if answer.tables:
                        for name, df_result in answer.tables.items():
                            st.markdown(f"#### 📊 {name}")
                            st.dataframe(df_result, use_container_width=True)
                    
                    # Afficher les citations si présentes
                    if answer.citations:
                        st.markdown("#### 📝 Sources (CR)")
                        for cit in answer.citations[:5]:
                            st.markdown(cit.to_markdown())
                    
                    # Mode Explain (dépliable)
                    with st.expander("🔍 Mode Explain (SQL & Contrôles)", expanded=False):
                        if answer.explain and answer.explain.sql:
                            st.code(answer.explain.sql, language="sql")
                            if answer.explain.sample_sizes:
                                st.json(answer.explain.sample_sizes)
                        else:
                            st.info("Pas de SQL exécuté pour cette question")
                
                # Historique de conversation
                if st.session_state.qa_engine.state.history:
                    with st.expander("📜 Historique", expanded=False):
                        for turn in st.session_state.qa_engine.state.history[-5:]:
                            st.markdown(f"**Q:** {turn['question']}")
                            st.markdown(f"**R:** {turn['answer'][:200]}...")
                            st.markdown("---")
            
            with tab2:
                st.markdown(f"### Détail ({len(detail)} clients)")
                st.dataframe(detail, use_container_width=True, height=400)
            
            with tab3:
                st.markdown("### Top 10 des plus gros retards")
                if not top10.empty:
                    st.dataframe(top10, use_container_width=True)
                else:
                    st.info("Aucun retard détecté")
            
            with tab4:
                st.markdown("### Résumé par commercial")
                if not resume.empty:
                    st.dataframe(resume, use_container_width=True)
                else:
                    st.info("Aucun écart positif")
            
            with tab5:
                st.markdown("### Données enrichies (facts)")
                st.dataframe(facts.head(100), use_container_width=True, height=400)
                st.caption(f"Affichage limité à 100 lignes sur {len(facts)}")
            
            with tab6:
                st.markdown("### 🔍 Audit Trail - Traçabilité des questions")
                st.markdown("*Consultez l'historique complet de toutes les questions posées à PRISM*")
                
                # Filtres
                col1, col2, col3 = st.columns(3)
                with col1:
                    filter_intent = st.selectbox(
                        "Filtrer par type",
                        ["Tous", "STRUCTURED", "QUALITATIVE", "HYBRID", "NEED_CLARIFICATION"],
                        key="audit_filter_intent"
                    )
                
                with col2:
                    filter_dataset = st.selectbox(
                        "Filtrer par dataset",
                        ["Tous"] + list(st.session_state.qa_engine.datasets.keys()),
                        key="audit_filter_dataset"
                    )
                
                with col3:
                    limit = st.number_input("Nombre max de résultats", min_value=10, max_value=500, value=100, step=10)
                
                # Récupérer l'audit trail
                try:
                    from prism_salesops.qa.schema import QuestionIntent
                    
                    intent_filter = None
                    if filter_intent != "Tous":
                        intent_filter = QuestionIntent[filter_intent]
                    
                    dataset_filter = None if filter_dataset == "Tous" else filter_dataset
                    
                    audit_df = st.session_state.qa_engine.audit_logger.get_audit_trail(
                        dataset_id=dataset_filter,
                        intent=intent_filter,
                        limit=limit
                    )
                    
                    if not audit_df.empty:
                        st.markdown(f"**{len(audit_df)} interactions trouvées**")
                        
                        # Afficher le tableau
                        display_cols = ["timestamp", "question", "intent", "execution_time_ms", "row_count", "citations_count"]
                        available_cols = [c for c in display_cols if c in audit_df.columns]
                        
                        st.dataframe(
                            audit_df[available_cols],
                            use_container_width=True,
                            height=400
                        )
                        
                        # Détails d'une entrée sélectionnée
                        if len(audit_df) > 0:
                            selected_idx = st.selectbox(
                                "Voir les détails d'une interaction",
                                range(len(audit_df)),
                                format_func=lambda i: f"{audit_df.iloc[i]['timestamp']} - {audit_df.iloc[i]['question'][:50]}...",
                                key="audit_selected"
                            )
                            
                            if selected_idx is not None:
                                audit_id = audit_df.iloc[selected_idx]["audit_id"]
                                entry = st.session_state.qa_engine.audit_logger.get_audit_entry(audit_id)
                                
                                if entry:
                                    with st.expander("📋 Détails complets", expanded=True):
                                        st.markdown(f"**Question:** {entry['question']}")
                                        st.markdown(f"**Intent:** {entry['intent']}")
                                        st.markdown(f"**Timestamp:** {entry['timestamp']}")
                                        
                                        if entry['sql_query']:
                                            st.markdown("**SQL exécuté:**")
                                            st.code(entry['sql_query'], language="sql")
                                        
                                        if entry['period']['start']:
                                            st.markdown(f"**Période:** {entry['period']['start']} → {entry['period']['end']}")
                                        
                                        if entry['exclusions']:
                                            st.markdown(f"**Exclusions:** {entry['exclusions']}")
                                        
                                        if entry['sample_sizes']:
                                            st.markdown(f"**Échantillons:** {entry['sample_sizes']}")
                                        
                                        if entry['citations_count'] > 0:
                                            st.markdown(f"**Citations CR:** {entry['citations_count']}")
                                        
                                        st.markdown("**Réponse:**")
                                        st.markdown(entry['answer_md'][:1000])
                        
                        # Export
                        st.divider()
                        st.markdown("### 📥 Export Audit Trail")
                        
                        col_export1, col_export2 = st.columns(2)
                        with col_export1:
                            if st.button("📊 Exporter en Excel"):
                                import tempfile
                                with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
                                    export_path = Path(tmp.name)
                                
                                st.session_state.qa_engine.audit_logger.export_audit_trail(
                                    export_path,
                                    format="xlsx",
                                    dataset_id=dataset_filter,
                                    intent=intent_filter,
                                    limit=limit
                                )
                                
                                with open(export_path, "rb") as f:
                                    st.download_button(
                                        "⬇️ Télécharger",
                                        f.read(),
                                        file_name=f"audit_trail_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    )
                        
                        with col_export2:
                            if st.button("📄 Exporter en CSV"):
                                import tempfile
                                with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
                                    export_path = Path(tmp.name)
                                
                                st.session_state.qa_engine.audit_logger.export_audit_trail(
                                    export_path,
                                    format="csv",
                                    dataset_id=dataset_filter,
                                    intent=intent_filter,
                                    limit=limit
                                )
                                
                                with open(export_path, "rb") as f:
                                    st.download_button(
                                        "⬇️ Télécharger",
                                        f.read(),
                                        file_name=f"audit_trail_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                                        mime="text/csv"
                                    )
                    else:
                        st.info("Aucune interaction trouvée dans l'audit trail.")
                        
                except Exception as e:
                    st.error(f"Erreur lors de la récupération de l'audit trail: {e}")
                    st.exception(e)
            
            # === EXPORT ===
            st.divider()
            st.markdown("### 💾 Export")
            
            # Préparer le fichier Excel en mémoire
            output = BytesIO()
            sheets = {
                "Données enrichies": facts,
                "Détail": detail,
                "Top10": top10,
                "Résumé rep": resume,
                "Contrôles": controls["dataframe"],
            }
            
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                for name, df_sheet in sheets.items():
                    df_sheet.to_excel(writer, sheet_name=name[:31], index=False)
            
            output.seek(0)
            
            st.download_button(
                label="📥 Télécharger l'analyse complète (Excel)",
                data=output,
                file_name=f"{uploaded_file.name.rsplit('.', 1)[0]}_analyse.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            
        except ColumnDetectionError as e:
            st.error(f"❌ {e.message}")
            st.markdown("**Colonnes non reconnues:**")
            for col in e.unrecognized_headers[:10]:
                st.markdown(f"- `{col}`")
            st.markdown("**Suggestions:**")
            for canon, aliases in e.suggested_aliases.items():
                st.markdown(f"- {canon}: {aliases[:3]}")
        
        except HeaderNotFoundError as e:
            st.error(f"❌ {e.message}")
        
        except Exception as e:
            st.error(f"❌ Erreur inattendue: {e}")
            st.exception(e)
    
    else:
        # Instructions
        st.info("""
        👋 **Bienvenue dans PRISM SalesOps Autopilot !**
        
        1. Déposez votre fichier Excel d'export commercial
        2. Vérifiez le diagnostic des colonnes
        3. Consultez les analyses (Détail, Top 10, Résumé)
        4. Téléchargez le rapport complet
        
        **Colonnes attendues:** Code client, Date livraison, Code article, Quantité, Montant, CP, Rep
        """)


if __name__ == "__main__":
    main()

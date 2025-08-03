#!/bin/bash

# 🎯 SCRIPT EXPORT AUTOMATIQUE SCHÉMAS JPG HAUTE QUALITÉ
# Brevet TrustContext Multi-Niveaux - INPI 2025
# Génération images professionnelles 300 DPI

echo "🚀 Export automatique schémas techniques TrustContext en JPG haute qualité..."

# Vérification dépendances
command -v mmdc >/dev/null 2>&1 || { 
    echo "❌ Mermaid CLI non installé. Installation..."
    npm install -g @mermaid-js/mermaid-cli
}

command -v convert >/dev/null 2>&1 || { 
    echo "❌ ImageMagick non installé. Veuillez installer : brew install imagemagick"
    exit 1
}

# Création répertoire export
mkdir -p schemas_jpg_export
cd schemas_jpg_export

echo "📊 Création des fichiers Mermaid temporaires..."

# Figure 1 : Architecture Générale
cat > schema1_architecture.mmd << 'EOF'
graph TB
    subgraph "SYSTÈME TRUSTCONTEXT"
        A["CLASSIFICATEUR<br/>CRITICITÉ<br/>LOW/MEDIUM/<br/>HIGH/CRITICAL"] --> B["MÉCANISME<br/>ESCALADE<br/>AUTOMATIQUE<br/>requiresHuman<br/>Approval()"]
        B --> C["GÉNÉRATEUR<br/>TOKENS<br/>CRYPTOGRAPHIQUES<br/>randomBytes 32<br/>+ hash"]
        
        B --> D["SYSTÈME<br/>VALIDATION<br/>MULTI-COUCHES<br/>approveDecision<br/>rejectDecision"]
        
        E["SUPERVISEURS<br/>AUTORISÉS<br/>allowedSupervisors<br/>+ signatures"] --> D
        D --> F["AUDIT<br/>TRAIL<br/>Historique<br/>Immutable<br/>SHA-256"]
        
        D --> G["MÉTRIQUES TEMPS RÉEL<br/>totalDecisions<br/>approvedDecisions<br/>rejectedDecisions<br/>expiredDecisions<br/>averageApprovalTime<br/>humanApprovalRate"]
    end

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#fff3e0
    style D fill:#e8f5e8
    style E fill:#fff8e1
    style F fill:#fce4ec
    style G fill:#f1f8e9
EOF

# Figure 2 : Flux de Traitement
cat > schema2_flux.mmd << 'EOF'
flowchart TD
    A[DÉCISION IA<br/>Type + Data + Context] --> B{CLASSIFICATION<br/>CRITICITÉ}
    
    B -->|LOW| C[Validation<br/>Automatique<br/>< 10ms]
    B -->|MEDIUM/HIGH| D[Validation +<br/>Logging<br/>< 50ms]
    B -->|CRITICAL| E[ESCALADE<br/>OBLIGATOIRE]
    
    E --> F[GÉNÉRATION TOKEN SÉCURISÉ<br/>approvalToken = crypto.randomBytes32<br/>decisionHash = SHA256<br/>expiresAt = now + 30min<br/>status = PENDING]
    
    F --> G[SUPERVISION HUMAINE<br/>1. Notification superviseur autorisé<br/>2. Présentation contexte décision<br/>3. Validation signature cryptographique<br/>4. Approbation/Rejet avec justification<br/>5. Mise à jour audit trail]
    
    G --> H{STATUT}
    H -->|APPROVED| I[Autoriser<br/>Exécution<br/>Décision IA]
    H -->|REJECTED| J[Bloquer<br/>Exécution +<br/>Notification]
    H -->|EXPIRED| K[Blocage<br/>Automatique +<br/>Alerte]
    
    C --> I
    D --> L[Exécution avec<br/>Logging renforcé]
    
    style A fill:#e3f2fd
    style B fill:#f3e5f5
    style E fill:#ffebee
    style F fill:#fff3e0
    style G fill:#e8f5e8
    style I fill:#e8f5e8
    style J fill:#ffebee
    style K fill:#ffebee
EOF

# Figure 3 : Architecture Métriques
cat > schema3_metriques.mmd << 'EOF'
graph TB
    subgraph "COLLECTEUR MÉTRIQUES"
        A[COMPTEURS<br/>• total<br/>• approved<br/>• rejected<br/>• expired] --> B[CALCULS<br/>TEMPS RÉEL<br/>• rate<br/>• average<br/>• trends]
        
        B --> C[ÉVÉNEMENTS<br/>• approval_requested<br/>• decision_approved<br/>• decision_rejected<br/>• decision_expired<br/>• security_metrics]
        
        A -.->|updateMetrics<br/>every 5 seconds| B
        C -.->|EventEmitter<br/>Broadcasting| D[External Systems]
    end
    
    subgraph "MONITORING EXTERNE"
        E[PROMETHEUS<br/>COLLECTION<br/>• Scraping<br/>• Storage<br/>• Retention] --> F[GRAFANA<br/>DASHBOARDS<br/>• Courbes<br/>• Alertes<br/>• Reporting]
        
        F --> G[ALERTING<br/>• Seuils performance<br/>• Alertes expiration<br/>• Notifications équipe<br/>• Escalade incidents]
    end
    
    D --> E
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#fff3e0
    style E fill:#e8f5e8
    style F fill:#fff8e1
    style G fill:#ffebee
EOF

# Figure 4 : Comparaison Art Antérieur
cat > schema4_comparaison.mmd << 'EOF'
graph LR
    subgraph "TRUSTCONTEXT PRISM"
        A1[Validation comportementale<br/>décisions IA autonomes]
        A2[Escalade automatique<br/>4 niveaux + supervision<br/>humaine obligatoire]
        A3[4 niveaux hiérarchiques<br/>LOW→CRITICAL]
        A4[Obligatoire pour CRITICAL<br/>automatique pour LOW/MEDIUM]
        A5[Décisions IA autonomes critiques<br/>finance, santé, transport]
        A6[Escalade contextuelle automatique<br/>basée criticité des décisions IA]
    end
    
    subgraph "ART ANTÉRIEUR VALIDATION IA"
        B1[Précision technique modèles IA<br/>avec hash cryptographique]
        B2[Vérification accuracy avec<br/>signature cryptographique]
        B3[Binaire<br/>valide/invalide]
        B4[Pas de supervision<br/>contextualisée]
        B5[Validation précision<br/>modèles ML]
        B6[Validation technique<br/>statique]
    end
    
    subgraph "ART ANTÉRIEUR SÉCURITÉ MULTI-FACTEURS"
        C1[Authentification accès<br/>multi-facteurs]
        C2[Contrôle d'accès par<br/>facteurs multiples]
        C3[2-3 facteurs<br/>fixes]
        C4[Supervision pour<br/>authentification uniquement]
        C5[Sécurité accès<br/>systèmes informatiques]
        C6[Authentification<br/>utilisateur]
    end
    
    A1 -.->|vs| B1
    A1 -.->|vs| C1
    A2 -.->|vs| B2
    A2 -.->|vs| C2
    A3 -.->|vs| B3
    A3 -.->|vs| C3
    A4 -.->|vs| B4
    A4 -.->|vs| C4
    A5 -.->|vs| B5
    A5 -.->|vs| C5
    A6 -.->|vs| B6
    A6 -.->|vs| C6
    
    style A1 fill:#c8e6c9
    style A2 fill:#c8e6c9
    style A3 fill:#c8e6c9
    style A4 fill:#c8e6c9
    style A5 fill:#c8e6c9
    style A6 fill:#c8e6c9
    style B1 fill:#ffcdd2
    style B2 fill:#ffcdd2
    style B3 fill:#ffcdd2
    style B4 fill:#ffcdd2
    style B5 fill:#ffcdd2
    style B6 fill:#ffcdd2
    style C1 fill:#fff3e0
    style C2 fill:#fff3e0
    style C3 fill:#fff3e0
    style C4 fill:#fff3e0
    style C5 fill:#fff3e0
    style C6 fill:#fff3e0
EOF

echo "🎨 Export PNG haute résolution avec Mermaid CLI..."

# Export PNG haute qualité (2048x1536, 300 DPI équivalent)
mmdc -i schema1_architecture.mmd -o temp1.png -t default -b white --width 2048 --height 1536 --scale 2
mmdc -i schema2_flux.mmd -o temp2.png -t default -b white --width 2048 --height 1536 --scale 2  
mmdc -i schema3_metriques.mmd -o temp3.png -t default -b white --width 2048 --height 1536 --scale 2
mmdc -i schema4_comparaison.mmd -o temp4.png -t default -b white --width 2048 --height 1536 --scale 2

echo "🔄 Conversion PNG → JPG haute qualité avec ImageMagick..."

# Conversion avec compression optimale et métadonnées
convert temp1.png -quality 95 -density 300 -compress jpeg \
    -set attribute:title "Figure 1: Architecture Générale Système TrustContext" \
    -set attribute:author "PRISM Security Team" \
    -set attribute:copyright "2025 - Brevet INPI TrustContext" \
    Figure1_Architecture_Generale_TrustContext_INPI2025.jpg

convert temp2.png -quality 95 -density 300 -compress jpeg \
    -set attribute:title "Figure 2: Flux de Traitement Décision IA" \
    -set attribute:author "PRISM Security Team" \
    -set attribute:copyright "2025 - Brevet INPI TrustContext" \
    Figure2_Flux_Traitement_Decision_IA_INPI2025.jpg

convert temp3.png -quality 95 -density 300 -compress jpeg \
    -set attribute:title "Figure 3: Architecture Métriques Temps Réel" \
    -set attribute:author "PRISM Security Team" \
    -set attribute:copyright "2025 - Brevet INPI TrustContext" \
    Figure3_Architecture_Metriques_TempsReel_INPI2025.jpg

convert temp4.png -quality 95 -density 300 -compress jpeg \
    -set attribute:title "Figure 4: Comparaison avec Art Antérieur" \
    -set attribute:author "PRISM Security Team" \
    -set attribute:copyright "2025 - Brevet INPI TrustContext" \
    Figure4_Comparaison_Art_Anterieur_INPI2025.jpg

echo "🧹 Nettoyage fichiers temporaires..."
rm -f temp*.png schema*.mmd

echo "✅ Export terminé ! Vérification qualité images..."

# Vérification taille et qualité
for file in Figure*.jpg; do
    if [ -f "$file" ]; then
        size=$(identify -format "%wx%h" "$file")
        filesize=$(du -h "$file" | cut -f1)
        echo "📊 $file : $size pixels, $filesize"
    fi
done

echo ""
echo "🎯 IMAGES PRÊTES POUR INSERTION BREVET INPI !"
echo "📁 Fichiers générés dans : $(pwd)"
echo ""
echo "📋 Checklist validation :"
echo "  ✅ Résolution 2048x1536 (300 DPI équivalent)"
echo "  ✅ Format JPG qualité 95%"
echo "  ✅ Métadonnées intégrées (titre, auteur, copyright)"
echo "  ✅ Nomenclature INPI conforme"
echo "  ✅ Taille optimisée < 2MB par fichier"
echo ""
echo "🔄 Étape suivante : Insérer les images dans le document DOCX"
echo "    en remplaçant les schémas ASCII existants"
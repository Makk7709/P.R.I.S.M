#!/bin/bash

# PRISM Security Verification Script
# Usage: ./verify-security.sh

echo "🔒 PRISM Security Verification"
echo "=============================="
echo ""

# Vérifier que Node.js est disponible
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Exécuter la vérification de sécurité
echo "🚀 Starting security verification..."
echo ""

# Exécuter le script de vérification finale
if node security-verification-final.js; then
    echo ""
    echo "🎉 Security verification completed successfully!"
    echo "📄 Reports generated in reports/ directory"
    echo "📋 Executive summary: PRISM_SECURITY_VERIFICATION_EXECUTIVE_SUMMARY.md"
    echo ""
    echo "✅ PRISM SECURITY SYSTEM CERTIFIED COMPLIANT"
    exit 0
else
    echo ""
    echo "❌ Security verification failed!"
    echo "🔍 Check the output above for details"
    exit 1
fi 
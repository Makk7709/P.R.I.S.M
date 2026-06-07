/**
 * Test d'intégration du logo PRISM
 * Vérifie que le logo SVG est accessible et correctement intégré
 */

import fetch from 'node-fetch';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';

async function testLogoIntegration() {
    console.log('🎯 Test d\'intégration du logo PRISM\n');
    
    const tests = [
        {
            name: 'Accessibilité du logo SVG',
            url: `${BASE_URL}/assets/prism_logo.svg`,
            expectedContentType: 'image/svg+xml'
        },
        {
            name: 'Dashboard principal',
            url: `${BASE_URL}/`,
            expectedContent: '<img src="/assets/prism_logo.svg" alt="PRISM Logo" class="logo-icon" />'
        },
        {
            name: 'Interface vocale V2',
            url: `${BASE_URL}/ui/prismVoiceChatV2.html`,
            expectedContent: '<img src="/assets/prism_logo.svg" alt="PRISM Logo" class="header-logo" />'
        },
        {
            name: 'Interface vocale V1',
            url: `${BASE_URL}/ui/prismVoiceChat.html`,
            expectedContent: '<img src="/assets/prism_logo.svg" alt="PRISM Logo" class="header-logo" />'
        }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        try {
            console.log(`🧪 Test: ${test.name}`);
            
            const response = await fetch(test.url);
            
            if (!response.ok) {
                console.log(`❌ Échec: HTTP ${response.status}`);
                continue;
            }
            
            if (test.expectedContentType) {
                const contentType = response.headers.get('content-type');
                if (!contentType.includes(test.expectedContentType)) {
                    console.log(`❌ Échec: Content-Type attendu ${test.expectedContentType}, reçu ${contentType}`);
                    continue;
                }
            }
            
            if (test.expectedContent) {
                const content = await response.text();
                if (!content.includes(test.expectedContent)) {
                    console.log(`❌ Échec: Contenu attendu non trouvé`);
                    continue;
                }
            }
            
            console.log(`✅ Succès: ${test.name}`);
            passedTests++;
            
        } catch (error) {
            console.log(`❌ Erreur: ${error.message}`);
        }
        
        console.log('');
    }
    
    // Test de validation du fichier SVG
    console.log('🧪 Test: Validation du fichier SVG');
    try {
        const svgPath = path.join(process.cwd(), 'public/assets/prism_logo.svg');
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        
        if (svgContent.includes('<svg') && svgContent.includes('</svg>')) {
            console.log('✅ Succès: Fichier SVG valide');
            passedTests++;
            totalTests++;
        } else {
            console.log('❌ Échec: Fichier SVG invalide');
            totalTests++;
        }
    } catch (error) {
        console.log(`❌ Erreur: ${error.message}`);
        totalTests++;
    }
    
    console.log('\n📊 Résultats des tests:');
    console.log(`✅ Tests réussis: ${passedTests}/${totalTests}`);
    console.log(`📈 Taux de réussite: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 Tous les tests sont passés ! Le logo PRISM est correctement intégré.');
    } else {
        console.log('\n⚠️ Certains tests ont échoué. Vérifiez la configuration.');
    }
}

// Exécuter les tests
testLogoIntegration().catch(console.error); 
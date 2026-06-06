const { execSync } = require('child_process');
const _path = require('path');
require('dotenv').config();

function deploy() {
  console.log('🚀 Déploiement en cours...');
  
  try {
    // Vérifier la configuration
    console.log('🔍 Vérification de la configuration...');
    execSync('npm run check:config', { stdio: 'inherit' });
    
    // Construire l'application
    console.log('🏗️ Construction de l\'application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Vérifier les tests
    console.log('🧪 Exécution des tests...');
    execSync('npm run test:prod', { stdio: 'inherit' });
    
    // Vérifier la sécurité
    console.log('🔒 Vérification de la sécurité...');
    execSync('npm run test:security', { stdio: 'inherit' });
    
    // Déployer l'application
    console.log('📦 Déploiement de l\'application...');
    // TODO: Ajouter la logique de déploiement spécifique
    
    console.log('✅ Déploiement terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du déploiement :', error.message);
    process.exit(1);
  }
}

deploy(); 
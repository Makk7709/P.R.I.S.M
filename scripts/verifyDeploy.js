const { execSync } = require('child_process');
const _path = require('path');
require('dotenv').config();

function verifyDeploy() {
  console.log('🔍 Vérification du déploiement...');
  
  try {
    // Vérifier que l'application répond
    console.log('🌐 Vérification de la disponibilité...');
    execSync(`curl -f http://localhost:${process.env.PORT}`, { stdio: 'inherit' });
    
    // Vérifier les métriques
    console.log('📊 Vérification des métriques...');
    execSync(`curl -f http://localhost:${process.env.METRICS_PORT}/metrics`, { stdio: 'inherit' });
    
    // Vérifier les logs
    console.log('📝 Vérification des logs...');
    execSync('npm run check:logs', { stdio: 'inherit' });
    
    console.log('✅ Déploiement vérifié avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du déploiement :', error.message);
    process.exit(1);
  }
}

verifyDeploy(); 
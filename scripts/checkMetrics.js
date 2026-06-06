const { execSync } = require('child_process');
const _path = require('path');
require('dotenv').config();

function checkMetrics() {
  console.log('📊 Vérification des métriques...');
  
  try {
    // Vérifier que le serveur de métriques répond
    console.log('🔍 Vérification du serveur de métriques...');
    execSync(`curl -f http://localhost:${process.env.METRICS_PORT}/metrics`, { stdio: 'inherit' });
    
    // Vérifier les métriques spécifiques
    console.log('📈 Vérification des métriques spécifiques...');
    const metrics = execSync(`curl -s http://localhost:${process.env.METRICS_PORT}/metrics`).toString();
    
    const requiredMetrics = [
      'prism_total_requests',
      'prism_efficiency_percent',
      'prism_latency_seconds'
    ];
    
    const missingMetrics = requiredMetrics.filter(metric => !metrics.includes(metric));
    
    if (missingMetrics.length > 0) {
      console.error('❌ Métriques manquantes :');
      missingMetrics.forEach(metric => console.error(`   - ${metric}`));
      process.exit(1);
    }
    
    console.log('✅ Métriques vérifiées avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des métriques :', error.message);
    process.exit(1);
  }
}

checkMetrics(); 
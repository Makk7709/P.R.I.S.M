const _fs = require('fs');
const _path = require('path');
require('dotenv').config();

const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'API_KEY',
  'API_SECRET',
  'METRICS_PORT',
  'GRAFANA_PORT',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'OPENAI_API_KEY',
  'AZURE_SPEECH_KEY',
  'AZURE_SPEECH_REGION',
  'LOG_LEVEL',
  'LOG_FILE'
];

function checkConfig() {
  console.log('🔍 Vérification de la configuration...');
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variables d\'environnement manquantes :');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }
  
  console.log('✅ Configuration valide !');
}

checkConfig(); 
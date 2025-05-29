const fs = require('fs');
const path = require('path');
require('dotenv').config();

function checkLogs() {
  console.log('📝 Vérification des logs...');
  
  try {
    const logFile = process.env.LOG_FILE || 'logs/prism.log';
    const logPath = path.resolve(process.cwd(), logFile);
    
    // Vérifier que le fichier de log existe
    if (!fs.existsSync(logPath)) {
      console.error(`❌ Le fichier de log n'existe pas : ${logFile}`);
      process.exit(1);
    }
    
    // Lire les dernières lignes du log
    const logContent = fs.readFileSync(logPath, 'utf8');
    const lastLines = logContent.split('\n').slice(-50);
    
    // Vérifier les erreurs
    const errors = lastLines.filter(line => 
      line.toLowerCase().includes('error') || 
      line.toLowerCase().includes('exception') ||
      line.toLowerCase().includes('fail')
    );
    
    if (errors.length > 0) {
      console.error('❌ Erreurs trouvées dans les logs :');
      errors.forEach(error => console.error(`   - ${error}`));
      process.exit(1);
    }
    
    console.log('✅ Logs vérifiés avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des logs :', error.message);
    process.exit(1);
  }
}

checkLogs(); 
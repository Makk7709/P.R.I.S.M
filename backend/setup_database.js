import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Vérifier les variables d'environnement
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_API_KEY) {
  console.error('❌ Variables d\'environnement manquantes : SUPABASE_URL et SUPABASE_API_KEY sont requis');
  process.exit(1);
}

// Initialiser le client Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_API_KEY);

async function setupDatabase() {
  try {
    // Lire le fichier SQL
    const sqlPath = join(__dirname, 'setup_database.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Exécuter le SQL
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ Erreur lors de l\'exécution du SQL:', error.message);
      process.exit(1);
    }

    console.log('✅ Base de données configurée avec succès !');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

setupDatabase(); 
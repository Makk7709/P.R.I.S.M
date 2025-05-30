import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229';

export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

// Vérification des variables requises
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variables d\'environnement manquantes:', missingVars.join(', '));
  console.error('⚠️ Veuillez configurer les variables d\'environnement requises dans .env.local');
  process.exit(1);
}

console.log('✅ Configuration de l\'environnement terminée avec succès.'); 
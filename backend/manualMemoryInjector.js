import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const _require = createRequire(import.meta.url);

// Load environment variables from the root directory
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[PRISM MEMORY] ❌ Variables d\'environnement manquantes. Vérifiez .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Debug logging
console.log('[PRISM MEMORY] 🔍 Vérification de l\'environnement:', {
  hasSupabaseUrl: !!supabaseUrl,
  hasSupabaseKey: !!supabaseKey
});

async function insertMemory(type, content, metadata) {
  try {
    const { data, error } = await supabase
      .from('prism_memories')
      .insert([{ type, content, metadata }])
      .select();

    if (error) {
      console.error(`[PRISM MEMORY] ❌ Erreur d'insertion: ${error.message}`);
      return null;
    }

    console.log(`[PRISM MEMORY] ✅ Souvenir inséré avec succès: ${type}`);
    return data[0];
  } catch (err) {
    console.error(`[PRISM MEMORY] ❌ Erreur inattendue: ${err.message}`);
    return null;
  }
}

async function injectManualMemory() {
  const memories = [
    {
      type: "suggestion",
      content: "PRISM devrait améliorer ses capacités d'auto-optimisation.",
      metadata: { priority: "high", context: "self-improvement" }
    },
    {
      type: "feedback",
      content: "Le processus d'évaluation des suggestions doit être optimisé.",
      metadata: { priority: "medium", context: "evaluation" }
    },
    {
      type: "internal_strategy",
      content: "Renforcement du module Firewall pour détecter les biais cognitifs.",
      metadata: { priority: "critical", domain: "cognitive_security" }
    }
  ];

  console.log('[PRISM MEMORY] 🚀 Début de l\'injection des souvenirs...');

  for (const memory of memories) {
    const result = await insertMemory(memory.type, memory.content, memory.metadata);
    if (!result) {
      console.warn(`[PRISM MEMORY] ⚠️ Échec de l'injection pour: ${memory.type}`);
    }
  }

  console.log('[PRISM MEMORY] ✨ Injection terminée.');
}

// Execute the injection
injectManualMemory().catch(error => {
  console.error('[PRISM MEMORY] ❌ Erreur fatale:', error);
  process.exit(1);
}); 
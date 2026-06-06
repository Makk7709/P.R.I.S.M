/**
 * Plugin Vite pour corriger les problèmes de résolution de chemins avec espaces
 * Transforme les imports relatifs en chemins absolus pour éviter les problèmes Vitest
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname);

export default function fixPathsPlugin() {
  return {
    name: 'fix-paths',
    enforce: 'pre',
    resolveId(source, importer) {
      // Si l'import est un chemin relatif avec ../../
      if (source.startsWith('../../../src/') || source.startsWith('../../src/')) {
        // Résoudre le chemin relatif depuis l'importer
        if (importer) {
          const importerDir = path.dirname(importer);
          const resolved = path.resolve(importerDir, source);
          // Normaliser le chemin et retourner l'ID résolu
          return path.normalize(resolved);
        }
      }
      return null; // Laisser Vite gérer les autres imports
    },
    load(id) {
      // Vérifier si le fichier existe (avec ou sans .js)
      if (existsSync(id)) {
        return null; // Laisser Vite charger le fichier
      }
      // Essayer avec .js si ce n'est pas déjà le cas
      if (!id.endsWith('.js') && !id.endsWith('.ts')) {
        const withJs = `${id  }.js`;
        if (existsSync(withJs)) {
          return null; // Vite devrait le résoudre
        }
      }
      return null;
    }
  };
}

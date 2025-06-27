import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db;

/**
 * Obtient une instance singleton de la base de données.
 * Crée la base et la table si elles n'existent pas.
 * @param {string} [dbPath] - Chemin optionnel vers le fichier dba. Par défaut, utilise 'data/prism.db'.
 * @returns {Database.Database} L'instance de better-sqlite3.
 */
export function getDb(dbPath) {
  if (db && db.open) {
    return db;
  }

  const resolvedPath = dbPath || path.join(process.cwd(), 'data', 'prism.db');
  const dbDir = path.dirname(resolvedPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(resolvedPath, { verbose: null /* console.log */ });

  const createTableStmt = db.prepare(`
    CREATE TABLE IF NOT EXISTS prism_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    )
  `);
  createTableStmt.run();

  return db;
}

/**
 * Ferme la connexion à la base de données. Utile pour le nettoyage dans les tests.
 */
export function closeDb() {
  if (db && db.open) {
    db.close();
    db = null;
  }
} 
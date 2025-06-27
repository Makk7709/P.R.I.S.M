/**
 * PRISM State Store
 * Gère la persistance des états via SQLite.
 * @module persistence/prismStateStore
 */
import { getDb } from '../backend/database.js';

class PrismStateStore {
  constructor() {
    // La DB est initialisée à la première requête.
  }

  /**
   * Sauvegarde une valeur pour une clé donnée.
   * @param {string} key - La clé unique.
   * @param {*} value - La valeur à stocker (sera sérialisée en JSON).
   */
  async set(key, value) {
    const db = getDb(process.env.DATABASE_PATH);
    const stmt = db.prepare(
      'INSERT INTO prism_state (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    stmt.run({ key, value: JSON.stringify(value) });
  }

  /**
   * Récupère une valeur par sa clé.
   * @param {string} key - La clé à récupérer.
   * @returns {*} La valeur désérialisée, ou undefined si non trouvée.
   */
  async get(key) {
    const db = getDb(process.env.DATABASE_PATH);
    const stmt = db.prepare('SELECT value FROM prism_state WHERE key = ?');
    const row = stmt.get(key);
    return row ? JSON.parse(row.value) : undefined;
  }

  /**
   * Récupère tous les états sous forme d'objet.
   * @returns {Object<string, *>} Un objet contenant tous les états.
   */
  async getAll() {
    const db = getDb(process.env.DATABASE_PATH);
    const stmt = db.prepare('SELECT key, value FROM prism_state');
    const rows = stmt.all();
    return rows.reduce((acc, row) => {
      acc[row.key] = JSON.parse(row.value);
      return acc;
    }, {});
  }

  /**
   * Supprime une clé de la base de données.
   * @param {string} key - La clé à supprimer.
   */
  async delete(key) {
    const db = getDb(process.env.DATABASE_PATH);
    const stmt = db.prepare('DELETE FROM prism_state WHERE key = ?');
    stmt.run(key);
  }
}

// Exporte une instance unique (singleton)
export const prismStateStore = new PrismStateStore(); 
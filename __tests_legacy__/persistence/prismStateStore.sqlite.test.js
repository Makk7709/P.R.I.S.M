import PrismStateStore from '../../persistence/prismStateStore.js';
import db from '../../backend/database.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @fileoverview Test suite for PrismStateStore with a real SQLite database.
 * This test ensures that the persistence layer correctly saves, loads, updates,
 * and handles data expiration (TTL) as expected.
 */

describe('PrismStateStore with SQLite', () => {
  let stateStore;
  const testData = { setting: 'test-mode', value: 42 };
  const testKey = 'module-test-key';

  // Before each test, we ensure the database is in a clean state
  // by clearing the memories table.
  beforeEach(() => {
    db.exec('DELETE FROM memories');
    stateStore = new PrismStateStore();
  });

  test('should save a new state correctly', async () => {
    await stateStore.saveState(testKey, testData);

    // Verify directly in the DB
    const row = db.prepare('SELECT * FROM memories WHERE key = ?').get(testKey);
    
    expect(row).toBeDefined();
    expect(row.key).toBe(testKey);
    expect(JSON.parse(row.data)).toEqual(testData);
  });

  test('should load an existing state', async () => {
    await stateStore.saveState(testKey, testData);
    const loadedData = await stateStore.loadState(testKey);

    expect(loadedData).toEqual(testData);
  });

  test('should update an existing state', async () => {
    const updatedData = { setting: 'live-mode', value: 99 };
    await stateStore.saveState(testKey, testData); // initial save
    await stateStore.saveState(testKey, updatedData); // update

    const loadedData = await stateStore.loadState(testKey);
    expect(loadedData).toEqual(updatedData);
  });

  test('should return null when loading a non-existent state', async () => {
    const loadedData = await stateStore.loadState('non-existent-key');
    expect(loadedData).toBeNull();
  });

  test('should return null for an expired state (TTL)', async () => {
    // Manually insert a record with an old timestamp
    const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    db.prepare(`
      INSERT INTO memories (key, data, timestamp) VALUES (?, ?, ?)
    `).run(testKey, JSON.stringify(testData), expiredTimestamp);

    const loadedData = await stateStore.loadState(testKey);
    expect(loadedData).toBeNull();
    
    // Verify the expired record was deleted
    const row = db.prepare('SELECT * FROM memories WHERE key = ?').get(testKey);
    expect(row).toBeUndefined();
  });

  test('should clear expired states correctly', async () => {
    const key1 = 'valid-key';
    const key2 = 'expired-key';
    const expiredTimestamp = Date.now() - 3000; // 3 seconds ago

    // Save one valid and one soon-to-be-expired record
    await stateStore.saveState(key1, { data: 'valid' });
    db.prepare(`
      INSERT INTO memories (key, data, timestamp) VALUES (?, ?, ?)
    `).run(key2, JSON.stringify({ data: 'expired' }), expiredTimestamp);
    
    // Clear states older than 2 seconds
    await stateStore.clearExpired(2000);

    const validState = await stateStore.loadState(key1);
    const expiredState = await stateStore.loadState(key2);

    expect(validState).not.toBeNull();
    expect(expiredState).toBeNull();
  });
}); 
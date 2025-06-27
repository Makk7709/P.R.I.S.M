import fs from 'fs';
import path from 'path';
import { prismStateStore } from '@/persistence/prismStateStore.js';
import { closeDb } from '@/backend/database.js';

const testDbPath = path.resolve(process.cwd(), 'prism-test.db');
process.env.DATABASE_PATH = testDbPath;

describe('prismStateStore Integration Test (SQLite)', () => {
  beforeEach(() => {
    closeDb();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    delete process.env.DATABASE_PATH;
  });

  it('should initialize with an empty state', async () => {
    const allState = await prismStateStore.getAll();
    expect(allState).toEqual({});
  });

  it('should set and get a simple value', async () => {
    await prismStateStore.set('testKey', 'testValue');
    const value = await prismStateStore.get('testKey');
    expect(value).toBe('testValue');
  });

  it('should set and get a complex object', async () => {
    const complexObject = { a: 1, b: { c: 'string' }, d: [1, 2, 3] };
    await prismStateStore.set('complexKey', complexObject);
    const value = await prismStateStore.get('complexKey');
    expect(value).toEqual(complexObject);
  });

  it('should update an existing value', async () => {
    await prismStateStore.set('keyToUpdate', 'initial');
    await prismStateStore.set('keyToUpdate', 'updated');
    const value = await prismStateStore.get('keyToUpdate');
    expect(value).toBe('updated');
  });

  it('should delete a value', async () => {
    await prismStateStore.set('keyToDelete', 'someValue');
    let value = await prismStateStore.get('keyToDelete');
    expect(value).toBe('someValue');

    await prismStateStore.delete('keyToDelete');
    value = await prismStateStore.get('keyToDelete');
    expect(value).toBeUndefined();
  });

  it('should get all values correctly', async () => {
    await prismStateStore.set('key1', 'value1');
    await prismStateStore.set('key2', { a: 1 });
    await prismStateStore.set('key3', true);

    const allState = await prismStateStore.getAll();
    expect(allState).toEqual({
      key1: 'value1',
      key2: { a: 1 },
      key3: true,
    });
  });
}); 
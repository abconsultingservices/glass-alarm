import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as schema from './schema';

// This variable stays in memory and holds our one-and-only connection
let _sqliteDb: Promise<SQLiteDatabase> | null = null;

export const getSqliteDb = () => {
  if (!_sqliteDb) {
    _sqliteDb = openDatabaseAsync('liquid_glass.db');
  }
  return _sqliteDb;
};

// Initialize Drizzle with the singleton promise
export const db = drizzle(getSqliteDb(), { schema });

export const ensureSchema = async () => {
  const sqlite = await getSqliteDb();
  await sqlite.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT
    );
  `);
};
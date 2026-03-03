import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseAsync } from 'expo-sqlite';
import * as schema from './schema';

const expoDbPromise = openDatabaseAsync('liquid_glass.db');

export const db = drizzle(expoDbPromise, { schema });

// Ensure this has the 'export' keyword!
export const ensureSchema = async () => {
  const sqlite = await expoDbPromise;
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
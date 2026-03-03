// services/DatabaseService.ts
import { getSqliteDb, ensureSchema } from "../db/client";

class DatabaseService {
    async hasUsers(): Promise<boolean> {
        try {
        await ensureSchema();
        const sqlite = await getSqliteDb();
        // Use getFirstAsync to safely check for a record on Web
        const result = await sqlite.getFirstAsync('SELECT id FROM users LIMIT 1');
        return !!result;
        } catch (e) {
        console.error("CheckUser Error:", e);
        return false;
        }
    }

  async getLatestUser() {
    try {
      await ensureSchema();
      const sqlite = await getSqliteDb();

      // Use getFirstAsync to bypass Drizzle's internal 'prepareSync' bug
      const result = await sqlite.getFirstAsync<any>(
        'SELECT * FROM users ORDER BY id DESC LIMIT 1'
      );

      return result || null;
    } catch (error) {
      console.error("DatabaseService Load Error:", error);
      return null;
    }
  }

  async createUser(name: string, email: string, phone: string) {
    await ensureSchema();
    const sqlite = await getSqliteDb();

    // Direct async run for the insert
    return await sqlite.runAsync(
      'INSERT INTO users (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone || ""]
    );
  }

  async resetApp() {
    try {
      const sqlite = await getSqliteDb();
      // 1. Wipe the table
      await sqlite.runAsync('DELETE FROM users');
      console.log("Database wiped successfully");
      return true;
    } catch (error) {
      console.error("Reset Error:", error);
      return false;
    }
  }
}

export const dbService = new DatabaseService();
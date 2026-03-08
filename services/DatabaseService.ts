// services/DatabaseService.ts
import { getSqliteDb, ensureSchema } from "../db/client";

class DatabaseService {
    // Helper to ensure we are always working with an initialized DB
    private async getDb() {
        await ensureSchema();
        return await getSqliteDb();
    }

    async hasUsers(): Promise<boolean> {
        try {
            const sqlite = await this.getDb();
            const result = await sqlite.getFirstAsync('SELECT id FROM users LIMIT 1');
            return !!result;
        } catch (e) {
            console.error("CheckUser Error:", e);
            return false;
        }
    }

    async getLatestUser() {
        try {
            const sqlite = await this.getDb();
            const result = await sqlite.getFirstAsync<any>(
                'SELECT * FROM users ORDER BY id DESC LIMIT 1'
            );
            return result || null;
        } catch (error) {
            console.error("DatabaseService Load Error:", error);
            return null;
        }
    }

    /**
     * DYNAMIC UPDATE METHOD
     * Handles updating any column in any table.
     * Note: In a production 2026 app, we use whitelist validation to prevent SQL injection.
     */
    async updateField(tableName: string, columnName: string, value: any, id: number = 1) {
        try {
            const sqlite = await this.getDb();
            
            // Whitelist check for table names to prevent SQL injection
            const allowedTables = ['users', 'routines'];
            if (!allowedTables.includes(tableName)) {
                throw new Error(`Unauthorized table access: ${tableName}`);
            }

            const latest = await sqlite.getFirstAsync<any>(`SELECT id FROM ${tableName} ORDER BY id DESC LIMIT 1`);
            const targetId = latest?.id || 1;
            const query = `UPDATE ${tableName} SET ${columnName} = ? WHERE id = ?`;

            console.log(`Executing: UPDATE ${tableName} SET ${columnName} = '${value}' WHERE id = ${targetId}`);
            
            await sqlite.runAsync(query, [value, targetId]);
            console.log(`Successfully updated ${tableName}.${columnName}`);
            return true;
        } catch (error) {
            console.error(`UpdateField Error (${tableName}.${columnName}):`, error);
            return false;
        }
    }

    async createUser(name: string, email: string, phone: string) {
        try {
            const sqlite = await this.getDb();
            return await sqlite.runAsync(
                'INSERT INTO users (name, email, phone) VALUES (?, ?, ?)',
                [name, email, phone || ""]
            );
        } catch (e) {
            console.error("CreateUser Error:", e);
            throw e;
        }
    }

    async resetApp() {
        try {
            const sqlite = await this.getDb();
            // Wipe all relevant tables
            await sqlite.runAsync('DELETE FROM users');
            // await sqlite.runAsync('DELETE FROM routines'); // Add when routines table is ready
            console.log("Database wiped successfully");
            return true;
        } catch (error) {
            console.error("Reset Error:", error);
            return false;
        }
    }
}

export const dbService = new DatabaseService();
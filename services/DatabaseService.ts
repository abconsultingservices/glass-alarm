import { getSqliteDb, ensureSchema } from "../db/client";
import { SEED_DATA, SCHEMA_V1 } from "./Migrations";
import * as Crypto from 'expo-crypto'; // Using Expo Crypto for UUIDs in 2026

class DatabaseService {
    private async getDb() {
        // ensureSchema handles the execution of SCHEMA_V1 internally
        await ensureSchema();
        return await getSqliteDb();
    }

    /**
     * INITIALIZE & SEED
     * Checks for users and applies placeholder data if empty.
     */
    async initialize() {
        const hasUser = await this.hasUsers();
        if (!hasUser) {
            console.log("DB Service: New installation detected. Seeding placeholder data...");
            await this.seedData();
        }
    }

    async hasUsers(): Promise<boolean> {
        try {
            const sqlite = await this.getDb();
            const result = await sqlite.getFirstAsync('SELECT id FROM users LIMIT 1');
            return !!result;
        } catch (e) {
            return false;
        }
    }

    private async seedData() {
        try {
            const sqlite = await this.getDb();
            
            // Disable FKs for circular placeholder creation
            await sqlite.execAsync('PRAGMA foreign_keys = OFF;');

            const uguid = Crypto.randomUUID();
            const gguid = Crypto.randomUUID();

            // 1. Create Default Group & User
            await sqlite.runAsync(
                `INSERT INTO groups (gguid, owner_uguid, name, createdBy, lastModifiedBy) 
                 VALUES (?, ?, ?, ?, ?)`,
                [gguid, uguid, 'My Family', uguid, uguid]
            );

            await sqlite.runAsync(
                `INSERT INTO users (uguid, gguid, firstName, lastName, email, role, createdBy, lastModifiedBy) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [uguid, gguid, 'New', 'User', 'welcome@localhost.local', 'owner', uguid, uguid]
            );

            // --- MOCK ROUTINE 1: Morning Meditation ---
            const rguid1 = Crypto.randomUUID();
            await sqlite.runAsync(
                `INSERT INTO routines (rguid, uguid, gguid, name, duration, createdBy, lastModifiedBy) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [rguid1, uguid, gguid, 'Morning Meditation', 30, uguid, uguid]
            );

            await sqlite.runAsync(
                `INSERT INTO routine_schedules (sguid, rguid, type, startDate, startTime, createdBy, lastModifiedBy) 
                 VALUES (?, ?, 'daily', '2026-01-01', '07:00', ?, ?)`,
                [Crypto.randomUUID(), rguid1, uguid, uguid]
            );

            // --- MOCK ROUTINE 2: Hydration (The Multi-Hit) ---
            const rguid2 = Crypto.randomUUID();
            await sqlite.runAsync(
                `INSERT INTO routines (rguid, uguid, gguid, name, duration, createdBy, lastModifiedBy) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [rguid2, uguid, gguid, 'Hydration / Water', 15, uguid, uguid]
            );

            await sqlite.runAsync(
                `INSERT INTO routine_schedules (sguid, rguid, type, startDate, startTime, frequencyHours, maxOccurrences, createdBy, lastModifiedBy) 
                 VALUES (?, ?, 'daily', '2026-01-01', '09:00', 4, 3, ?, ?)`,
                [Crypto.randomUUID(), rguid2, uguid, uguid]
            );

            // 2. STATIC EXCEPTION (The Grave)
            // Bury the 2nd instance (index 1) of Water on March 8th
            await sqlite.runAsync(
                `INSERT INTO routine_exceptions (reguid, rguid, instanceDate, instanceIndex, createdBy) 
                 VALUES (?, ?, '2026-03-08', 1, ?)`,
                [Crypto.randomUUID(), rguid2, uguid]
            );

            await sqlite.execAsync('PRAGMA foreign_keys = ON;');

            localStorage.setItem('temp_setup_uguid', uguid);
            localStorage.setItem('temp_setup_gguid', gguid);
            
            console.log("Database Seeding Complete with Mock Routines");
        } catch (err) {
            console.error("Seeding failed:", err);
        }
    }

    /**
     * FETCH WRAPPERS
     */
    async getLatestUser() {
        try {
            const sqlite = await this.getDb();
            return await sqlite.getFirstAsync<any>('SELECT * FROM users ORDER BY id DESC LIMIT 1');
        } catch (error) {
            return null;
        }
    }

    /**
     * DYNAMIC UPDATE METHOD (With Whitelist)
     */
    async updateField(tableName: string, columnName: string, value: any, guidLabel: string, guidValue: string) {
        try {
            const sqlite = await this.getDb();
            
            const allowedTables = ['users', 'groups', 'routines', 'routine_schedules'];
            if (!allowedTables.includes(tableName)) {
                throw new Error(`Unauthorized table: ${tableName}`);
            }

            const query = `UPDATE ${tableName} SET ${columnName} = ?, lastModifiedBy = ?, lastModifiedDate = CURRENT_TIMESTAMP WHERE ${guidLabel} = ?`;
            const sessionUguid = localStorage.getItem('session_uguid') || 'system';

            await sqlite.runAsync(query, [value, sessionUguid, guidValue]);
            return true;
        } catch (error) {
            console.error(`Update Error:`, error);
            return false;
        }
    }

    /**
     * SETUP DATA UPDATE
     * Specifically for the onboarding flow to update the placeholder user.
     */
    async updateSetupData(firstName: string, lastName: string, email: string, groupName: string) {
        const uguid = localStorage.getItem('temp_setup_uguid');
        const gguid = localStorage.getItem('temp_setup_gguid');

        if (!uguid || !gguid) return false;

        try {
            const sqlite = await this.getDb();
            await sqlite.withTransactionAsync(async () => {
                await sqlite.runAsync(
                    'UPDATE users SET firstName = ?, lastName = ?, email = ? WHERE uguid = ?',
                    [firstName, lastName, email, uguid]
                );
                await sqlite.runAsync(
                    'UPDATE groups SET name = ? WHERE gguid = ?',
                    [groupName, gguid]
                );
            });

            // Set official session
            localStorage.setItem('session_uguid', uguid);
            localStorage.setItem('session_gguid', gguid);
            return true;
        } catch (e) {
            console.error("Setup update failed:", e);
            return false;
        }
    }

    async resetApp() {
        try {
            const sqlite = await this.getDb();
            await sqlite.execAsync('PRAGMA foreign_keys = OFF;');
            await sqlite.runAsync('DELETE FROM users');
            await sqlite.runAsync('DELETE FROM groups');
            await sqlite.runAsync('DELETE FROM routines');
            await sqlite.runAsync('DELETE FROM routine_schedules');
            await sqlite.runAsync('DELETE FROM routine_exceptions');
            await sqlite.execAsync('PRAGMA foreign_keys = ON;');
            return true;
        } catch (error) {
            return false;
        }
    }
}

export const dbService = new DatabaseService();
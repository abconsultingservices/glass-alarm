import { getSqliteDb } from "../db/client";
import { SCHEMA_V1 } from "./Migrations";
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

class DatabaseService {
    // Singleton promise to prevent multiple initialization triggers
    private initPromise: Promise<void> | null = null;

    /**
     * Entry point for database initialization.
     */
    async initialize(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            console.log("DB Service: Starting initialization...");
            const sqlite = await getSqliteDb();
            
            try {
                // 1. Verify schema - checking for uguid column specifically
                await sqlite.getFirstAsync<any>('SELECT uguid FROM users LIMIT 1');
                console.log("DB Service: Schema uguid verified.");
            } catch (e) {
                console.log("DB Service: Schema mismatch detected. Wiping for fresh install...");
                await this.resetApp(); 
                await sqlite.execAsync(SCHEMA_V1);
            }

            // 2. Check if we have a seeded user
            const userCheck = await sqlite.getFirstAsync<any>('SELECT uguid, gguid FROM users LIMIT 1');

            if (!userCheck) {
                console.log("DB Service: No user found. Seeding...");
                await this.seedData();
            } else {
                // Sync SQLite values to AsyncStorage for Setup screen
                await AsyncStorage.setItem('temp_setup_uguid', userCheck.uguid);
                await AsyncStorage.setItem('temp_setup_gguid', userCheck.gguid);
            }
            
            console.log("DB Service: Initialization successful.");
        })();

        return this.initPromise;
    }

    /**
     * If storage is wiped but DB remains, restore temp GUIDs from the DB.
     */
    async recoverSetupGuids(): Promise<boolean> {
        try {
            const sqlite = await getSqliteDb();
            const result = await sqlite.getFirstAsync<any>('SELECT uguid, gguid FROM users LIMIT 1');
            
            if (result && result.uguid) {
                await AsyncStorage.setItem('temp_setup_uguid', result.uguid);
                await AsyncStorage.setItem('temp_setup_gguid', result.gguid);
                return true;
            }
            
            await this.seedData();
            return true;
        } catch (e) {
            console.error("Critical Recovery Failure:", e);
            return false;
        }
    }

    public async getDb() {
        await this.initialize();
        return await getSqliteDb();
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
            console.log("DB Service: Seeding placeholder data...");
            const sqlite = await getSqliteDb(); 
            
            await sqlite.execAsync('PRAGMA foreign_keys = OFF;');

            const uguid = Crypto.randomUUID();
            const gguid = Crypto.randomUUID();

            // 1. Create Default Group
            await sqlite.runAsync(
                `INSERT INTO groups (gguid, owner_uguid, name, createdBy, lastModifiedBy) 
                 VALUES (?, ?, ?, ?, ?)`,
                [gguid, uguid, 'My Family', uguid, uguid]
            );

            // 2. Create Default User
            await sqlite.runAsync(
                `INSERT INTO users (uguid, gguid, firstName, lastName, email, role, createdBy, lastModifiedBy) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [uguid, gguid, 'New', 'User', 'welcome@localhost.local', 'owner', uguid, uguid]
            );

            // 3. Mock Routine: Meditation
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

            // 4. Mock Routine: Hydration
            const rguid2 = Crypto.randomUUID();
            await sqlite.runAsync(
                `INSERT INTO routines (rguid, uguid, gguid, name, duration, createdBy, lastModifiedBy) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [rguid2, uguid, gguid, 'Hydration / Water', 15, uguid, uguid]
            );

            await sqlite.runAsync(
                `INSERT INTO routine_schedules (sguid, rguid, type, startDate, startTime, frequencyHours, maxOccurrences, createdBy, lastModifiedBy) 
                 VALUES (?, ?, 'daily', '2026-01-01', '12:00', 4, 5, ?, ?)`,
                [Crypto.randomUUID(), rguid2, uguid, uguid]
            );

            // 5. Static Exception (Grave)
            await sqlite.runAsync(
                `INSERT INTO routine_exceptions (reguid, rguid, instanceDate, instanceIndex, createdBy) 
                 VALUES (?, ?, '2026-03-08', 1, ?)`,
                [Crypto.randomUUID(), rguid2, uguid]
            );

            await sqlite.execAsync('PRAGMA foreign_keys = ON;');

            // Sync to storage
            await AsyncStorage.setItem('temp_setup_uguid', uguid);
            await AsyncStorage.setItem('temp_setup_gguid', gguid);
            
            console.log("DB Service: Seeding Complete.");
        } catch (err) {
            console.error("Seeding failed:", err);
        }
    }

    async getLatestUser() {
        try {
            const sqlite = await this.getDb();
            return await sqlite.getFirstAsync<any>('SELECT * FROM users ORDER BY id DESC LIMIT 1');
        } catch (error) {
            return null;
        }
    }

    async updateField(tableName: string, columnName: string, value: any, guidLabel: string, guidValue: string) {
        try {
            const sqlite = await this.getDb();
            const allowedTables = ['users', 'groups', 'routines', 'routine_schedules'];
            if (!allowedTables.includes(tableName)) throw new Error(`Unauthorized table: ${tableName}`);

            const query = `UPDATE ${tableName} SET ${columnName} = ?, lastModifiedBy = ?, lastModifiedDate = CURRENT_TIMESTAMP WHERE ${guidLabel} = ?`;
            const sessionUguid = (await AsyncStorage.getItem('session_uguid')) || 'system';

            await sqlite.runAsync(query, [value, sessionUguid, guidValue]);
            return true;
        } catch (error) {
            console.error(`Update Error:`, error);
            return false;
        }
    }

    async createRoutine(name: string, duration: number, schedule: {
        startTime: string,
        type: string,
        frequencyHours?: number,
        maxOccurrences?: number
    }) {
        const uguid = await AsyncStorage.getItem('session_uguid');
        const gguid = await AsyncStorage.getItem('session_gguid');
        const rguid = Crypto.randomUUID();
        const sguid = Crypto.randomUUID();

        if (!uguid || !gguid) return false;

        try {
            const sqlite = await this.getDb();
            await sqlite.withTransactionAsync(async () => {
                // 1. Insert Header
                await sqlite.runAsync(
                    `INSERT INTO routines (rguid, uguid, gguid, name, duration, createdBy, lastModifiedBy) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [rguid, uguid, gguid, name, duration, uguid, uguid]
                );

                // 2. Insert Schedule
                await sqlite.runAsync(
                    `INSERT INTO routine_schedules (sguid, rguid, type, startDate, startTime, frequencyHours, maxOccurrences, createdBy, lastModifiedBy) 
                    VALUES (?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?)`,
                    [sguid, rguid, schedule.type, schedule.startTime, schedule.frequencyHours || null, schedule.maxOccurrences || 1, uguid, uguid]
                );
            });
            return true;
        } catch (e) {
            console.error("Failed to create routine:", e);
            return false;
        }
    }

    async updateSetupData(firstName: string, lastName: string, email: string, groupName: string) {
        let uguid = await AsyncStorage.getItem('temp_setup_uguid');
        let gguid = await AsyncStorage.getItem('temp_setup_gguid');

        if (!uguid || !gguid) {
            await this.recoverSetupGuids();
            uguid = await AsyncStorage.getItem('temp_setup_uguid');
            gguid = await AsyncStorage.getItem('temp_setup_gguid');
        }

        if (!uguid || !gguid) {
            console.error("Setup failed: Could not resolve GUIDs.");
            return false;
        }

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

            await AsyncStorage.setItem('session_uguid', uguid);
            await AsyncStorage.setItem('session_gguid', gguid);
            return true;
        } catch (e) {
            console.error("Setup update failed at SQL level:", e);
            return false;
        }
    }

    async resetApp() {
        try {
            const sqlite = await getSqliteDb();
            await sqlite.execAsync('PRAGMA foreign_keys = OFF;');
            
            await sqlite.execAsync(`
                DROP TABLE IF EXISTS routine_exceptions;
                DROP TABLE IF EXISTS routine_instances;
                DROP TABLE IF EXISTS routine_schedules;
                DROP TABLE IF EXISTS routines;
                DROP TABLE IF EXISTS users;
                DROP TABLE IF EXISTS groups;
                DROP TABLE IF EXISTS ringtones;
            `);
            
            await sqlite.execAsync('PRAGMA foreign_keys = ON;');
            this.initPromise = null;
            await AsyncStorage.clear(); 
            console.log("DB Service: System Reset Complete.");
            return true;
        } catch (error) {
            console.error("Reset failed:", error);
            return false;
        }
    }
}

export const dbService = new DatabaseService();
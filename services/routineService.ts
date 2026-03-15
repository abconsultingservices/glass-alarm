import { dbService } from './DatabaseService';
import * as Crypto from 'expo-crypto';

/**
 * Composite interface representing the JOIN between Routines and Schedules.
 * Preserves raw UTC strings for the routineEngine to handle correctly.
 */
export interface RoutineWithSchedule {
  rguid: string;
  name: string;
  isEnabled: boolean;
  duration: number;
  // Schedule Data (Strings from SQLite)
  type: string; 
  customDays: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endDate: string | null;
  endTime: string | null;
  frequencyHours: number | null;
  maxOccurrences: number | null;
}

export interface RoutineException {
  routineId: string;
  date: string; 
  instanceIndex: number;
}

export const RoutineService = {
  /**
   * Fetches routines that are valid for a specific ISO date string.
   * Performs UTC string comparison in SQL to filter the lifespan.
   */
  getRoutines: async (targetDateISO: string): Promise<RoutineWithSchedule[]> => {
    try {
      const db = await (dbService as any).getDb(); 
      
      const sql = `
        SELECT 
          r.rguid, 
          r.name, 
          r.isActive as isEnabled, 
          r.duration,
          s.type, 
          s.customDays,
          s.startDate,
          s.startTime, 
          s.endDate,
          s.endTime,
          s.frequencyHours, 
          s.maxOccurrences
        FROM routines r
        JOIN routine_schedules s ON r.rguid = s.rguid
        WHERE r.isActive = 1
          AND s.startDate <= ? 
          AND (s.endDate IS NULL OR s.endDate >= ?)`;

      // Pass targetDateISO twice to satisfy both start and end boundary checks
      const rows = await db.getAllAsync(sql, [targetDateISO, targetDateISO]);
      
      return rows.map((row: any) => ({
        ...row,
        isEnabled: row.isEnabled === 1
      }));
    } catch (e) {
      console.error("RoutineService.getRoutines failed:", e);
      return [];
    }
  },

  /**
   * Fetches exceptions using Expo SQLite
   */
  getExceptions: async (): Promise<RoutineException[]> => {
    try {
      const db = await (dbService as any).getDb();
      return await db.getAllAsync(
        "SELECT rguid as routineId, instanceDate as date, instanceIndex FROM routine_exceptions"
      );
    } catch (e) {
      console.error("RoutineService.getExceptions failed:", e);
      return [];
    }
  },

  /**
   * Toggles the "Bury" state (Exceptions)
   */
  toggleException: async (
    currentExceptions: RoutineException[], 
    routineId: string, 
    date: string, 
    index: number
  ): Promise<RoutineException[]> => {
    try {
      const db = await (dbService as any).getDb();
      // Use 'system' fallback if uguid isn't set yet
      const sessionUguid = 'system'; 
      
      const existing = currentExceptions.find(
        ex => ex.routineId === routineId && ex.date === date && ex.instanceIndex === index
      );

      if (existing) {
        await db.runAsync(
          "DELETE FROM routine_exceptions WHERE rguid = ? AND instanceDate = ? AND instanceIndex = ?",
          [routineId, date, index]
        );
      } else {
        await db.runAsync(
          `INSERT INTO routine_exceptions (reguid, rguid, instanceDate, instanceIndex, createdBy) 
           VALUES (?, ?, ?, ?, ?)`,
          [Crypto.randomUUID(), routineId, date, index, sessionUguid]
        );
      }

      return await RoutineService.getExceptions();
    } catch (e) {
      console.error("RoutineService.toggleException failed:", e);
      return currentExceptions;
    }
  }
};
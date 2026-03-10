import { dbService } from './DatabaseService';
import * as Crypto from 'expo-crypto';

export interface Routine {
  id: string; // Maps to rguid
  name: string;
  repeat: string; 
  startTime: Date;
  endTime: Date;
  isEnabled: boolean;
  frequencyHours?: number;
  maxOccurrences?: number;
  instanceIndex?: number;
  isInstanceEnabled?: boolean;
}

export interface RoutineException {
  routineId: string;
  date: string; 
  instanceIndex: number;
}

export const RoutineService = {
  /**
   * Fetches routines using Expo SQLite getAllAsync
   */
  getRoutines: async (): Promise<Routine[]> => {
    try {


      // Use the internal helper from your DatabaseService
      const db = await (dbService as any).getDb(); 
      
      const sql = `
        SELECT 
          r.rguid as id, 
          r.name, 
          r.isActive as isEnabled, 
          r.duration,
          s.type as repeat, 
          s.startTime as timeStr, 
          s.frequencyHours, 
          s.maxOccurrences
        FROM routines r
        JOIN routine_schedules s ON r.rguid = s.rguid
        WHERE r.isActive = 1
      `;
      
      const rows = await db.getAllAsync(sql);
      
      return rows.map((row: any) => {
        const [hours, minutes] = row.timeStr.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(hours, minutes, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + (row.duration || 30));

        return {
          id: row.id,
          name: row.name,
          repeat: row.repeat,
          startTime: startTime,
          endTime: endTime,
          isEnabled: row.isEnabled === 1,
          frequencyHours: row.frequencyHours,
          maxOccurrences: row.maxOccurrences
        };
      });
    } catch (e) {
      console.error("RoutineService.getRoutines failed:", e);
      return [];
    }
  },

  /**
   * Fetches exceptions using Expo SQLite getAllAsync
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
   * Toggles the "Bury" state using Expo SQLite runAsync
   */
  toggleException: async (
    currentExceptions: RoutineException[], 
    routineId: string, 
    date: string, 
    index: number
  ): Promise<RoutineException[]> => {
    try {
      const db = await (dbService as any).getDb();
      const sessionUguid = localStorage.getItem('session_uguid') || 'system';
      
      const existing = currentExceptions.find(
        ex => ex.routineId === routineId && ex.date === date && ex.instanceIndex === index
      );

      if (existing) {
        // RESTORE: Use runAsync for Expo SQLite
        await db.runAsync(
          "DELETE FROM routine_exceptions WHERE rguid = ? AND instanceDate = ? AND instanceIndex = ?",
          [routineId, date, index]
        );
      } else {
        // BURY: Use runAsync for Expo SQLite
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
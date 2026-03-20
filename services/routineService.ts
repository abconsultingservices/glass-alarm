import { dbService } from './DatabaseService';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
   * Fetches routines that are valid for a specific ISO date string and the current group.
   */
  getRoutines: async (targetDateISO: string): Promise<RoutineWithSchedule[]> => {
    try {
      const db = await (dbService as any).getDb(); 
      
      const gguid = (await AsyncStorage.getItem('session_gguid')) || (await AsyncStorage.getItem('temp_setup_gguid'));
      
      if (!gguid) {
        console.warn("RoutineService.getRoutines: No gguid found.");
        return [];
      }

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
          AND r.gguid = ?
          AND s.startDate <= ? 
          AND (s.endDate IS NULL OR s.endDate >= ?)`;

      const rows = await db.getAllAsync(sql, [gguid, targetDateISO, targetDateISO]);
      
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
   * Fetches exceptions for a specific date and the current group.
   */
  getExceptions: async (targetDateISO: string): Promise<RoutineException[]> => {
    try {
      const db = await (dbService as any).getDb();
      
      const gguid = (await AsyncStorage.getItem('session_gguid')) || (await AsyncStorage.getItem('temp_setup_gguid'));

      if (!gguid) return [];

      return await db.getAllAsync(
        "SELECT rguid as routineId, instanceDate as date, instanceIndex FROM routine_exceptions WHERE instanceDate = ? AND gguid = ?",
        [targetDateISO, gguid]
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
      
      let uguid = await AsyncStorage.getItem('session_uguid');
      let gguid = await AsyncStorage.getItem('session_gguid');

      if (!uguid || !gguid) {
          uguid = await AsyncStorage.getItem('temp_setup_uguid');
          gguid = await AsyncStorage.getItem('temp_setup_gguid');
      }
      
      if (!uguid || !gguid) {
          console.warn("RoutineService: No session or temp GUIDs found.");
          return currentExceptions;
      }
      
      const existing = currentExceptions.find(
        ex => ex.routineId === routineId && ex.date === date && ex.instanceIndex === index
      );

      if (existing) {
        await db.runAsync(
          "DELETE FROM routine_exceptions WHERE rguid = ? AND instanceDate = ? AND instanceIndex = ? AND gguid = ?",
          [routineId, date, index, gguid]
        );
      } else {
        // UPDATED: lastModifiedBy and lastModifiedDate match createdBy and createDate for new records
        await db.runAsync(
          `INSERT INTO routine_exceptions (
            reguid, rguid, uguid, gguid, instanceDate, instanceIndex, 
            createdBy, createDate, lastModifiedBy, lastModifiedDate
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)`,
          [Crypto.randomUUID(), routineId, uguid, gguid, date, index, uguid, uguid]
        );
      }

      return await RoutineService.getExceptions(date);
    } catch (e) {
      console.error("RoutineService.toggleException failed:", e);
      return currentExceptions;
    }
  }
};
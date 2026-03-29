import { dbService } from './DatabaseService';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RoutineWithSchedule {
  rguid: string;
  name: string;
  isEnabled: boolean; // Maps to isActive in DB
  duration: number;
  type: string; 
  customDays: string;
  startDate: string; 
  startTime: string; 
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
   * Helper to get current session identifiers
   */
  getGuids: async () => {
    let uguid = await AsyncStorage.getItem('session_uguid');
    let gguid = await AsyncStorage.getItem('session_gguid');
    if (!uguid || !gguid) {
      uguid = await AsyncStorage.getItem('temp_setup_uguid');
      gguid = await AsyncStorage.getItem('temp_setup_gguid');
    }
    return { uguid, gguid };
  },

  /**
   * Fetches routines valid for a specific date
   */
  getRoutines: async (targetDateISO: string): Promise<RoutineWithSchedule[]> => {
    try {
      const db = await (dbService as any).getDb();
      const { gguid } = await RoutineService.getGuids();
      
      if (!gguid) return [];

      const sql = `
        SELECT 
          r.rguid, r.name, r.isActive as isEnabled, r.duration,
          s.type, s.customDays, s.startDate, s.startTime, 
          s.endDate, s.endTime, s.frequencyHours, s.maxOccurrences
        FROM routines r
        JOIN routine_schedules s ON r.rguid = s.rguid
        WHERE r.isActive = 1
          AND r.gguid = ?
          AND s.startDate <= ? 
          AND (s.endDate IS NULL OR s.endDate >= ?)`;

      const rows = await db.getAllAsync(sql, [gguid, targetDateISO, targetDateISO]);
      return rows.map((row: any) => ({ ...row, isEnabled: row.isEnabled === 1 }));
    } catch (e) {
      console.error("RoutineService.getRoutines failed:", e);
      return [];
    }
  },

  /**
   * Fetches a single routine and its tasks for the ViewTasks screen
   */
  getRoutineById: async (rguid: string): Promise<any | null> => {
    try {
      const db = await (dbService as any).getDb();
      const routine = await db.getFirstAsync(
        `SELECT rguid, name, duration, isActive FROM routines WHERE rguid = ?`, 
        [rguid]
      );
      
      if (!routine) return null;

      const tasks = await db.getAllAsync(
        `SELECT rtguid, text, displayOrder, isComplete FROM routine_tasks WHERE rguid = ? ORDER BY displayOrder ASC`,
        [rguid]
      );

      return {
        ...routine,
        isEnabled: routine.isActive === 1,
        tasks: tasks.map((t: any) => ({
          id: t.rtguid,
          title: t.text, // Mapping schema 'text' to form 'title'
          completed: t.isComplete === 1,
          displayOrder: t.displayOrder
        }))
      };
    } catch (e) {
      console.error("RoutineService.getRoutineById failed:", e);
      return null;
    }
  },

  /**
   * Updates tasks using the schema-defined fields (text, displayOrder, isComplete)
   */
  updateRoutineTasks: async (rguid: string, tasks: any[]): Promise<boolean> => {
    try {
      const db = await (dbService as any).getDb();
      const { uguid, gguid } = await RoutineService.getGuids();
      if (!uguid || !gguid) return false;

      await db.withTransactionAsync(async () => {
        await db.runAsync(`DELETE FROM routine_tasks WHERE rguid = ?`, [rguid]);

        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          await db.runAsync(
            `INSERT INTO routine_tasks (
              rtguid, rguid, uguid, gguid, text, displayOrder, isComplete, 
              createdBy, createDate, lastModifiedBy, lastModifiedDate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)`,
            [
              task.id || Crypto.randomUUID(), 
              rguid, uguid, gguid, 
              task.title || task.text, // Ensure we catch whichever key the form is using
              i, 
              task.completed ? 1 : 0, 
              uguid, uguid
            ]
          );
        }
      });
      return true;
    } catch (e) {
      console.error("RoutineService.updateRoutineTasks failed:", e);
      return false;
    }
  },

  getExceptions: async (targetDateISO: string): Promise<RoutineException[]> => {
    try {
      const db = await (dbService as any).getDb();
      const { gguid } = await RoutineService.getGuids();
      if (!gguid) return [];

      return await db.getAllAsync(
        "SELECT rguid as routineId, instanceDate as date, instanceIndex FROM routine_exceptions WHERE instanceDate = ? AND gguid = ?",
        [targetDateISO, gguid]
      );
    } catch (e) {
      return [];
    }
  },

  toggleException: async (currentExceptions: RoutineException[], routineId: string, date: string, index: number): Promise<RoutineException[]> => {
    try {
      const db = await (dbService as any).getDb();
      const { uguid, gguid } = await RoutineService.getGuids();
      if (!uguid || !gguid) return currentExceptions;
      
      const existing = currentExceptions.find(ex => ex.routineId === routineId && ex.date === date && ex.instanceIndex === index);

      if (existing) {
        await db.runAsync(
          "DELETE FROM routine_exceptions WHERE rguid = ? AND instanceDate = ? AND instanceIndex = ? AND gguid = ?",
          [routineId, date, index, gguid]
        );
      } else {
        await db.runAsync(
          `INSERT INTO routine_exceptions (reguid, rguid, uguid, gguid, instanceDate, instanceIndex, createdBy, createDate) 
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [Crypto.randomUUID(), routineId, uguid, gguid, date, index, uguid]
        );
      }
      return await RoutineService.getExceptions(date);
    } catch (e) {
      return currentExceptions;
    }
  }
};
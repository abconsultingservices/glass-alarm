import { dbService } from './DatabaseService';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RoutineWithSchedule {
  rguid: string;
  name: string;
  isEnabled: boolean; 
  duration: number;
  type: string; 
  customDays: string;
  startDate: string; 
  startTime: string; 
  endDate: string | null;
  endTime: string | null;
  frequencyHours: number | null;
  maxOccurrences: number | null;
  // Added for state maintenance
  tasks?: any[]; 
}

export interface RoutineException {
  routineId: string;
  date: string; 
  instanceIndex: number;
}

export const RoutineService = {
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
   * UPDATED: Fetches routines AND hydrates them with task completion data 
   * for the specific date provided.
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
      
      // We return the raw rows. The "Expansion" into instances (1), (2), (3) 
      // happens in the useMemo of your CalendarMonthView.tsx.
      // However, to get the counts right, we need a way to fetch counts PER INDEX.
      return rows.map((row: any) => ({ ...row, isEnabled: row.isEnabled === 1 }));
    } catch (e) {
      console.error("RoutineService.getRoutines failed:", e);
      return [];
    }
  },

  /**
   * NEW: A dedicated helper for the Month View's useMemo to get counts PER INSTANCE
   */
  getInstanceTaskCount: async (rguid: string, date: string, instanceIndex: number): Promise<{completed: number, total: number}> => {
    try {
      const db = await (dbService as any).getDb();
      
      // Get total tasks
      const totalRow = await db.getFirstAsync(
        `SELECT COUNT(*) as total FROM routine_tasks WHERE rguid = ?`, [rguid]
      );

      // Get completed tasks for THIS specific index
      const completedRow = await db.getFirstAsync(`
        SELECT COUNT(ti.tiguid) as completed
        FROM task_instances ti
        JOIN routine_instances ri ON ti.riguid = ri.riguid
        WHERE ri.rguid = ? AND ri.instanceDate = ? AND ri.instanceIndex = ? AND ti.isComplete = 1`,
        [rguid, date, instanceIndex]
      );

      return {
        total: totalRow?.total || 0,
        completed: completedRow?.completed || 0
      };
    } catch (e) {
      return { total: 0, completed: 0 };
    }
  },

  /**
   * Helper: Fetches tasks for a specific date (used by getRoutines)
   */
  getTasksForDate: async (rguid: string, date: string): Promise<any[]> => {
    const db = await (dbService as any).getDb();
    const sql = `
      SELECT 
        rt.rtguid as id, rt.text as title, rt.displayOrder,
        COALESCE(ti.isComplete, 0) as completed
      FROM routine_tasks rt
      LEFT JOIN routine_instances ri ON ri.rguid = rt.rguid AND ri.instanceDate = ?
      LEFT JOIN task_instances ti ON ti.riguid = ri.riguid AND ti.rtguid = rt.rtguid
      WHERE rt.rguid = ?
      ORDER BY rt.displayOrder ASC`;
    const rows = await db.getAllAsync(sql, [date, rguid]);
    return rows.map((r: any) => ({ ...r, completed: r.completed === 1 }));
  },

  /**
   * Fetches routine + tasks for a SPECIFIC instance (e.g., the 2nd time a routine runs today)
   */
  getRoutineById: async (rguid: string, date: string, instanceIndex: number = 0): Promise<any | null> => {
    try {
      const db = await (dbService as any).getDb();
      const routine = await db.getFirstAsync(
        `SELECT rguid, name, duration, isActive FROM routines WHERE rguid = ?`, 
        [rguid]
      );
      
      if (!routine) return null;

      const tasksSql = `
        SELECT 
          rt.rtguid, rt.text, rt.displayOrder, 
          COALESCE(ti.isComplete, 0) as isCompleteInstance
        FROM routine_tasks rt
        LEFT JOIN routine_instances ri ON ri.rguid = rt.rguid 
          AND ri.instanceDate = ? 
          AND ri.instanceIndex = ?
        LEFT JOIN task_instances ti ON ti.riguid = ri.riguid 
          AND ti.rtguid = rt.rtguid
        WHERE rt.rguid = ?
        ORDER BY rt.displayOrder ASC`;

      const tasks = await db.getAllAsync(tasksSql, [date, instanceIndex, rguid]);

      return {
        ...routine,
        isEnabled: routine.isActive === 1,
        tasks: tasks.map((t: any) => ({
          id: t.rtguid,
          title: t.text,
          completed: t.isCompleteInstance === 1,
          displayOrder: t.displayOrder
        }))
      };
    } catch (e) {
      console.error("RoutineService.getRoutineById failed:", e);
      return null;
    }
  },

  /**
   * Updates task completion and ensures NEW tasks are added to the master template
   */
  updateTaskInstances: async (rguid: string, date: string, instanceIndex: number, tasks: any[]): Promise<boolean> => {
    try {
      const db = await (dbService as any).getDb();
      const { uguid, gguid } = await RoutineService.getGuids();
      if (!uguid || !gguid) return false;

      await db.withTransactionAsync(async () => {
        // 1. Ensure the "Header" (Routine Instance) exists
        let ri = await db.getFirstAsync(
          `SELECT riguid FROM routine_instances WHERE rguid = ? AND instanceDate = ? AND instanceIndex = ?`,
          [rguid, date, instanceIndex]
        );

        let riguid = ri?.riguid;

        if (!riguid) {
          riguid = Crypto.randomUUID();
          await db.runAsync(
            `INSERT INTO routine_instances (riguid, rguid, uguid, gguid, instanceDate, instanceIndex, startTime, createdBy)
             VALUES (?, ?, ?, ?, ?, ?, '00:00', ?)`,
            [riguid, rguid, uguid, gguid, date, instanceIndex, uguid]
          );
        }

        // 2. Sync Tasks to Master Template (routine_tasks)
        // If a task was added in the UI, it must exist in routine_tasks for the JOIN to work later
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          const taskId = task.id || task.rtguid;

          const existsInMaster = await db.getFirstAsync(
            `SELECT rtguid FROM routine_tasks WHERE rtguid = ?`, [taskId]
          );

          if (!existsInMaster) {
            await db.runAsync(
              `INSERT INTO routine_tasks (
                rtguid, rguid, uguid, gguid, text, displayOrder, createdBy, lastModifiedBy
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [taskId, rguid, uguid, gguid, task.title || '', i, uguid, uguid]
            );
          } else {
            // Update the display order and text in case it changed
            await db.runAsync(
              `UPDATE routine_tasks SET text = ?, displayOrder = ?, lastModifiedBy = ? WHERE rtguid = ?`,
              [task.title || '', i, uguid, taskId]
            );
          }
        }

        // 3. Clear and update the Instance completion states
        await db.runAsync(`DELETE FROM task_instances WHERE riguid = ?`, [riguid]);

        for (const task of tasks) {
          const taskId = task.id || task.rtguid;
          await db.runAsync(
            `INSERT INTO task_instances (tiguid, riguid, rtguid, uguid, isComplete)
             VALUES (?, ?, ?, ?, ?)`,
            [Crypto.randomUUID(), riguid, taskId, uguid, task.completed ? 1 : 0]
          );
        }
      });
      return true;
    } catch (e) {
      console.error("Failed to save task instances and master tasks:", e);
      return false;
    }
  },

  getExceptions: async (targetDateISO: string): Promise<RoutineException[]> => {
    try {
      const db = await (dbService as any).getDb();
      const { gguid } = await RoutineService.getGuids();
      if (!gguid) return [];

      const rows = await db.getAllAsync(
        "SELECT rguid as routineId, instanceDate as date, instanceIndex FROM routine_exceptions WHERE instanceDate = ? AND gguid = ?",
        [targetDateISO, gguid]
      );
      return rows;
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
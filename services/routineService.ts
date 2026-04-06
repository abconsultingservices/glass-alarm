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
        WHERE r.gguid = ?
          AND s.startDate <= ? 
          AND (s.endDate IS NULL OR s.endDate >= ?)`;

      const rows = await db.getAllAsync(sql, [gguid, targetDateISO, targetDateISO]);
      return rows.map((row: any) => ({ ...row, isEnabled: row.isEnabled === 1 }));
    } catch (e) {
      console.error("RoutineService.getRoutines failed:", e);
      return [];
    }
  },

  getInstanceTaskCount: async (rguid: string, date: string, instanceIndex: number): Promise<{completed: number, total: number}> => {
    try {
      const db = await (dbService as any).getDb();
      
      const res = await db.getFirstAsync(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN ti.isComplete = 1 THEN 1 ELSE 0 END) as completed
        FROM task_instances ti
        JOIN routine_instances ri ON ti.riguid = ri.riguid
        WHERE ri.rguid = ? AND ri.instanceDate = ? AND ri.instanceIndex = ?`,
        [rguid, date, instanceIndex]
      );

      if (!res || res.total === 0) {
          const master = await db.getFirstAsync(`SELECT COUNT(*) as total FROM routine_tasks WHERE rguid = ? AND isInstanceTask = 0`, [rguid]);
          return { total: master?.total || 0, completed: 0 };
      }

      return { total: res.total || 0, completed: res.completed || 0 };
    } catch (e) {
      return { total: 0, completed: 0 };
    }
  },

  getRoutineById: async (rguid: string, date: string, instanceIndex: number = 0): Promise<any | null> => {
    try {
        const db = await (dbService as any).getDb();
        
        const routine = await db.getFirstAsync(
            `SELECT 
                r.rguid, r.name, r.duration, r.isActive,
                s.type, s.startDate, s.startTime, s.endDate, s.customDays,
                s.frequencyHours, s.maxOccurrences
             FROM routines r
             LEFT JOIN routine_schedules s ON r.rguid = s.rguid
             WHERE r.rguid = ?`, 
            [rguid]
        );

        if (!routine) return null;

        const divergedTasks = await db.getAllAsync(`
            SELECT 
                ti.rtguid as id, 
                ti.text as title, 
                ti.displayOrder, 
                ti.isComplete as completed
            FROM task_instances ti
            JOIN routine_instances ri ON ti.riguid = ri.riguid
            WHERE ri.rguid = ? AND ri.instanceDate = ? AND ri.instanceIndex = ?
            ORDER BY ti.displayOrder ASC`, 
            [rguid, date, instanceIndex]
        );

        const tasks = divergedTasks.length > 0 
            ? divergedTasks.map((t: any) => ({ ...t, completed: !!t.completed }))
            : await db.getAllAsync(
                `SELECT rtguid as id, text as title, displayOrder, 0 as completed 
                 FROM routine_tasks 
                 WHERE rguid = ? AND isInstanceTask = 0
                 ORDER BY displayOrder ASC`,
                [rguid]
            );

        return {
            ...routine,
            isEnabled: routine.isActive === 1,
            schedules: [{
                type: routine.type || 'daily',
                startDate: routine.startDate,
                startTime: routine.startTime,
                endDate: routine.endDate,
                customDays: routine.customDays || '[]',
                frequencyHours: routine.frequencyHours ? String(routine.frequencyHours) : '',
                maxOccurrences: routine.maxOccurrences ? String(routine.maxOccurrences) : '1'
            }],
            tasks
        };
    } catch (e) {
        console.error("getRoutineById failed:", e);
        return null;
    }
  },

  updateTaskInstances: async (
        rguid: string, 
        date: string, 
        instanceIndex: number, 
        tasks: any[], 
        scope: 'instance' | 'day' | 'future' = 'instance'
    ): Promise<boolean> => {
        try {
            const db = await (dbService as any).getDb();
            const { uguid, gguid } = await RoutineService.getGuids();
            if (!uguid || !gguid) return false;

            await db.withTransactionAsync(async () => {
                // --- 1. Master Template Update (Restricted to 'future' scope) ---
                if (scope === 'future') {
                    await db.runAsync(`DELETE FROM routine_tasks WHERE rguid = ? AND isInstanceTask = 0`, [rguid]);
                    for (let i = 0; i < tasks.length; i++) {
                        const t = tasks[i];
                        const txt = t.title || t.text || '';
                        if (!txt.trim()) continue;
                        await db.runAsync(
                            `INSERT INTO routine_tasks (rtguid, rguid, uguid, gguid, text, displayOrder, isInstanceTask, createdBy, lastModifiedBy)
                            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
                            [t.id || Crypto.randomUUID(), rguid, uguid, gguid, txt, i, uguid, uguid]
                        );
                    }
                }

                // --- 2. Determine target instances to reconcile ---
                let targets: { date: string, idx: number }[] = [];
                if (scope === 'instance') {
                    targets = [{ date, idx: instanceIndex }];
                } else if (scope === 'day') {
                    const sched = await db.getFirstAsync(`SELECT maxOccurrences FROM routine_schedules WHERE rguid = ?`, [rguid]);
                    const max = sched?.maxOccurrences || 1;
                    for (let i = 0; i < max; i++) targets.push({ date, idx: i });
                } else {
                    // SCOPE: FUTURE -> Only target existing instances from the selected point forward.
                    // This prevents the reconciler from deleting/modifying past task_instances.
                    const rows = await db.getAllAsync(
                        `SELECT instanceDate as date, instanceIndex as idx FROM routine_instances 
                        WHERE rguid = ? 
                        AND (instanceDate > ? OR (instanceDate = ? AND instanceIndex >= ?))`,
                        [rguid, date, date, instanceIndex]
                    );
                    targets = rows.length > 0 ? rows : [{ date, idx: instanceIndex }];
                }

                // --- 3. Synchronize task instances ---
                for (const target of targets) {
                    const isOrigin = (target.date === date && target.idx === instanceIndex);

                    let ri = await db.getFirstAsync(
                        `SELECT riguid FROM routine_instances WHERE rguid = ? AND instanceDate = ? AND instanceIndex = ?`,
                        [rguid, target.date, target.idx]
                    );

                    let riguid = ri?.riguid;
                    if (!riguid) {
                        // Create instance only for relevant upcoming days we are forcing sync on
                        riguid = Crypto.randomUUID();
                        await db.runAsync(
                            `INSERT INTO routine_instances (riguid, rguid, uguid, gguid, instanceDate, instanceIndex, startTime, createdBy)
                            VALUES (?, ?, ?, ?, ?, ?, '00:00', ?)`,
                            [riguid, rguid, uguid, gguid, target.date, target.idx, uguid]
                        );
                    }

                    // Map existing completions by text to preserve status across master changes
                    const completions = new Set();
                    const currentDone = await db.getAllAsync(
                        `SELECT text FROM task_instances WHERE riguid = ? AND isComplete = 1`, [riguid]
                    );
                    currentDone.forEach((s: any) => completions.add(s.text));

                    await db.runAsync(`DELETE FROM task_instances WHERE riguid = ?`, [riguid]);
                    
                    for (let i = 0; i < tasks.length; i++) {
                        const t = tasks[i];
                        const txt = t.title || t.text || '';
                        if (!txt.trim()) continue;

                        // If origin, use the current UI state. If future instance, use the text-match from before.
                        const isDone = isOrigin ? (t.completed ? 1 : 0) : (completions.has(txt) ? 1 : 0);

                        await db.runAsync(
                            `INSERT INTO task_instances (tiguid, riguid, rtguid, uguid, text, displayOrder, isComplete, createdBy, lastModifiedBy)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [Crypto.randomUUID(), riguid, t.id || Crypto.randomUUID(), uguid, txt, i, isDone, uguid, uguid]
                        );
                    }
                }
            });
            return true;
        } catch (e) {
            console.error("RoutineService.updateTaskInstances failed:", e);
            return false;
        }
    },

  updateRoutineWithSync: async (
    rguid: string, 
    name: string, 
    duration: number, 
    schedules: any[], 
    tasks: any[],
    targetDate: string
  ): Promise<boolean> => {
    try {
      const db = await (dbService as any).getDb();
      const { uguid, gguid } = await RoutineService.getGuids();
      if (!uguid || !gguid) return false;

      await db.withTransactionAsync(async () => {
        // Update Routine Metadata
        await db.runAsync(
          `UPDATE routines SET name = ?, duration = ?, lastModifiedBy = ?, lastModifiedDate = CURRENT_TIMESTAMP WHERE rguid = ?`,
          [name, duration, uguid, rguid]
        );

        // Update Routine Schedules
        await db.runAsync(`DELETE FROM routine_schedules WHERE rguid = ?`, [rguid]);
        for (const s of schedules) {
          const sguid = Crypto.randomUUID();
          const freq = s.frequencyHours ? parseInt(s.frequencyHours.toString()) : null;
          const maxOcc = s.maxOccurrences ? parseInt(s.maxOccurrences.toString()) : 1;
          await db.runAsync(
            `INSERT INTO routine_schedules (sguid, rguid, uguid, gguid, type, customDays, startDate, startTime, endDate, frequencyHours, maxOccurrences, createdBy, lastModifiedBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sguid, rguid, uguid, gguid, s.type, s.customDays || null, s.startDate, s.startTime, s.endDate || null, freq, maxOcc, uguid, uguid]
          );
        }

        // Trigger smart task sync (Scope: future, start from 0 index of target date)
        await RoutineService.updateTaskInstances(rguid, targetDate, 0, tasks, 'future');
      });
      return true;
    } catch (e) {
      console.error("RoutineService.updateRoutineWithSync failed:", e);
      return false;
    }
  },

  getExceptions: async (targetDateISO: string): Promise<RoutineException[]> => {
    try {
      const db = await (dbService as any).getDb();
      const { gguid } = await RoutineService.getGuids();
      if (!gguid) return [];

      const rows = await db.getAllAsync(
        "SELECT rguid as routineId, instanceDate as date, instanceIndex as idx FROM routine_exceptions WHERE instanceDate = ? AND gguid = ?",
        [targetDateISO, gguid]
      );
      return rows.map((r: any) => ({ 
        routineId: r.routineId, 
        date: r.date, 
        instanceIndex: r.idx 
      }));
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
  },

  getAllRoutines: async (): Promise<RoutineWithSchedule[]> => {
    try {
      const db = await (dbService as any).getDb();
      const { gguid } = await RoutineService.getGuids();
      if (!gguid) return [];

      const sql = `
        SELECT 
          r.rguid, r.name, r.isActive as isEnabled, r.duration,
          s.type, s.customDays, s.startTime, s.endTime,
          (SELECT COUNT(*) FROM routine_tasks rt WHERE rt.rguid = r.rguid AND rt.isInstanceTask = 0) as taskCount
        FROM routines r
        LEFT JOIN routine_schedules s ON r.rguid = s.rguid
        WHERE r.gguid = ?
        ORDER BY r.name ASC`;

      const rows = await db.getAllAsync(sql, [gguid]);
      
      return rows.map((row: any) => ({ 
        ...row, 
        isEnabled: row.isEnabled === 1 
      }));
    } catch (e) {
      console.error("RoutineService.getAllRoutines failed:", e);
      return [];
    }
  },

  deleteRoutine: async (rguid: string): Promise<boolean> => {
    try {
      const db = await (dbService as any).getDb();
      await db.withTransactionAsync(async () => {
        await db.runAsync(`DELETE FROM routine_schedules WHERE rguid = ?`, [rguid]);
        await db.runAsync(`DELETE FROM routine_tasks WHERE rguid = ?`, [rguid]);
        await db.runAsync(`DELETE FROM routine_instances WHERE rguid = ?`, [rguid]);
        await db.runAsync(`DELETE FROM routines WHERE rguid = ?`, [rguid]);
      });
      return true;
    } catch (e) {
      console.error("RoutineService.deleteRoutine failed:", e);
      return false;
    }
  },

  updateRoutineStatus: async (rguid: string, isEnabled: boolean): Promise<boolean> => {
    try {
      const db = await (dbService as any).getDb();
      await db.runAsync(
        `UPDATE routines SET isActive = ?, lastModifiedDate = CURRENT_TIMESTAMP WHERE rguid = ?`,
        [isEnabled ? 1 : 0, rguid]
      );
      return true;
    } catch (e) {
      return false;
    }
  },

  updateRoutine: async (
    rguid: string, 
    name: string, 
    duration: number, 
    schedules: any[], 
    tasks: any[]
  ): Promise<boolean> => {
    // Legacy support: redirects to the smarter sync logic with today's anchor
    return RoutineService.updateRoutineWithSync(rguid, name, duration, schedules, tasks, new Date().toISOString().split('T')[0]);
  }
};
import { Routine } from '../services/routineService';

/**
 * Checks if a routine should appear on a specific calendar date.
 */
export const shouldShowRoutineOnDate = (routine: Routine, date: Date): boolean => {
  if (!routine.isEnabled) return false;

  const routineStart = new Date(routine.startTime);
  
  // 1. Reset times to midnight for comparison
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  
  const startLimit = new Date(routineStart);
  startLimit.setHours(0, 0, 0, 0);

  // Don't show routines before they were created/scheduled
  if (compareDate < startLimit) return false;

  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  switch (routine.repeat?.toLowerCase()) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'custom':
      // Future logic for specific days (e.g., Mon/Wed/Fri)
      return true;
    default:
      return false;
  }
};
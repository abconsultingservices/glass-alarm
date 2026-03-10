import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Routine {
  id: string;
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

export const MOCK_ROUTINES: Routine[] = [
  {
    id: '1',
    name: 'Morning Meditation',
    repeat: 'Daily',
    startTime: new Date(2026, 2, 8, 7, 0),
    endTime: new Date(2026, 2, 8, 7, 30),
    isEnabled: true,
  },
  {
    id: '2',
    name: 'Hydration / Water',
    repeat: 'Daily',
    startTime: new Date(2026, 2, 8, 9, 0),
    endTime: new Date(2026, 2, 8, 9, 15),
    isEnabled: true,
    frequencyHours: 4,
    maxOccurrences: 3, 
  },
];

const INITIAL_EXCEPTIONS: RoutineException[] = [
  { routineId: '2', date: '2026-03-08', instanceIndex: 1 }
];

const EXCEPTIONS_KEY = 'routine_exceptions';

export const RoutineService = {
  // Get all routines (This is where SQLite SELECT will go)
  getRoutines: async (): Promise<Routine[]> => {
    return MOCK_ROUTINES; 
  },

  // Get all exceptions
  getExceptions: async (): Promise<RoutineException[]> => {
    const saved = await AsyncStorage.getItem(EXCEPTIONS_KEY);
    if (saved) return JSON.parse(saved);
    
    // Fallback to our static exception if storage is empty
    return INITIAL_EXCEPTIONS;
  },

  // Toggle an exception (Bury/Restore)
  toggleException: async (
    exceptions: RoutineException[], 
    routineId: string, 
    date: string, 
    index: number
  ): Promise<RoutineException[]> => {
    const existingIdx = exceptions.findIndex(
      ex => ex.routineId === routineId && ex.date === date && ex.instanceIndex === index
    );

    let newExceptions;
    if (existingIdx > -1) {
      newExceptions = exceptions.filter((_, i) => i !== existingIdx);
    } else {
      newExceptions = [...exceptions, { routineId, date, instanceIndex: index }];
    }

    await AsyncStorage.setItem(EXCEPTIONS_KEY, JSON.stringify(newExceptions));
    return newExceptions;
  }
};
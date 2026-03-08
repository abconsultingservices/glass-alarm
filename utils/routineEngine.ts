// utils/routineEngine.ts

export const shouldShowRoutineOnDate = (routine: Routine, date: Date) => {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon", "Tue" etc
  
  switch (routine.repeat) {
    case 'Daily':
      return true;
    case 'Weekdays':
      return date.getDay() !== 0 && date.getDay() !== 6;
    case 'Weekends':
      return date.getDay() === 0 || date.getDay() === 6;
    default:
      // Handle "Mon, Wed, Fri" style strings
      return routine.repeat.includes(dayName);
  }
};
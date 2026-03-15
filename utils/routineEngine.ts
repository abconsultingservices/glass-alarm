import { RoutineWithSchedule } from '../services/routineService';

export const shouldShowRoutineOnDate = (item: RoutineWithSchedule, targetDateISO: string): boolean => {
  if (!item.isEnabled) return false;

  // Since SQL already filtered the start/end dates, we just check frequency
  const dateObj = new Date(`${targetDateISO}T00:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay(); 
  const type = item.type.toLowerCase();

  let doShow = null;

  switch (type) {
    case 'daily': 
      doShow = true;
      break;
    case 'weekdays': 
      doShow = dayOfWeek >= 1 && dayOfWeek <= 5;
      break;
    case 'weekends': 
      doShow = dayOfWeek === 0 || dayOfWeek === 6
      break;
    case 'custom':

      console.log(item);  
      if (!item.customDays)
      {
        doShow=false;
        break;
      }
      try {
        // Expecting a string like "[1,3,5]"
        const activeDays = JSON.parse(item.customDays);
        doShow = activeDays.includes(dayOfWeek);
      } catch (e) {
        // Fallback for comma separated "1,3,5"
        console.log('Error:' + item.customDays);
        doShow = item.customDays.split(',').map(Number).includes(dayOfWeek);
      }
      break;
    default: 
      doShow = false;
  }

  console.log('Do Show:' + doShow);
  return doShow;
};
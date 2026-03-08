import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, Platform, FlatList, Switch, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowRoutineOnDate } from '../../utils/routineEngine';

interface Routine {
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

interface RoutineException {
  routineId: string;
  date: string; 
  instanceIndex: number;
}

const MOCK_ROUTINES: Routine[] = [
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

const STATIC_EXCEPTIONS: RoutineException[] = [
  { routineId: '2', date: '2026-03-08', instanceIndex: 1 }
];

export default function CalendarMonthView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles();
  const systemToday = new Date().toISOString().split('T')[0];
  
  const [currentMonth, setCurrentMonth] = useState(systemToday);
  const [selectedDate, setSelectedDate] = useState(systemToday);
  const [routines, setRoutines] = useState(MOCK_ROUTINES);
  const [exceptions, setExceptions] = useState(STATIC_EXCEPTIONS);

  const isWeb = Platform.OS === 'web';

  const displayRoutines = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const expandedList: Routine[] = [];

    routines.forEach(routine => {
      if (shouldShowRoutineOnDate(routine, targetDate)) {
        const isMultiHit = routine.frequencyHours && routine.maxOccurrences;
        const count = isMultiHit ? routine.maxOccurrences! : 1;

        for (let i = 0; i < count; i++) {
          const hasException = exceptions.some(ex => 
            ex.routineId === routine.id && 
            ex.date === selectedDate && 
            ex.instanceIndex === i
          );

          const start = new Date(routine.startTime);
          const end = new Date(routine.endTime);
          
          if (isMultiHit) {
            start.setHours(routine.startTime.getHours() + (i * routine.frequencyHours!));
            end.setHours(routine.endTime.getHours() + (i * routine.frequencyHours!));
          }

          expandedList.push({
            ...routine,
            id: isMultiHit ? `${routine.id}-v${i}` : routine.id,
            startTime: start,
            endTime: end,
            instanceIndex: i,
            isInstanceEnabled: routine.isEnabled && !hasException 
          });
        }
      }
    });

    return expandedList.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [selectedDate, routines, exceptions]);

  useEffect(() => {
    const hydrate = async () => {
      const saved = await AsyncStorage.getItem('calendar_last_date');
      if (saved) {
        setCurrentMonth(saved);
        setSelectedDate(saved);
      }
      await AsyncStorage.setItem('calendar_zoom_level', 'month');
    };
    hydrate();
  }, []);

  const { monthName, year } = useMemo(() => {
    const [y, m, d] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 1, d || 1);
    return { monthName: date.toLocaleString('default', { month: 'long' }), year: y };
  }, [currentMonth]);

  const handleToggleInstance = (item: Routine) => {
    const rId = item.id.split('-v')[0];
    const idx = item.instanceIndex ?? 0;
    const existingIdx = exceptions.findIndex(ex => ex.routineId === rId && ex.date === selectedDate && ex.instanceIndex === idx);
    if (existingIdx > -1) {
      setExceptions(prev => prev.filter((_, i) => i !== existingIdx));
    } else {
      setExceptions(prev => [...prev, { routineId: rId, date: selectedDate, instanceIndex: idx }]);
    }
  };

  const goToYear = async () => {
    await AsyncStorage.setItem('calendar_last_date', currentMonth);
    await AsyncStorage.setItem('calendar_zoom_level', 'year');
    router.push('/calendar/year');
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <View style={[styles.setupContainer, { flex: 1, paddingTop: insets.top }]}>
      <View style={styles.calendarHeaderRow}>
        <Pressable onPress={goToYear} style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17 }}>{year}</Text>
        </Pressable>
        <View style={styles.glassPill}>
          <Pressable onPress={() => router.replace('/settings')} style={({ pressed }) => getPressedStyle(pressed)}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.pillDivider} />
          <Ionicons name="search-outline" size={22} color={colors.text} />
          <View style={styles.pillDivider} />
          <Ionicons name="add" size={26} color={colors.text} />
        </View>
      </View>

      <View style={{ paddingHorizontal: 5 }}>
        <Calendar
          key={`${currentMonth}-${colors.isDark}`}
          current={currentMonth}
          enableSwipeMonths={true}
          hideArrows={true}
          onMonthChange={(m) => {
            setCurrentMonth(m.dateString);
            AsyncStorage.setItem('calendar_last_date', m.dateString);
          }}
          onDayPress={(day) => {
            setSelectedDate(day.dateString);
            AsyncStorage.setItem('calendar_last_date', day.dateString);
          }}
          markedDates={{ [selectedDate]: { selected: true, selectedColor: colors.text, selectedTextColor: colors.background } }}
          
          renderHeader={() => (
            <View style={localStyles.customHeaderContainer}>
              {isWeb && (
                <Pressable onPress={() => {
                  const d = new Date(currentMonth);
                  d.setMonth(d.getMonth() - 1);
                  setCurrentMonth(d.toISOString().split('T')[0]);
                }}>
                  <Ionicons name="chevron-back" size={24} color={colors.text} />
                </Pressable>
              )}
              
              <Text style={[styles.largeMonthLabel, { color: colors.text, marginHorizontal: 20, fontSize: isWeb ? 32 : 24 }]}>
                {monthName} {isWeb ? '' : year}
              </Text>

              {isWeb && (
                <Pressable onPress={() => {
                  const d = new Date(currentMonth);
                  d.setMonth(d.getMonth() + 1);
                  setCurrentMonth(d.toISOString().split('T')[0]);
                }}>
                  <Ionicons name="chevron-forward" size={24} color={colors.text} />
                </Pressable>
              )}
            </View>
          )}

          theme={{
            calendarBackground: 'transparent',
            dayTextColor: colors.text,
            todayTextColor: colors.error,
            monthTextColor: 'transparent',
            textSectionTitleColor: colors.mutedText,
            selectedDayBackgroundColor: colors.text,
            selectedDayTextColor: colors.background,
            'stylesheet.calendar.header': {
              header: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, alignItems: 'center' }
            }
          }}
        />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16, marginTop: 15 }}>
        <FlatList
          data={displayRoutines}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.insetGroup, { marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ flex: 1, opacity: item.isInstanceEnabled ? 1 : 0.4 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: colors.mutedText, fontSize: 13, marginTop: 2 }}>{item.repeat}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', marginRight: 12, opacity: item.isInstanceEnabled ? 1 : 0.4 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{formatTime(item.startTime)}</Text>
                <Text style={{ color: colors.mutedText, fontSize: 12 }}>to {formatTime(item.endTime)}</Text>
              </View>
              <Switch
                value={item.isInstanceEnabled} 
                trackColor={{ false: colors.glassBorder, true: colors.success }}
                thumbColor={'#FFF'}
                onValueChange={() => handleToggleInstance(item)}
              />
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: colors.mutedText, textAlign: 'center', marginTop: 20 }}>No Routines</Text>}
        />
      </View>

      <View style={[styles.calendarFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable onPress={() => { setSelectedDate(systemToday); setCurrentMonth(systemToday); }} style={styles.glassPill}>
          <Text style={{ color: colors.text, fontSize: 17, paddingHorizontal: 20 }}>Today</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/routines')} style={[styles.glassPill, { flexDirection: 'row', gap: 8, paddingHorizontal: 15 }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17 }}>Routines</Text>
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  customHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  }
});
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Platform, FlatList, Switch, StyleSheet, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars'; 
import { useRouter, useFocusEffect } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowRoutineOnDate } from '../../utils/routineEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const isWeb = Platform.OS === 'web';

  // --- REFRESH LOGIC (The Active Approach) ---
  const getLocalTodayString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    // Returns current system date in YYYY-MM-DD format based on local time
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };
  
  const [systemToday, setSystemToday] = useState(getLocalTodayString());
  const [currentMonth, setCurrentMonth] = useState(systemToday);
  const [selectedDate, setSelectedDate] = useState(systemToday);
  const [routines, setRoutines] = useState(MOCK_ROUTINES);
  const [exceptions, setExceptions] = useState(STATIC_EXCEPTIONS);

  let touchY = 0; 

  // --- SYNC ON FOCUS (Route Changes) ---
  useFocusEffect(
    useCallback(() => {
      // Re-check local system time whenever this screen is focused
      const freshToday = getLocalTodayString();
      setSystemToday(freshToday);

      const syncState = async () => {
        const savedDate = await AsyncStorage.getItem('calendar_last_date');
        if (savedDate) {
          setSelectedDate(savedDate);
          setCurrentMonth(savedDate.substring(0, 7) + '-01');
        }
      };
      syncState();
    }, [])
  );

  useEffect(() => {
    const hydrate = async () => {
      await AsyncStorage.setItem('calendar_zoom_level', 'month');
    };
    hydrate();
  }, []);

  // --- DRILL DOWN & ACTIVE DATE CHECK ---
  const handleDatePress = (dateString: string) => {
    // Perform an active check of system time on every date interaction
    const freshToday = getLocalTodayString();
    setSystemToday(freshToday);

    if (selectedDate === dateString) {
      router.push('/calendar/day');
    } else {
      setSelectedDate(dateString);
      const targetMonth = dateString.substring(0, 7) + '-01';
      if (currentMonth.substring(0, 7) !== dateString.substring(0, 7)) {
        setCurrentMonth(targetMonth);
      }
      AsyncStorage.setItem('calendar_last_date', dateString);
    }
  };

  const handleMonthChange = (direction: 'next' | 'prev') => {
    const d = new Date(currentMonth + 'T00:00:00');
    d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    
    const nextMonthISO = d.toISOString().split('T')[0];
    const nextMonthYearMonth = nextMonthISO.substring(0, 7);
    const freshToday = getLocalTodayString(); // Check time during month swipe
    const todayYearMonth = freshToday.substring(0, 7);

    let targetSelection = nextMonthYearMonth === todayYearMonth ? freshToday : `${nextMonthYearMonth}-01`;

    setSystemToday(freshToday);
    setCurrentMonth(nextMonthISO);
    setSelectedDate(targetSelection);
    AsyncStorage.setItem('calendar_last_date', targetSelection);
  };

  const onTouchStart = (e: any) => { touchY = e.nativeEvent.pageY; };
  const onTouchEnd = (e: any) => {
    if (isWeb) return;
    const distance = touchY - e.nativeEvent.pageY;
    if (distance > 50) handleMonthChange('next'); 
    if (distance < -50) handleMonthChange('prev'); 
  };

  const markedDates = useMemo(() => {
    const isTodaySelected = selectedDate === systemToday;
    return {
      [systemToday]: {
        selected: isTodaySelected,
        selectedColor: colors.error,
        selectedTextColor: '#FFFFFF',
        textColor: colors.error,
      },
      ...(selectedDate !== systemToday && {
        [selectedDate]: {
          selected: true,
          selectedColor: colors.text,
          selectedTextColor: colors.background,
        }
      })
    };
  }, [selectedDate, systemToday, colors]);

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
            ex.routineId === routine.id && ex.date === selectedDate && ex.instanceIndex === i
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

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <View style={[styles.setupContainer, { flex: 1, paddingTop: insets.top }]}>
      <View style={styles.calendarHeaderRow}>
        <Pressable onPress={() => router.push('/calendar/year')} style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17 }}>{year}</Text>
        </Pressable>
        <View style={styles.glassPill}>
          <Pressable onPress={() => router.replace('/settings')} style={getPressedStyle}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.pillDivider} />
          <Ionicons name="search-outline" size={22} color={colors.text} />
          <View style={styles.pillDivider} />
          <Ionicons name="add" size={26} color={colors.text} />
        </View>
      </View>

      {!isWeb && (
        <View style={localStyles.iosHeaderContainer}>
          <Text style={[styles.largeMonthLabel, { color: colors.text, textAlign: 'left' }]}>
            {monthName}
          </Text>
        </View>
      )}

      <View onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ paddingHorizontal: 5 }}>
        <Calendar
          key={`${currentMonth}-${colors.isDark}-${systemToday}`} 
          current={currentMonth}
          hideArrows={true}
          renderHeader={() => (
            isWeb ? (
              <View style={localStyles.webHeaderJustified}>
                <Pressable onPress={() => handleMonthChange('prev')}>
                  <Ionicons name="chevron-back" size={20} color={colors.text} />
                </Pressable>
                <Text style={[localStyles.webMonthLabel, { color: colors.text }]}>{monthName}</Text>
                <Pressable onPress={() => handleMonthChange('next')}>
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </Pressable>
              </View>
            ) : null
          )}
          onDayPress={(day) => handleDatePress(day.dateString)}
          markedDates={markedDates}
          theme={{
            calendarBackground: 'transparent',
            dayTextColor: colors.text,
            todayTextColor: colors.error,
            textSectionTitleColor: colors.mutedText,
            selectedDayBackgroundColor: colors.text, 
            selectedDayTextColor: colors.background,
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
        <Pressable 
          onPress={() => {
            const freshToday = getLocalTodayString();
            handleDatePress(freshToday); // Force system time check on "Today" click
          }} 
          style={styles.glassPill}
        >
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
  iosHeaderContainer: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 5,
  },
  webHeaderJustified: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: SCREEN_WIDTH - 40, 
    marginHorizontal: -15, 
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  webMonthLabel: {
    fontSize: 18,
    fontWeight: '700',
  }
});
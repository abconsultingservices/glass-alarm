import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Pressable, Platform, FlatList, Switch, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowRoutineOnDate } from '../../utils/routineEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data and interfaces consistent with Month view
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

export default function DayView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles();
  const isWeb = Platform.OS === 'web';

  // Localized Today logic from Month view
  const systemToday = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState(systemToday);
  let touchX = 0;

  useEffect(() => {
    const hydrate = async () => {
      const saved = await AsyncStorage.getItem('calendar_last_date');
      if (saved) setSelectedDate(saved);
    };
    hydrate();
  }, []);

  // --- WEEK STRIP LOGIC ---
  const weekDays = useMemo(() => {
    const current = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = current.getDay(); // 0 (Sun) to 6 (Sat)
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      d.setDate(current.getDate() - dayOfWeek + i);
      const iso = d.toISOString().split('T')[0];
      days.push({
        date: iso,
        dayNum: d.getDate(),
        dayLabel: d.toLocaleDateString('default', { weekday: 'narrow' }),
        isToday: iso === systemToday,
        isSelected: iso === selectedDate
      });
    }
    return days;
  }, [selectedDate, systemToday]);

  const changeWeek = (direction: 'next' | 'prev') => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    const nextDate = current.toISOString().split('T')[0];
    setSelectedDate(nextDate);
    AsyncStorage.setItem('calendar_last_date', nextDate);
  };

  const onTouchStart = (e: any) => { touchX = e.nativeEvent.pageX; };
  const onTouchEnd = (e: any) => {
    if (isWeb) return;
    const distance = touchX - e.nativeEvent.pageX;
    if (distance > 50) changeWeek('next');
    if (distance < -50) changeWeek('prev');
  };

  const displayRoutines = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    const expandedList: Routine[] = [];

    MOCK_ROUTINES.forEach(routine => {
      if (shouldShowRoutineOnDate(routine, targetDate)) {
        const isMultiHit = routine.frequencyHours && routine.maxOccurrences;
        const count = isMultiHit ? routine.maxOccurrences! : 1;
        for (let i = 0; i < count; i++) {
          const start = new Date(routine.startTime);
          const end = new Date(routine.endTime);
          if (isMultiHit) {
            start.setHours(routine.startTime.getHours() + (i * routine.frequencyHours!));
            end.setHours(routine.endTime.getHours() + (i * routine.frequencyHours!));
          }
          expandedList.push({ ...routine, id: isMultiHit ? `${routine.id}-v${i}` : routine.id, startTime: start, endTime: end, isInstanceEnabled: true });
        }
      }
    });
    return expandedList.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [selectedDate]);

  const { monthName, fullDisplayDate } = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return {
      monthName: d.toLocaleString('default', { month: 'long' }),
      fullDisplayDate: d.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    };
  }, [selectedDate]);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <View style={[styles.setupContainer, { flex: 1, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.calendarHeaderRow}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17 }}>{monthName}</Text>
        </Pressable>
        <View style={styles.glassPill}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
          <View style={styles.pillDivider} />
          <Ionicons name="search-outline" size={22} color={colors.text} />
          <View style={styles.pillDivider} />
          <Ionicons name="add" size={26} color={colors.text} />
        </View>
      </View>

      {/* Week Strip */}
      <View onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={localStyles.weekContainer}>
        {isWeb && (
          <Pressable onPress={() => changeWeek('prev')} style={{ paddingRight: 10 }}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        )}
        
        <View style={localStyles.weekStrip}>
          {weekDays.map((day) => (
            <Pressable key={day.date} onPress={() => setSelectedDate(day.date)} style={localStyles.dayItem}>
              <Text style={[localStyles.dayLabel, { color: colors.mutedText }]}>{day.dayLabel}</Text>
              <View style={[
                localStyles.dayCircle,
                day.isSelected && { backgroundColor: day.isToday ? colors.error : colors.text }
              ]}>
                <Text style={[
                  localStyles.dayNum,
                  { color: day.isSelected ? colors.background : (day.isToday ? colors.error : colors.text) }
                ]}>
                  {day.dayNum}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {isWeb && (
          <Pressable onPress={() => changeWeek('next')} style={{ paddingLeft: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        )}
      </View>

      {/* Selected Date Label & Native Line */}
      <View style={localStyles.dateLabelContainer}>
        <Text style={[localStyles.dateText, { color: colors.text }]}>{fullDisplayDate}</Text>
        <View style={[localStyles.nativeLine, { backgroundColor: colors.glassBorder }]} />
      </View>

      {/* Routine List */}
      <FlatList
        data={displayRoutines}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10 }}
        renderItem={({ item }) => (
          <View style={[styles.insetGroup, { marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: colors.mutedText, fontSize: 13, marginTop: 2 }}>{item.repeat}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{formatTime(item.startTime)}</Text>
              <Text style={{ color: colors.mutedText, fontSize: 12 }}>to {formatTime(item.endTime)}</Text>
            </View>
            <Switch value={item.isInstanceEnabled} trackColor={{ false: colors.glassBorder, true: colors.success }} thumbColor={'#FFF'} />
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: colors.mutedText, textAlign: 'center', marginTop: 40 }}>No Routines Scheduled</Text>}
      />

      {/* Footer */}
      <View style={[styles.calendarFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable onPress={() => setSelectedDate(systemToday)} style={styles.glassPill}>
          <Text style={{ color: colors.text, fontSize: 17, paddingHorizontal: 20 }}>Today</Text>
        </Pressable>
        <Pressable style={[styles.glassPill, { flexDirection: 'row', gap: 8, paddingHorizontal: 15 }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17 }}>Routines</Text>
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  weekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  dayItem: {
    alignItems: 'center',
    width: (SCREEN_WIDTH - 80) / 7,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNum: {
    fontSize: 17,
    fontWeight: '400',
  },
  dateLabelContainer: {
    marginTop: 15,
    paddingHorizontal: 16,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  nativeLine: {
    height: 1,
    width: '100%',
  }
});
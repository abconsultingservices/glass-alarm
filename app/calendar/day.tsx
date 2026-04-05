import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, Pressable, Platform, FlatList, Switch, StyleSheet, Dimensions, Animated, DeviceEventEmitter } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowRoutineOnDate } from '../../utils/routineEngine';
import { RoutineService, RoutineWithSchedule, RoutineException } from '../../services/routineService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DayView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles();
  const isWeb = Platform.OS === 'web';

  const scrollY = useRef(new Animated.Value(0)).current;

  const glassOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [.9, 0.65],
    extrapolate: 'clamp',
  });

  const getLocalTodayString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [systemToday, setSystemToday] = useState(getLocalTodayString());
  const [selectedDate, setSelectedDate] = useState(systemToday);
  const [routines, setRoutines] = useState<any[]>([]); // Changed to any for instanceStats
  const [exceptions, setExceptions] = useState<RoutineException[]>([]);
  let touchX = 0;

  // --- DATA SYNC (Synced with Month View Logic) ---
  const syncState = useCallback(async () => {
    try {
      const freshToday = getLocalTodayString();
      setSystemToday(freshToday);

      const savedDate = await AsyncStorage.getItem('calendar_last_date');
      const activeDate = savedDate || freshToday;
      
      if (savedDate) setSelectedDate(activeDate);

      const [fetchedRoutines, fetchedExceptions] = await Promise.all([
        RoutineService.getRoutines(activeDate),
        RoutineService.getExceptions(activeDate)
      ]);

      // --- HYDRATION: Fetch specific counts for each instance ---
      const hydrated = await Promise.all(fetchedRoutines.map(async (r) => {
          const occurrences = r.maxOccurrences || 1;
          const instanceData = [];
          
          for (let i = 0; i < occurrences; i++) {
              const counts = await (RoutineService as any).getInstanceTaskCount(r.rguid, activeDate, i);
              instanceData.push({ index: i, ...counts });
          }
          
          return { ...r, instanceStats: instanceData };
      }));
      
      setRoutines(hydrated);
      setExceptions(fetchedExceptions);
    } catch (e) {
      console.error("DayView Sync failed", e);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      syncState();
      const sub = DeviceEventEmitter.addListener('ROUTINE_UPDATE_SUCCESS', syncState);
      return () => sub.remove();
    }, [syncState])
  );

  const updateDate = async (date: string) => {
    setSystemToday(getLocalTodayString()); 
    setSelectedDate(date);
    await AsyncStorage.setItem('calendar_last_date', date);
  };

  const handleToggleInstance = async (item: any) => {
    const rId = item.originalId || item.rguid;
    const idx = item.instanceIndex ?? 0;
    const nextEx = await RoutineService.toggleException(exceptions, rId, selectedDate, idx);
    setExceptions(nextEx);
  };

  // --- WEEK STRIP LOGIC ---
  const weekDays = useMemo(() => {
    const current = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = current.getDay(); 
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
    updateDate(current.toISOString().split('T')[0]);
  };

  const onTouchStart = (e: any) => { touchX = e.nativeEvent.pageX; };
  const onTouchEnd = (e: any) => {
    if (isWeb) return;
    const distance = touchX - e.nativeEvent.pageX;
    if (distance > 50) changeWeek('next');
    if (distance < -50) changeWeek('prev');
  };

  const displayRoutines = useMemo(() => {
    const [y, mon, d] = selectedDate.split('-').map(Number);
    const expandedList: any[] = [];

    routines.forEach(routine => {
      if (shouldShowRoutineOnDate(routine, selectedDate)) {
        const count = routine.maxOccurrences || 1;
        for (let i = 0; i < count; i++) {
          const hasException = exceptions.some(ex => 
            ex.routineId === routine.rguid && ex.date === selectedDate && ex.instanceIndex === i
          );

          const [h, min] = routine.startTime.split(':').map(Number);
          const start = new Date(y, mon - 1, d, h, min, 0, 0);
          
          if (i > 0 && routine.frequencyHours) {
            start.setHours(start.getHours() + (i * routine.frequencyHours));
          }

          const end = new Date(start.getTime() + (routine.duration || 30) * 60000);

          // Fetch stats from hydrated state
          const stats = routine.instanceStats?.find((s: any) => s.index === i);
          const totalTasks = stats?.total || 0;
          const completedTasks = stats?.completed || 0;

          expandedList.push({ 
            ...routine, 
            id: `${routine.rguid}-idx-${i}`, 
            originalId: routine.rguid,
            startTime: start, 
            endTime: end, 
            instanceIndex: i,
            isInstanceEnabled: routine.isEnabled && !hasException,
            progressLabel: totalTasks > 0 ? `${completedTasks}/${totalTasks}` : null,
            isComplete: totalTasks > 0 && completedTasks === totalTasks
          });
        }
      }
    });
    return expandedList.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [selectedDate, routines, exceptions]);

  const { monthName, fullDisplayDate } = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    return {
      monthName: d.toLocaleString('default', { month: 'long' }),
      fullDisplayDate: d.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    };
  }, [selectedDate]);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.calendarHeaderRow, { paddingTop: insets.top, height: 54 + insets.top }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [getPressedStyle(pressed), styles.headerPill]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17 }}>{monthName}</Text>
        </Pressable>
        <View style={styles.headerPill}>
            <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => getPressedStyle(pressed)}>
                <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.pillDivider} />
            <Ionicons name="search-outline" size={22} color={colors.text} />
            <View style={styles.pillDivider} />
            <Pressable onPress={() => router.push({
                    pathname: '/calendar/add-routine',
                    params: { selectedDate: selectedDate }
                })} 
                style={({ pressed }) => getPressedStyle(pressed)}>
                <Ionicons name="add" size={26} color={colors.text} />
            </Pressable>
        </View>
      </View>

      <View>
        <View onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={localStyles.weekContainer}>
          <View style={localStyles.weekStrip}>
            {weekDays.map((day) => (
              <Pressable key={day.date} onPress={() => updateDate(day.date)} style={localStyles.dayItem}>
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
        </View>

        <View style={localStyles.dateLabelContainer}>
          <Text style={[localStyles.dateText, { color: colors.text }]}>{fullDisplayDate}</Text>
          <View style={[localStyles.nativeLine, { backgroundColor: colors.glassBorder }]} />
        </View>
      </View>

      <FlatList
        data={displayRoutines}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, paddingTop: 10 }}
        renderItem={({ item }) => (
          <View style={[styles.insetGroup, { marginBottom: 12, padding: 0, overflow: 'hidden' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <Pressable 
                onPress={() => router.push({
                  pathname: '/calendar/view-tasks',
                  params: { 
                    routineId: item.originalId, 
                    date: selectedDate,
                    instanceIndex: item.instanceIndex.toString(),
                    name: item.name 
                  }
                })}
                style={({ pressed }) => [getPressedStyle(pressed), { flex: 1, flexDirection: 'row', alignItems: 'center' }]}
              >
                <View style={{ flex: 1, opacity: item.isInstanceEnabled ? 1 : 0.4 }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ color: colors.mutedText, fontSize: 13 }}>
                        {item.type || 'daily'} {item.maxOccurrences > 1 ? `(${item.instanceIndex + 1})` : ''}
                    </Text>
                    {item.progressLabel && (
                        <>
                            <Text style={{ color: colors.mutedText, fontSize: 13, marginHorizontal: 6 }}>•</Text>
                            <Text style={{ 
                                color: item.isComplete ? colors.success : colors.mutedText, 
                                fontSize: 13, 
                                fontWeight: '600' 
                            }}>
                                {item.progressLabel} Tasks
                            </Text>
                        </>
                    )}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: 12, opacity: item.isInstanceEnabled ? 1 : 0.4 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500' }}>{formatTime(item.startTime)}</Text>
                  <Text style={{ color: colors.mutedText, fontSize: 12 }}>to {formatTime(item.endTime)}</Text>
                </View>
              </Pressable>
              
              <Switch
                value={item.isInstanceEnabled} 
                trackColor={{ false: colors.glassBorder, true: colors.success }}
                thumbColor={'#FFF'}
                onValueChange={() => handleToggleInstance(item)}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: colors.mutedText, textAlign: 'center', marginTop: 40 }}>No Routines Scheduled</Text>}
      />

      <View style={[
        localStyles.floatingFooter, 
        { bottom: insets.bottom > 0 ? insets.bottom - 16 : 4 }
      ]}>
        <Pressable 
          onPress={() => updateDate(getLocalTodayString())} 
          style={({ pressed }) => [getPressedStyle(pressed), { width: 110, height: 44 }]}
        >
          <Animated.View style={[
            StyleSheet.absoluteFill, 
            { 
              backgroundColor: colors.glassBackground, 
              borderRadius: 30, 
              opacity: glassOpacity, 
              borderWidth: 1,
              borderColor: colors.glassBorderElevated,
              ...Platform.select({ web: { backdropFilter: 'blur(20px) saturate(180%)' } })
            }
          ]} />
          <View style={localStyles.pillContentCenter}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Today</Text>
          </View>
        </Pressable>

        <Pressable 
          onPress={() => router.push('/calendar/routines')} 
          style={({ pressed }) => [getPressedStyle(pressed), { minWidth: 130, height: 44 }]}
        >
          <Animated.View style={[
            StyleSheet.absoluteFill, 
            { 
              backgroundColor: colors.glassBackground, 
              borderRadius: 30, 
              opacity: glassOpacity, 
              borderWidth: 1,
              borderColor: colors.glassBorderElevated,
              ...Platform.select({ web: { backdropFilter: 'blur(20px) saturate(180%)' } })
            }
          ]} />
          <View style={[localStyles.pillContentCenter, { flexDirection: 'row', gap: 8, paddingHorizontal: 16 }]}>
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Routines</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  weekContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 15 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', flex: 1 },
  dayItem: { alignItems: 'center', width: (SCREEN_WIDTH - 80) / 7 },
  dayLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayNum: { fontSize: 17, fontWeight: '400' },
  dateLabelContainer: { marginTop: 15, paddingHorizontal: 16 },
  dateText: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  nativeLine: { height: 1, width: '100%' },
  floatingFooter: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  pillContentCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  }
});
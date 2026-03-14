import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, Platform, FlatList, Switch, StyleSheet, Dimensions, Animated } from 'react-native';
import { Calendar } from 'react-native-calendars'; 
import { useRouter, useFocusEffect } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldShowRoutineOnDate } from '../../utils/routineEngine';
import { RoutineService, Routine, RoutineException } from '../../services/routineService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarMonthView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles();
  const isWeb = Platform.OS === 'web';

  // --- GLASS ANIMATION SETUP ---
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
  const [currentMonth, setCurrentMonth] = useState(systemToday);
  const [selectedDate, setSelectedDate] = useState(systemToday);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exceptions, setExceptions] = useState<RoutineException[]>([]);

  let touchY = 0; 

  useFocusEffect(
    useCallback(() => {
      const freshToday = getLocalTodayString();
      setSystemToday(freshToday);

      const syncState = async () => {
        const [savedDate, fetchedRoutines, fetchedExceptions] = await Promise.all([
          AsyncStorage.getItem('calendar_last_date'),
          RoutineService.getRoutines(),
          RoutineService.getExceptions()
        ]);

        if (savedDate) {
          setSelectedDate(savedDate);
          setCurrentMonth(savedDate.substring(0, 7) + '-01');
        }
        setRoutines(fetchedRoutines);
        setExceptions(fetchedExceptions);
      };
      syncState();
    }, [])
  );

  const handleDatePress = (dateString: string) => {
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
    const freshToday = getLocalTodayString(); 
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

  const handleToggleInstance = async (item: any) => {
    const rId = item.originalId || item.id; 
    const idx = item.instanceIndex ?? 0;
    const nextEx = await RoutineService.toggleException(exceptions, rId, selectedDate, idx);
    setExceptions(nextEx);
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
    const expandedList: any[] = [];

    routines.forEach(routine => {
      if (shouldShowRoutineOnDate(routine, targetDate)) {
        const count = routine.maxOccurrences || 1;
        for (let i = 0; i < count; i++) {
          const hasException = exceptions.some(ex => 
            ex.routineId === routine.id && ex.date === selectedDate && ex.instanceIndex === i
          );
          
          const baseStart = routine.startTime ? new Date(routine.startTime) : new Date();
          const baseEnd = routine.endTime ? new Date(routine.endTime) : new Date();
          
          const start = new Date(baseStart);
          const end = new Date(baseEnd);
          
          if (i > 0 && routine.frequencyHours) {
            start.setHours(start.getHours() + (i * routine.frequencyHours));
            end.setHours(end.getHours() + (i * routine.frequencyHours));
          }

          expandedList.push({ 
            ...routine, 
            id: `${routine.id}-idx-${i}`, 
            originalId: routine.id,
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

  const { monthName, yearLabel } = useMemo(() => {
    const [y, m, d] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 1, d || 1);
    return { 
      monthName: date.toLocaleString('default', { month: 'long' }), 
      yearLabel: y 
    };
  }, [currentMonth]);

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* --- TOP FIXED HEADER --- */}
      <View style={[styles.calendarHeaderRow, { paddingTop: insets.top, height: 54 + insets.top}]}>
        <Pressable onPress={() => router.push('/calendar/year')} style={({ pressed }) => [getPressedStyle(pressed), styles.headerPill]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17 }}>{yearLabel}</Text>
        </Pressable>
        <View style={styles.headerPill}>
            <Pressable onPress={() => router.push('/settings')} style={({ pressed }) => getPressedStyle(pressed)}>
                <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.pillDivider} />
            <Ionicons name="search-outline" size={22} color={colors.text} />
            <View style={styles.pillDivider} />
            <Pressable onPress={() => router.push('/calendar/add-routine')} style={({ pressed }) => getPressedStyle(pressed)}>
                <Ionicons name="add" size={26} color={colors.text} />
            </Pressable>
        </View>
      </View>

      {/* --- FIXED CALENDAR SECTION (Out of FlatList) --- */}
      <View onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {!isWeb && (
          <View style={localStyles.iosHeaderContainer}>
            <Text style={styles.largeMonthLabel}>{monthName}</Text>
          </View>
        )}
        <Calendar
          key={`${currentMonth}-${colors.isDark}-${systemToday}`}
          current={currentMonth}
          hideArrows={true}
          renderHeader={() => (
            isWeb ? (
              <View style={localStyles.webHeaderJustified}>
                <Pressable onPress={() => handleMonthChange('prev')}><Ionicons name="chevron-back" size={20} color={colors.text} /></Pressable>
                <Text style={[localStyles.webMonthLabel, { color: colors.text }]}>{monthName}</Text>
                <Pressable onPress={() => handleMonthChange('next')}><Ionicons name="chevron-forward" size={20} color={colors.text} /></Pressable>
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
            'stylesheet.calendar.main': {
                container: { paddingLeft: 0, paddingRight: 0, backgroundColor: 'transparent' }
            }
          }}
        />
      </View>

      {/* --- SCROLLABLE ROUTINES SECTION --- */}
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
          <View style={[styles.insetGroup, { marginBottom: 12, padding: 16, flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ flex: 1, opacity: item.isInstanceEnabled ? 1 : 0.4 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: colors.mutedText, fontSize: 13, marginTop: 2 }}>{item.repeat || 'daily'}</Text>
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

      {/* --- FLOATING ACTION LAYER --- */}
      <Animated.View style={[
        localStyles.floatingFooter, 
        { 
            bottom: insets.bottom > 0 ? insets.bottom-16 : 4, 
            opacity: glassOpacity 
        }
      ]}>
        <Pressable 
          onPress={() => handleDatePress(getLocalTodayString())} 
          style={({ pressed }) => [
            styles.glassPill, 
            getPressedStyle(pressed), 
            { 
              backgroundColor: colors.glassBackground, 
              paddingHorizontal: 24, 
              height: 44,
              // Web-specific backdrop blur fallback
              ...Platform.select({
                web: { backdropFilter: 'blur(20px) saturate(180%)' }
              })
            }
          ]}
        >
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Today</Text>
        </Pressable>

        <Pressable 
          onPress={() => router.push('/routines')} 
          style={({ pressed }) => [
            styles.glassPill, 
            getPressedStyle(pressed), 
            { 
              backgroundColor: colors.glassBackground, 
              flexDirection: 'row', 
              gap: 8, 
              paddingHorizontal: 20, 
              height: 44,
              ...Platform.select({
                web: { backdropFilter: 'blur(20px) saturate(180%)' }
              })
            }
          ]}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Routines</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  iosHeaderContainer: { paddingHorizontal: 4, marginTop: 10, marginBottom: 5 },
  webHeaderJustified: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: SCREEN_WIDTH - 40, marginHorizontal: -15, paddingHorizontal: 10, marginVertical: 10 },
  webMonthLabel: { fontSize: 18, fontWeight: '700' },
  floatingFooter: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    bottom: 0
  }
});
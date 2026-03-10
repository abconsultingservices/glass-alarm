import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Dimensions, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 3;

const YEAR_LABEL_HEIGHT = 64; 
const MONTH_HEIGHT = 125; 
const YEAR_ITEM_HEIGHT = YEAR_LABEL_HEIGHT + (MONTH_HEIGHT * 4) + 20; 

const START_YEAR = 2020;
const END_YEAR = 2030;
const YEARS_DATA = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

// --- MEMOIZED MINI MONTH ---
const MiniMonth = memo(({ year, monthIndex, systemToday, colors, onPress }: any) => {
  const monthDate = new Date(year, monthIndex);
  const monthName = monthDate.toLocaleString('default', { month: 'short' });
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay();

  // Extract system today parts for comparison
  const [sYear, sMonth, sDay] = systemToday.split('-').map(Number);
  const isCurrentMonth = year === sYear && monthIndex === (sMonth - 1);

  return (
    <Pressable 
      onPress={() => onPress(year, monthIndex)}
      style={{ width: COLUMN_WIDTH, height: MONTH_HEIGHT, paddingVertical: 5 }}
    >
      <Text style={[localStyles.monthTitle, { color: isCurrentMonth ? colors.error : colors.text }]}>
        {monthName}
      </Text>
      <View style={localStyles.daysGrid}>
        {Array.from({ length: 42 }).map((_, i) => {
          const dayNum = i - firstDay + 1;
          const isValidDay = dayNum > 0 && dayNum <= daysInMonth;
          const isToday = isCurrentMonth && dayNum === sDay;

          return (
            <View key={i} style={localStyles.dayCell}>
              {isValidDay && (
                <View style={[localStyles.dayIndicator, isToday && { backgroundColor: colors.error }]}>
                  <Text style={[localStyles.dayText, { color: isToday ? '#FFF' : colors.text }]}>
                    {dayNum}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
});

export default function CalendarYearView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const { colors, styles, getPressedStyle } = useThemedStyles();

  // --- REFRESH LOGIC (Active Approach) ---
  const getLocalTodayString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [systemToday, setSystemToday] = useState(getLocalTodayString());
  const currentYearNum = useMemo(() => parseInt(systemToday.split('-')[0]), [systemToday]);

  // --- SYNC ON FOCUS ---
  useFocusEffect(
    useCallback(() => {
      const freshToday = getLocalTodayString();
      setSystemToday(freshToday);

      const syncYearView = async () => {
        await AsyncStorage.setItem('calendar_zoom_level', 'year');
        const savedDate = await AsyncStorage.getItem('calendar_last_date');
        
        let targetYear = parseInt(freshToday.split('-')[0]);
        if (savedDate) {
          const extractedYear = parseInt(savedDate.split('-')[0]);
          if (!isNaN(extractedYear)) targetYear = extractedYear;
        }

        const index = YEARS_DATA.indexOf(targetYear);
        if (index !== -1) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 });
          }, 100);
        }
      };
      syncState();
      syncYearView();
    }, [])
  );

  const syncState = async () => {
     // Placeholder if extra local state sync is needed
  };

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: YEAR_ITEM_HEIGHT,
    offset: YEAR_ITEM_HEIGHT * index,
    index,
  }), []);

  const handleMonthPress = useCallback(async (year: number, monthIndex: number) => {
    // Check time on interaction
    const freshToday = getLocalTodayString();
    setSystemToday(freshToday);

    const monthString = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}-01`;
    await AsyncStorage.setItem('calendar_zoom_level', 'month');
    await AsyncStorage.setItem('calendar_last_date', monthString);
    router.push('/calendar');
  }, [router]);

  const renderYearItem = useCallback(({ item: year }: { item: number }) => (
    <View style={[localStyles.yearSection, { height: YEAR_ITEM_HEIGHT }]}>
      <Text style={[localStyles.yearLabel, { color: year === currentYearNum ? colors.error : colors.text }]}>
        {year}
      </Text>
      <View style={localStyles.monthsContainer}>
        {Array.from({ length: 12 }).map((_, i) => (
          <MiniMonth 
            key={i}
            year={year}
            monthIndex={i}
            systemToday={systemToday}
            colors={colors}
            onPress={handleMonthPress}
          />
        ))}
      </View>
    </View>
  ), [colors, systemToday, currentYearNum, handleMonthPress]);

  return (
    <View style={[styles.setupContainer, { flex: 1, paddingTop: insets.top }]}>
      
      <View style={[styles.calendarHeaderRow, localStyles.floatingHeader, { top: insets.top + 10 }]}>
        <View style={styles.glassPill}>
            <Pressable onPress={() => router.replace('/settings')} style={({ pressed }) => getPressedStyle(pressed)}>
              <Ionicons name="settings-outline" size={22} color={colors.text} />
            </Pressable>
            <View style={styles.pillDivider} />
            <Ionicons name="search-outline" size={22} color={colors.text} />
            <View style={styles.pillDivider} />
            <Pressable 
            onPress={() => router.push('/calendar/add-routine')}
            style={({ pressed }) => getPressedStyle(pressed)}
            >
                <Ionicons name="add" size={26} color={colors.text} />
            </Pressable>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={YEARS_DATA}
        renderItem={renderYearItem}
        keyExtractor={(item) => item.toString()}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, paddingBottom: 150 }}
        removeClippedSubviews={Platform.OS !== 'web'}
        initialNumToRender={2}
        windowSize={3}
        // Force refresh if system date changes
        extraData={systemToday}
      />

      <View style={[styles.calendarFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable 
          onPress={() => {
            const freshToday = getLocalTodayString();
            setSystemToday(freshToday);
            const freshYear = parseInt(freshToday.split('-')[0]);
            const index = YEARS_DATA.indexOf(freshYear);
            if (index !== -1) {
              flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
            }
          }} 
          style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill, { paddingHorizontal: 22 }]}
        >
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>Today</Text>
        </Pressable>

        <Pressable 
          onPress={() => router.push('/routines')} 
          style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill, { paddingHorizontal: 16, flexDirection: 'row', gap: 8 }]}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>Routines</Text>
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  floatingHeader: { position: 'absolute', right: 16, zIndex: 100, justifyContent: 'flex-end' },
  yearSection: { borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 },
  yearLabel: { fontSize: 34, fontWeight: 'bold', height: YEAR_LABEL_HEIGHT, lineHeight: YEAR_LABEL_HEIGHT },
  monthsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  monthTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', height: 16, alignItems: 'center', justifyContent: 'center' },
  dayIndicator: { width: 15, height: 15, borderRadius: 7.5, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 8, fontWeight: '500' }
});
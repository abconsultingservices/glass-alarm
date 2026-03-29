import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Dimensions, Platform, Animated } from 'react-native';
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

const MiniMonth = memo(({ year, monthIndex, systemToday, colors, onPress }: any) => {
  const monthDate = new Date(year, monthIndex);
  const monthName = monthDate.toLocaleString('default', { month: 'short' });
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay();

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

  const scrollY = useRef(new Animated.Value(0)).current;
  const glassOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0.9, 0.65],
    extrapolate: 'clamp',
  });

  const getLocalTodayString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
  };

  const [systemToday, setSystemToday] = useState(getLocalTodayString());
  const currentYearNum = useMemo(() => parseInt(systemToday.split('-')[0]), [systemToday]);

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
      syncYearView();
    }, [])
  );

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: YEAR_ITEM_HEIGHT,
    offset: YEAR_ITEM_HEIGHT * index,
    index,
  }), []);

  const handleMonthPress = useCallback(async (year: number, monthIndex: number) => {
    const freshToday = getLocalTodayString();
    setSystemToday(freshToday);

    // Extract current year/month for comparison
    const [sYear, sMonth] = freshToday.split('-').map(Number);
    const targetMonthIndex = monthIndex + 1;

    let monthString;

    // Check if the month being pressed is the actual current month
    if (year === sYear && targetMonthIndex === sMonth) {
      monthString = freshToday; // Land on today (e.g., March 14)
    } else {
      monthString = `${year}-${targetMonthIndex.toString().padStart(2, '0')}-01`; // Land on the 1st
    }

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      
      {/* --- TOP FIXED HEADER SHIELD --- */}
      <View style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          height: insets.top + 70, 
          backgroundColor: colors.background, 
          zIndex: 100 
      }}>
        <View style={[styles.calendarHeaderRow, localStyles.floatingHeader, { marginTop: insets.top + 10 }]}>
          <View style={styles.headerPill}>
              <Pressable onPress={() => router.replace('/settings')} style={({ pressed }) => getPressedStyle(pressed)}>
                <Ionicons name="settings-outline" size={22} color={colors.text} />
              </Pressable>
              <View style={styles.pillDivider} />
              <Ionicons name="search-outline" size={22} color={colors.text} />
              <View style={styles.pillDivider} />
              <Pressable 
                onPress={async () => {
                    const freshToday = getLocalTodayString();
                    const [tYear] = freshToday.split('-').map(Number);
                    
                    // Fetch the last date user was interacting with (or fresh today)
                    const savedDate = await AsyncStorage.getItem('calendar_last_date');
                    const activeDate = savedDate || freshToday;
                    const [vYear] = activeDate.split('-').map(Number);

                    let targetDate;
                    if (vYear === tYear) {
                        targetDate = freshToday; // Use Today if viewing current year
                    } else {
                        targetDate = `${vYear}-01-01`; // Use Jan 1 if viewing another year
                    }

                    router.push({
                        pathname: '/calendar/add-routine',
                        params: { selectedDate: targetDate }
                    });
                }} 
                style={({ pressed }) => getPressedStyle(pressed)}
              >
                  <Ionicons name="add" size={26} color={colors.text} />
              </Pressable>
          </View>
        </View>
      </View>

      {/* --- SCROLLABLE YEARS --- */}
      <Animated.FlatList
        ref={flatListRef}
        data={YEARS_DATA}
        renderItem={renderYearItem}
        keyExtractor={(item) => item.toString()}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ 
            paddingTop: insets.top + 70,
            paddingHorizontal: 16, 
            paddingBottom: 150 
        }}
        removeClippedSubviews={Platform.OS !== 'web'}
        initialNumToRender={2}
        windowSize={3}
        extraData={systemToday}
      />

      {/* --- FLOATING ACTION FOOTER --- */}
      <View style={[
        localStyles.floatingFooter, 
        { bottom: insets.bottom > 0 ? insets.bottom - 16 : 4 }
      ]}>
        {/* LEFT BUTTON: TODAY */}
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
          style={({ pressed }) => [getPressedStyle(pressed), { width: 110, height: 44 }]}
        >
          <Animated.View style={[
            StyleSheet.absoluteFill, 
            { 
              backgroundColor: colors.glassBackground, 
              borderRadius: 30, 
              opacity: glassOpacity,
              borderWidth: 1,
              borderColor: colors.glassBorderElevated 
            }
          ]} />
          <View style={localStyles.pillContentCenter}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>Today</Text>
          </View>
        </Pressable>

        {/* RIGHT BUTTON: ROUTINES */}
        <Pressable 
          onPress={() => router.push('/routines')} 
          style={({ pressed }) => [getPressedStyle(pressed), { minWidth: 130, height: 44 }]}
        >
          <Animated.View style={[
            StyleSheet.absoluteFill, 
            { 
              backgroundColor: colors.glassBackground, 
              borderRadius: 30, 
              opacity: glassOpacity,
              borderWidth: 1,
              borderColor: colors.glassBorderElevated 
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
  floatingHeader: { position: 'absolute', right: 16, zIndex: 100, justifyContent: 'flex-end' },
  yearSection: { borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 },
  yearLabel: { fontSize: 34, fontWeight: 'bold', height: YEAR_LABEL_HEIGHT, lineHeight: YEAR_LABEL_HEIGHT },
  monthsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  monthTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', height: 16, alignItems: 'center', justifyContent: 'center' },
  dayIndicator: { width: 15, height: 15, borderRadius: 7.5, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 8, fontWeight: '500' },
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
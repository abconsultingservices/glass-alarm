import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CalendarMonthView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles();
  
  // Real-time Today: 2026-03-08
  const systemToday = new Date().toISOString().split('T')[0];
  
  const [currentMonth, setCurrentMonth] = useState(systemToday);
  const [selectedDate, setSelectedDate] = useState(systemToday);

  const isWeb = Platform.OS === 'web';

  const { monthName, year } = useMemo(() => {
    const [y, m, d] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 1, d || 1);
    return {
      monthName: date.toLocaleString('default', { month: 'long' }),
      year: y
    };
  }, [currentMonth]);

  const calendarTheme = useMemo(() => ({
    backgroundColor: 'transparent',
    calendarBackground: 'transparent',
    textSectionTitleColor: colors.mutedText,
    selectedDayBackgroundColor: colors.text, 
    selectedDayTextColor: colors.background, 
    todayTextColor: colors.error, 
    dayTextColor: colors.text,    
    textDisabledColor: colors.placeholderText,
    dotColor: colors.primary,
    monthTextColor: 'transparent', 
    textDayFontSize: 19,
    textDayHeaderFontSize: 12,
    textDayHeaderFontWeight: '600',
    'stylesheet.calendar.header': {
      header: { height: isWeb ? 40 : 0, marginTop: 0, marginBottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
      week: { marginTop: isWeb ? 10 : 0, flexDirection: 'row', justifyContent: 'space-around' }
    },
    'stylesheet.calendar.main': {
      monthView: { marginTop: isWeb ? 0 : -5 }
    }
  }), [colors, isWeb]);

  const handleTodayPress = () => {
    const isShowingCurrentMonth = currentMonth.substring(0, 7) === systemToday.substring(0, 7);
    const isTodaySelected = selectedDate === systemToday;

    if (!isShowingCurrentMonth || !isTodaySelected) {
      // Step 1: Snap to Today and select the date
      setCurrentMonth(systemToday);
      setSelectedDate(systemToday);
    } else {
      // Step 2: If already on Today, zoom into day view
      router.push({
        pathname: '/calendar/day',
        params: { date: systemToday }
      });
    }
  };

  const markedDates = useMemo(() => {
    const marks: any = {
      [selectedDate]: { selected: true }
    };
    if (selectedDate === systemToday) {
      marks[systemToday] = {
        selected: true,
        selectedColor: colors.error, 
        selectedTextColor: '#FFFFFF',
      };
    }
    return marks;
  }, [selectedDate, systemToday, colors.error]);

  return (
    <View style={[styles.setupContainer, { flex: 1, paddingTop: insets.top }]}>
      
      {/* Header Row */}
      <View style={styles.calendarHeaderRow}>
        <Pressable 
          onPress={() => router.push('/calendar/year')}
          style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 17 }}>{year}</Text>
        </Pressable>
        
        <View style={styles.glassPill}>
          <Pressable onPress={() => router.replace('/dashboard')} style={({ pressed }) => getPressedStyle(pressed)}>
            <Ionicons name="grid-outline" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.pillDivider} />
          <Ionicons name="search-outline" size={22} color={colors.text} />
          <View style={styles.pillDivider} />
          <Ionicons name="add" size={26} color={colors.text} />
        </View>
      </View>

      {!isWeb && <Text style={[styles.largeMonthLabel, { color: colors.text }]}>{monthName}</Text>}

      <View style={{ paddingHorizontal: isWeb ? 20 : 5 }}>
        <Calendar
          key={`${currentMonth}-${colors.isDark}`} 
          current={currentMonth}
          theme={calendarTheme}
          enableSwipeMonths
          hideArrows={!isWeb} 
          onMonthChange={(m) => setCurrentMonth(m.dateString)}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          renderHeader={() => (
            isWeb ? <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{monthName}</Text> : null
          )}
          renderArrow={(dir) => (
            <Ionicons name={dir === 'left' ? 'chevron-back' : 'chevron-forward'} size={24} color={colors.text} />
          )}
          markedDates={markedDates}
        />
      </View>

      {/* Restored Empty State */}
      <View style={styles.calendarEventSection}>
          <Text style={styles.noEventsText}>No Routines</Text>
      </View>

      <View style={[styles.calendarFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable 
          onPress={handleTodayPress} 
          style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill, { paddingHorizontal: 22 }]}
        >
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>
            Today
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
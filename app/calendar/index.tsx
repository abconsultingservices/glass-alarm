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
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [currentMonth, setCurrentMonth] = useState(todayStr);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const isWeb = Platform.OS === 'web';

  const { monthName, year } = useMemo(() => {
    const [y, m, d] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return {
      monthName: date.toLocaleString('default', { month: 'long' }),
      year: y
    };
  }, [currentMonth]);

  const calendarTheme = useMemo(() => ({
    backgroundColor: 'transparent',
    calendarBackground: 'transparent',
    textSectionTitleColor: '#8E8E93',
    selectedDayBackgroundColor: colors.primary,
    todayTextColor: '#FF3B30', 
    dayTextColor: '#FFFFFF',
    textDisabledColor: '#333333',
    dotColor: colors.primary,
    // Web needs visible month text in the internal header
    monthTextColor: isWeb ? '#FFFFFF' : 'transparent',
    textDayFontSize: 19,
    textDayHeaderFontSize: 12,
    textDayHeaderFontWeight: '600',
    'stylesheet.calendar.header': {
      header: {
        height: isWeb ? 40 : 0,
        marginTop: 0,
        marginBottom: 0,
        flexDirection: 'row',
        justifyContent: isWeb ? 'space-between' : 'center',
        opacity: isWeb ? 1 : 0,
      },
      week: {
        marginTop: isWeb ? 10 : 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
      }
    },
    'stylesheet.calendar.main': {
      monthView: {
        marginTop: isWeb ? 0 : -5,
      }
    }
  }), [colors, isWeb]);

  const handleTodayPress = () => {
    const isShowingCurrentMonth = currentMonth.substring(0, 7) === todayStr.substring(0, 7);
    if (isShowingCurrentMonth) {
      router.push(`/calendar/day?date=${todayStr}`);
    } else {
      setCurrentMonth(todayStr);
      setSelectedDate(todayStr);
    }
  };

  return (
    <View style={[styles.setupContainer, { flex: 1, paddingTop: insets.top }]}>
      
      {/* Platform Adaptive Header Row */}
      <View style={styles.calendarHeaderRow}>
        <Pressable 
          onPress={() => router.push('/calendar/year')}
          style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill]}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 17 }}>{year}</Text>
        </Pressable>
        
        {/* Web Navigation Middle Section */}
        {isWeb && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
             <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '600' }}>{monthName}</Text>
          </View>
        )}

        <View style={styles.glassPill}>
          <Pressable onPress={() => router.replace('/dashboard')} style={({ pressed }) => getPressedStyle(pressed)}>
            <Ionicons name="grid-outline" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.pillDivider} />
          <Ionicons name="search-outline" size={22} color="#FFFFFF" />
          <View style={styles.pillDivider} />
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </View>
      </View>

      {/* Large Month Label - iOS Only */}
      {!isWeb && <Text style={styles.largeMonthLabel}>{monthName}</Text>}

      <View style={{ paddingHorizontal: isWeb ? 20 : 5 }}>
        <Calendar
          key={currentMonth}
          current={currentMonth}
          theme={calendarTheme}
          enableSwipeMonths
          // Arrows are necessary for Web usability
          hideArrows={!isWeb} 
          onMonthChange={(m) => setCurrentMonth(m.dateString)}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          renderArrow={(dir) => (
            <Ionicons name={dir === 'left' ? 'chevron-back' : 'chevron-forward'} size={24} color={colors.primary} />
          )}
          markedDates={{
            [selectedDate]: { selected: true, disableTouchEvent: false },
            [todayStr]: { today: true }
          }}
        />
      </View>

      <View style={styles.calendarEventSection}>
          <Text style={styles.noEventsText}>No Events</Text>
      </View>

      {/* Floating Bottom Navigation */}
      <View style={[styles.calendarFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable 
          onPress={handleTodayPress} 
          style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill, { paddingHorizontal: 22 }]}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '500' }}>Today</Text>
        </Pressable>
      </View>
    </View>
  );
}
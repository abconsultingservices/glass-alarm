import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CalendarMonthView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles: themedStyles, getPressedStyle } = useThemedStyles();
  
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

  const theme = useMemo(() => ({
    backgroundColor: 'transparent',
    calendarBackground: 'transparent',
    textSectionTitleColor: '#777',
    selectedDayBackgroundColor: colors.primary,
    todayTextColor: '#FF3B30',
    dayTextColor: '#FFF',
    textDisabledColor: '#444',
    dotColor: colors.primary,
    monthTextColor: isWeb ? '#FFF' : 'transparent', 
    textDayFontSize: 19,
    textDayHeaderFontSize: 12,
    textDayHeaderFontWeight: '600',
    // ⬇️ TIGHTEN SPACING FOR IOS
    'stylesheet.calendar.header': {
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 10,
        marginTop: 0, // Remove top margin
        alignItems: 'center',
        height: isWeb ? 40 : 0, // Collapse header height on iOS
      },
      week: {
        marginTop: 0, // Pull day names (S M T...) closer to the Month label
        flexDirection: 'row',
        justifyContent: 'space-around'
      }
    },
    'stylesheet.calendar.main': {
      container: {
        paddingLeft: 5,
        paddingRight: 5,
        backgroundColor: 'transparent'
      },
      monthView: {
        marginTop: -10, // Pull the grid upward
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
    <View style={[themedStyles.setupContainer, { flex: 1, backgroundColor: '#000', paddingTop: insets.top }]}>
      
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Pressable 
          onPress={() => router.push('/calendar/year')}
          style={({ pressed }) => [getPressedStyle(pressed), styles.yearPill]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '500' }}>{year}</Text>
        </Pressable>
        
        <View style={styles.iconGroup}>
          <Ionicons name="list-outline" size={24} color={colors.primary} />
          <Ionicons name="search-outline" size={24} color={colors.primary} />
          <Ionicons name="add" size={28} color={colors.primary} />
        </View>
      </View>

      {/* Large Month Label */}
      {!isWeb && <Text style={styles.largeMonthLabel}>{monthName}</Text>}

      <View style={{ paddingHorizontal: 5 }}>
        <Calendar
          key={currentMonth}
          current={currentMonth}
          theme={theme}
          enableSwipeMonths
          hideArrows={!isWeb} 
          onMonthChange={(m) => setCurrentMonth(m.dateString)}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { selected: true },
            [todayStr]: { today: true }
          }}
        />
      </View>

      <View style={styles.eventSection}>
          <Text style={styles.noEventsText}>No Events</Text>
      </View>

      {/* Footer Nav */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable onPress={handleTodayPress} style={getPressedStyle(false)}>
           <View style={styles.todayPill}>
             <Text style={styles.todayText}>Today</Text>
           </View>
        </Pressable>
        <View style={styles.tabPill}>
            <Ionicons name="calendar" size={22} color="#FFF" />
            <Ionicons name="inbox-outline" size={22} color={colors.mutedText} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
  },
  yearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  largeMonthLabel: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFF',
    paddingHorizontal: 20,
    marginTop: 0, // Reduced to kill white space
    marginBottom: -5, // Negative margin to pull calendar up
  },
  eventSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEventsText: {
    color: '#444',
    fontSize: 20,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  todayPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  todayText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    borderRadius: 25,
    gap: 20,
  }
});
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Switch, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { RoutineService, RoutineWithSchedule } from '../../services/routineService';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Added this

export default function RoutineListScreen() {
  const { styles, colors, getPressedStyle } = useThemedStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Initialize insets
  
  const [routines, setRoutines] = useState<RoutineWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [])
  );

  const loadRoutines = async () => {
    setLoading(true);
    const data = await RoutineService.getAllRoutines();
    setRoutines(data);
    setLoading(false);
  };

  const handleToggleActive = async (rguid: string, currentStatus: boolean) => {
    setRoutines(prev => prev.map(r => 
      r.rguid === rguid ? { ...r, isEnabled: !currentStatus } : r
    ));
    await RoutineService.updateRoutineStatus(rguid, !currentStatus);
  };

  const renderRoutineCard = ({ item }: { item: RoutineWithSchedule }) => (
    <Pressable 
      onPress={() => router.push(`/calendar/add-routine?rguid=${item.rguid}`)}
      style={({ pressed }) => [
        styles.insetGroup, 
        { marginBottom: 16, padding: 16 },
        getPressedStyle(pressed)
      ]}
    >
      <View style={localStyles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
            {item.name}
          </Text>
          <View style={localStyles.statsRow}>
            <Ionicons name="list" size={14} color={colors.mutedText} />
            <Text style={{ color: colors.mutedText, fontSize: 13, marginLeft: 6 }}>
              {item.taskCount || 0} Tasks
            </Text>
          </View>
        </View>
        
        <Switch 
          value={item.isEnabled}
          trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.success }}
          thumbColor={'#FFFFFF'}
          onValueChange={() => handleToggleActive(item.rguid, item.isEnabled)}
        />
      </View>

      <View style={[styles.divider, { marginVertical: 12, opacity: 0.3 }]} />

      <View style={localStyles.scheduleFooter}>
        <View style={localStyles.schedulePill}>
          <Ionicons name="time-outline" size={14} color={colors.text} />
          <Text style={{ color: colors.text, marginLeft: 6, fontSize: 13, fontWeight: '500' }}>
            {item.type === 'custom' ? 'Custom Days' : item.type?.toUpperCase()} @ {item.startTime}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedText} style={{ opacity: 0.5 }} />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.modalContainer}>
        <View style={styles.sheetHandleContainer}><View style={styles.sheetHandle} /></View>
        
        <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
            <Pressable 
                onPress={() => router.back()} 
                style={({ pressed }) => [styles.circularButton, getPressedStyle(pressed)]}
            >
                <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>

            <Text style={localStyles.headerTitle}>Routines</Text>

            <Pressable 
                onPress={() => router.push('/calendar/add-routine')} 
                style={({ pressed }) => [
                    styles.circularButton, 
                    getPressedStyle(pressed)
                ]}
            >
                <Ionicons name="add" size={28} color={colors.text} />
            </Pressable>
        </View>

        <FlatList
            data={routines}
            keyExtractor={(item) => item.rguid}
            renderItem={renderRoutineCard}
            contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
            ListHeaderComponent={
                <Text style={localStyles.subTitle}>Manage your routines.</Text>
            }
            ListEmptyComponent={
                !loading ? (
                    <View style={localStyles.emptyState}>
                        <Ionicons name="calendar-outline" size={48} color={colors.mutedText} style={{ opacity: 0.2 }} />
                        <Text style={{ color: colors.mutedText, marginTop: 12, fontSize: 16 }}>No routines found.</Text>
                    </View>
                ) : null
            }
        />

        {loading && routines.length === 0 && (
            <ActivityIndicator size="large" color={colors.text} style={{ flex: 1 }} />
        )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    flex: 1, // Added to help center text between buttons
  },
  subTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    marginLeft: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  schedulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  }
});
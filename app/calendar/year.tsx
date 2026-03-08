import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CalendarYearView() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles();

  return (
    <View style={[styles.setupContainer, { flex: 1, backgroundColor: '#000', paddingTop: insets.top }]}>
      {/* Header */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, height: 50, alignItems: 'center' }}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => getPressedStyle(pressed)}
        >
          <Text style={{ color: colors.primary, fontSize: 18 }}>Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 34, fontWeight: 'bold', color: '#FFF', marginBottom: 20 }}>
          2026
        </Text>
        
        <View style={{ alignItems: 'center', marginTop: 100 }}>
          <Ionicons name="construct-outline" size={48} color={colors.mutedText} />
          <Text style={{ color: colors.mutedText, marginTop: 10 }}>Year Grid Coming Soon</Text>
        </View>
      </ScrollView>
    </View>
  );
}
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles(); 
  
  const [user, setUser] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await dbService.getLatestUser();
      setUser(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleReset = async () => {
    const success = await dbService.resetApp();
    if (success) router.replace('/'); 
  };

  return (
    <View style={[styles.setupContainer, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.setupTitle}>
          Welcome, {user?.name?.split(' ')[0] || 'Guest'}
        </Text>

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.fieldGroupTitle}>PROFILE INFORMATION</Text>
          
          <View style={styles.insetGroup}>
            {/* Email Row */}
            <View style={styles.inputRow}>
              <View style={[styles.inputStack, { paddingHorizontal: 16 }]}>
                <Text style={{ color: colors.mutedText, fontSize: 13, fontWeight: '600' }}>EMAIL</Text>
                <Text style={{ color: colors.text, fontSize: 17, marginTop: 2 }}>{user?.email || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Phone Row */}
            <View style={styles.inputRow}>
              <View style={[styles.inputStack, { paddingHorizontal: 16 }]}>
                <Text style={{ color: colors.mutedText, fontSize: 13, fontWeight: '600' }}>PHONE</Text>
                <Text style={{ color: colors.text, fontSize: 17, marginTop: 2 }}>{user?.phone || 'Not set'}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.groupFootnote}>
            Your data is stored locally using SQLite and Drizzle ORM for maximum privacy.
          </Text>
        </View>
      </ScrollView>

      {/* Persistent Destructive Action at the bottom */}
      <View style={[styles.floatingButtonContainer, { bottom: Math.max(insets.bottom, 20) }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.button, 
            getPressedStyle(pressed),
            { backgroundColor: colors.glassBackground }
          ]} 
          onPress={handleReset}
        >
          <Text style={[styles.buttonText, { color: colors.error }]}>
            Reset All Data
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
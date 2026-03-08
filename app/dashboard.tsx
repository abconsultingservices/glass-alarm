import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { GlassFormRenderer } from '../components/GlassFormRenderer';

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles(); 
  
  // Track the full user object to get the ID/GUID
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async () => {
    const data = await dbService.getLatestUser();
    if (data) {
      setUser(data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  // Define schema inside render or useMemo to capture the current user.id
  const DASHBOARD_SCHEMA: any[] = [
    {
      sectionType: 'insetGroup',
      label: 'PROFILE INFORMATION',
      footer: 'Your data is stored locally using SQLite for maximum privacy.',
      fields: [
        { 
          key: 'name', 
          label: 'Name', 
          // Inject the ID into the query params
          destination: user?.id ? `/edit/users.name?id=${user.id}` : undefined 
        },
        { 
          key: 'email', 
          label: 'Email', 
          mode: 'view' 
        }, 
        { 
          key: 'phone', 
          label: 'Phone', 
          destination: user?.id ? `/edit/users.phone?id=${user.id}` : undefined 
        }
      ]
    }
  ];

  const handleReset = async () => {
    const success = await dbService.resetApp();
    if (success) router.replace('/'); 
  };

  if (loading) {
    return (
      <View style={[styles.setupContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.setupContainer, { paddingTop: insets.top }]}>
      <Text style={styles.setupTitle}>
        Welcome, {user?.name?.split(' ')[0] || 'Guest'}
      </Text>

      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <GlassFormRenderer 
          // Force re-render when user data changes
          key={`${user?.name}-${user?.phone}`}
          schema={DASHBOARD_SCHEMA}
          form={user || {}}
          setForm={() => {}} // Dashboard is read-only, navigation handles updates
          errors={{}}
          setErrors={() => {}}
        />
      </View>

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
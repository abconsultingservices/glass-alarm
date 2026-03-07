import React, { useEffect, useState, useCallback } from 'react';
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
  
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  // Define the Schema using the secure tableName.fieldKey slugs
  const DASHBOARD_SCHEMA: any[] = [
    {
      sectionType: 'insetGroup',
      label: 'PROFILE INFORMATION',
      footer: 'Your data is stored locally using SQLite and Drizzle ORM for maximum privacy.',
      fields: [
        { 
          key: 'name', 
          label: 'Name', 
          destination: '/edit/users.name' // Matches fieldRegistry key
        },
        { 
          key: 'email', 
          label: 'Email', 
          mode: 'view' // Static view mode
        }, 
        { 
          key: 'phone', 
          label: 'Phone', 
          destination: '/edit/users.phone' // Matches fieldRegistry key
        }
      ]
    }
  ];

  // Refresh data whenever the user returns to this screen (e.g., after an edit)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function load() {
        const data = await dbService.getLatestUser();
        if (data && isMounted) {
          setForm({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || ''
          });
        }
        setLoading(false);
      }
      load();
      return () => { isMounted = false; };
    }, [])
  );

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
        Welcome, {form.name.split(' ')[0] || 'Guest'}
      </Text>

      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <GlassFormRenderer 
          schema={DASHBOARD_SCHEMA}
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
        />
      </View>

      {/* Floating Destructive Action - Styled as Liquid Glass Pill */}
      <View style={[styles.floatingButtonContainer, { bottom: Math.max(insets.bottom, 20) }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.button, 
            getPressedStyle(pressed),
            { 
              backgroundColor: colors.glassBackground
            }
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
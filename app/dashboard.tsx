import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { dbService } from '../services/DatabaseService';
import { useRouter } from 'expo-router';

import { useThemedStyles } from '../hooks/useThemedStyles';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { colors, styles } = useThemedStyles(); 

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const handleReset = async () => {
    const success = await dbService.resetApp();
    if (success) {
      // Send them back to the start
      router.replace('/'); 
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome, {user?.name || 'Guest'}!
      </Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>
          Email: <Text style={styles.value}>{user?.email}</Text>
        </Text> 
        <Text style={styles.label}>
          Phone: <Text style={styles.value}>{user?.phone}</Text>
        </Text> 
      </View>
      <TouchableOpacity 
        style={[styles.button, { marginTop: 40, borderColor: '#ff4444' }]} 
        onPress={handleReset}
      >
        <Text style={{ color: '#ff4444', fontWeight: '600' }}>Reset All Data</Text>
      </TouchableOpacity>
    </View>
  );
}
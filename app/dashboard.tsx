import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { openDatabaseAsync } from 'expo-sqlite';

export default function Dashboard() {
  const [user, setUser] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Direct Async connection
        const sqlite = await openDatabaseAsync('liquid_glass.db');
        
        // Use getFirstAsync to avoid the 'prepareSync' path
        const result = await sqlite.getFirstAsync<any>(
          'SELECT * FROM users ORDER BY id DESC LIMIT 1'
        );

        if (result) {
          setUser(result);
        }
      } catch (e) {
        console.error("Dashboard Load Error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {user?.name || 'Guest'}!</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Email: <Text style={styles.value}>{user?.email}</Text></Text>
        <Text style={styles.label}>Phone: <Text style={styles.value}>{user?.phone || 'Not set'}</Text></Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 40, backgroundColor: '#f9f9f9', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcome: { fontSize: 32, fontWeight: '900', marginBottom: 20, color: '#000' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  label: { fontSize: 16, color: '#666', marginBottom: 10 },
  value: { color: '#000', fontWeight: '600' }
});
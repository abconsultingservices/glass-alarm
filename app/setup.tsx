import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { db, ensureSchema } from '../db/client';
import { openDatabaseAsync } from 'expo-sqlite';
import { users } from '../db/schema';

export default function Setup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  const save = async () => {
  try {
      await ensureSchema();

      // The fix: Use the async-compatible approach
      // We explicitly await the database operation
      /*await db.insert(users).values({
        name: form.name,
        email: form.email,
        phone: form.phone || ""
      });*/

      const sqlite = await openDatabaseAsync('liquid_glass.db');
      await sqlite.runAsync(
        'INSERT INTO users (name, email, phone) VALUES (?, ?, ?)',
        [form.name, form.email, form.phone || ""]
      );

      router.replace('/dashboard');
    } catch (error: any) {
      console.error("Critical Save Error:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Setup Profile</Text>
      <TextInput placeholder="Name" style={styles.input} onChangeText={t => setForm({...form, name: t})} />
      <TextInput placeholder="Email" style={styles.input} onChangeText={t => setForm({...form, email: t})} />
      <TextInput placeholder="Phone" style={styles.input} onChangeText={t => setForm({...form, phone: t})} />
      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={{color: '#fff'}}>Save & Enter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30 },
  input: { borderBottomWidth: 1, marginBottom: 20, padding: 10, fontSize: 18 },
  button: { backgroundColor: '#000', padding: 20, borderRadius: 10, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 }
});
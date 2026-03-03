import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { dbService } from '../services/DatabaseService';

import { useThemedStyles } from '../hooks/useThemedStyles';


export default function Setup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
 
  const { styles, colors, getPressedStyle } = useThemedStyles(); 

  const save = async () => {
    try {
      await dbService.createUser(form.name, form.email, form.phone);
      router.replace('/dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Setup Profile</Text>

      <View style={styles.inputContainer}>
        <TextInput 
          placeholder="Name"
          placeholderTextColor={colors.mutedText}
          style={styles.inputField} 
          value={form.name}
          dataSet={{ 'glass-input': 'true' }}
          onChangeText={t => setForm({...form, name: t})} 
        />
         {form.name.length > 0 && (
          <Pressable 
            onPress={() => setForm({...form, name: ''})}
            style={styles.clearIcon}
          >
            <Text style={{ color: colors.mutedText, fontSize: 18 }}>✕</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.inputContainer}>
        <TextInput 
          placeholder="Email" 
          placeholderTextColor={colors.mutedText}
          style={styles.inputField} 
          value={form.email}
          dataSet={{ 'glass-input': 'true' }}
          onChangeText={t => setForm({...form, email: t})} 
        />
        {form.email.length > 0 && (
          <Pressable 
            onPress={() => setForm({...form, email: ''})}
            style={styles.clearIcon}
          >
            <Text style={{ color: colors.mutedText, fontSize: 18 }}>✕</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.inputContainer}>
        <TextInput 
            placeholder="Phone"
            placeholderTextColor={colors.mutedText}
            style={styles.inputField} 
            value={form.phone}
            dataSet={{ 'glass-input': 'true' }}
            onChangeText={t => setForm({...form, phone: t})} 
        />
        {form.phone.length > 0 && (
          <Pressable 
            onPress={() => setForm({...form, phone: ''})}
            style={styles.clearIcon}
          >
            <Text style={{ color: colors.mutedText, fontSize: 18 }}>✕</Text>
          </Pressable>
        )}
      </View>
      
      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save & Enter</Text>
      </Pressable>
    </View>
  );
}
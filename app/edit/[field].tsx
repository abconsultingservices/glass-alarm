import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { GlassFormRenderer } from '../../components/GlassFormRenderer';
import { dbService } from '../../services/DatabaseService';

export default function GenericEditField() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { field } = useLocalSearchParams<{ field: string }>();
  const { colors, styles, getPressedStyle } = useThemedStyles();

  const [form, setForm] = useState<any>({ [field]: '' });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // 1. Map the dynamic 'field' slug to a human-readable label
  const displayLabel = field.charAt(0).toUpperCase() + field.slice(1);

  useEffect(() => {
    async function loadCurrentValue() {
      const data = await dbService.getLatestUser();
      if (data && data[field]) {
        setForm({ [field]: data[field] });
      }
      setLoading(false);
    }
    loadCurrentValue();
  }, [field]);

  const handleSave = async () => {
    if (errors[field]) return;
    
    // Update logic for Drizzle/SQLite
    const success = await dbService.updateUserField(field, form[field]);
    if (success) router.back();
  };

  // 2. Single-field Schema for the Renderer
  const EDIT_SCHEMA: any[] = [{
    sectionType: 'pills', // Use the "Pill" style for focused editing
    label: `EDIT ${displayLabel.toUpperCase()}`,
    fields: [{ 
        key: field, 
        label: displayLabel,
        config: { autoFocus: true, clearButtonMode: 'while-editing' } 
    }]
  }];

  if (loading) return null;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.setupContainer, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56 }}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => getPressedStyle(pressed)}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.text, marginRight: 44 }}>
          {displayLabel}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <GlassFormRenderer 
          schema={EDIT_SCHEMA}
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
        />
      </View>

      {/* Save Button */}
      <View style={[styles.floatingButtonContainer, { bottom: Math.max(insets.bottom, 20) }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.button, 
            getPressedStyle(pressed),
            { opacity: errors[field] || !form[field] ? 0.5 : 1 }
          ]} 
          onPress={handleSave}
          disabled={!!errors[field] || !form[field]}
        >
          <Text style={styles.buttonText}>Save {displayLabel}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { GlassFormRenderer } from '../../components/GlassFormRenderer';
import { dbService } from '../../services/DatabaseService';
import { fieldRegistry } from '../../services/FieldRegistry';

export default function GenericEditField() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles();
  
  // 'field' is the slug from the URL (e.g., "users.name")
  const { field: slug } = useLocalSearchParams<{ field: string }>();
  
  // Split the slug into table and key
  const [tableName, fieldKey] = (slug || '').split('.');

  // 🛡️ TIER 1 GUARD: Verify the field exists in our allowed registry
  const config = fieldRegistry[tableName]?.[fieldKey];

  const [form, setForm] = useState<any>({ [fieldKey]: '' });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentValue() {
      // Don't attempt to load if the route is invalid
      if (!config || !tableName || !fieldKey) {
        setLoading(false);
        return;
      }

      const data = await dbService.getLatestUser(); 
      const actualDbKey = config.dbColumn || fieldKey;
      
      if (data && data[actualDbKey] !== undefined) {
        setForm({ [fieldKey]: String(data[actualDbKey]) });
      }
      setLoading(false);
    }
    loadCurrentValue();
  }, [slug]);

  // Handle unauthorized or "hacked" URL access
  if (!loading && !config) {
    return (
      <View style={[styles.setupContainer, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
        <Ionicons name="lock-closed" size={64} color={colors.error} style={{ marginBottom: 20, opacity: 0.5 }} />
        <Text style={[styles.title, { textAlign: 'center', fontSize: 24, color: colors.error }]}>
          Unauthorized Access
        </Text>
        <Text style={[styles.groupFootnote, { textAlign: 'center', marginTop: 10, marginBottom: 30 }]}>
          This field cannot be edited or does not exist in the secure registry.
        </Text>
        <Pressable 
          style={[styles.button, { width: '100%', backgroundColor: colors.glassBackground }]}
          onPress={() => router.replace('/dashboard')}
        >
          <Text style={[styles.buttonText, { color: colors.primary }]}>Go Back to Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  const handleSave = async () => {
    // Check validation and table existence before saving
    if (errors[fieldKey] || !tableName || !config) return;
    
    const dbColumn = config?.dbColumn || fieldKey;
    const success = await dbService.updateField(tableName, dbColumn, form[fieldKey]);
    
    if (success) {
      router.back();
    }
  };

  // Construct the Schema using the Registry data
  const EDIT_SCHEMA: any[] = [{
    sectionType: 'pills',
    label: `EDIT ${config?.label?.toUpperCase() || 'FIELD'}`,
    fields: [{ 
        ...config,
        key: fieldKey, 
        label: config?.label || fieldKey,
        config: { 
          autoFocus: true, 
          clearButtonMode: 'while-editing',
          returnKeyType: 'done',
          onSubmitEditing: handleSave,
          ...config?.config 
        }
    }]
  }];

  if (loading) return null;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.setupContainer, { paddingTop: insets.top, flex: 1 }]}
    >
      {/* Header with Circular Glass Back Button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56 }}>
        <Pressable 
            onPress={() => router.back()} 
            style={({ pressed }) => [
                getPressedStyle(pressed),
                { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                    width: 38, 
                    height: 38, 
                    borderRadius: 19, 
                    justifyContent: 'center', 
                    alignItems: 'center' 
                }
            ]}
        >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
        </Pressable>
        
        <Text style={{ 
            flex: 1, 
            textAlign: 'center', 
            fontSize: 17, 
            fontWeight: '600', 
            color: colors.text, 
            marginRight: 38 
        }}>
            {config.label}
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

      {/* Floating Save Button */}
      <View style={[styles.floatingButtonContainer, { bottom: Math.max(insets.bottom, 20) }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.button, 
            getPressedStyle(pressed),
            { 
              backgroundColor: colors.glassBackground,
              opacity: errors[fieldKey] || !form[fieldKey] ? 0.5 : 1 
            }
          ]} 
          onPress={handleSave}
          disabled={!!errors[fieldKey] || !form[fieldKey]}
        >
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            Save {config.label}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
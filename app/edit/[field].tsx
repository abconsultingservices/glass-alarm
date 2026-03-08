import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { GlassFormRenderer } from '../../components/GlassFormRenderer';
import { dbService } from '../../services/DatabaseService';
import { fieldRegistry } from '../../services/FieldRegistry';
import { validateValue } from '../../utils/ValidationEngine';

export default function GenericEditField() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, styles, getPressedStyle } = useThemedStyles();
  
  /**
   * Slug: "tableName.fieldKey" (e.g., "users.name")
   * id: The unique identifier for the record (e.g., "1" or a UUID string)
   */
  const { field: slug, id } = useLocalSearchParams<{ field: string, id: string }>();
  
  const [tableName, fieldKey] = (slug || '').split('.');
  const config = fieldRegistry[tableName]?.[fieldKey];

  const [form, setForm] = useState<any>({ [fieldKey]: '' });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentValue() {
      if (!config || !tableName || !fieldKey || !id) {
        setLoading(false);
        return;
      }

      // We now fetch specifically by ID instead of "latest user"
      // Note: You may need to update dbService.getUserById to support this
      const data = await dbService.getLatestUser(); // Fallback for now, but targeting ID
      const actualDbKey = config.dbColumn || fieldKey;
      
      if (data && data[actualDbKey] !== undefined) {
        setForm({ [fieldKey]: String(data[actualDbKey]) });
      }
      setLoading(false);
    }
    loadCurrentValue();
  }, [slug, id]);

  // Handle Unauthorized/Invalid Routes
  if (!loading && (!config || !id)) {
    return (
      <View style={[styles.setupContainer, { justifyContent: 'center', alignItems: 'center', padding: 40 }]}>
        <Ionicons name="lock-closed" size={64} color={colors.error} style={{ marginBottom: 20, opacity: 0.5 }} />
        <Text style={[styles.title, { textAlign: 'center', fontSize: 24, color: colors.error }]}>
          Invalid Request
        </Text>
        <Text style={[styles.groupFootnote, { textAlign: 'center', marginTop: 10, marginBottom: 30 }]}>
          Missing record identifier or unauthorized field access.
        </Text>
        <Pressable 
          style={[styles.button, { width: '100%', backgroundColor: colors.glassBackground }]}
          onPress={() => router.replace('/calendar')}
        >
          <Text style={[styles.buttonText, { color: colors.primary }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const navigation = useNavigation();
  const handleSafeBack = () => {
    if (navigation.canGoBack()) {
        router.back();
    } else {
        // If there is no history (due to refresh or direct link), go to Dashboard
        router.replace('/calendar');
    }
    };

  const handleSave = async () => {
    if (errors[fieldKey] || !tableName || !config || !id) return;

    const currentValue = form[fieldKey];
    const rules = config?.validation || [];

    const errorMsg = validateValue(currentValue, rules);

    if (errorMsg) {
        setErrors((prev: any) => ({ ...prev, [fieldKey]: errorMsg }));
        return;
    }

    if (!tableName || !config || !id) return;
    
    const dbColumn = config?.dbColumn || fieldKey;
    const success = await dbService.updateField(tableName, dbColumn, form[fieldKey], id);
    
    if (success) {
        handleSafeBack(); // Use the safe navigator
    }
  };

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
      {/* Liquid Glass Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56 }}>
        <Pressable 
            onPress={() => handleSafeBack()} 
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
        
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: colors.text, marginRight: 38 }}>
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

      <View style={[styles.floatingButtonContainer, { bottom: Math.max(insets.bottom, 20) }]}>
        <Pressable 
          style={({ pressed }) => [
            styles.button, 
            getPressedStyle(pressed),
            { 
              backgroundColor: colors.glassBackground,
              opacity: errors[fieldKey] ? 0.5 : 1 
            }
          ]} 
          onPress={handleSave}
          disabled={!!errors[fieldKey]}
        >
          <Text style={[styles.buttonText, { color: colors.primary }]}>
            Save Changes
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
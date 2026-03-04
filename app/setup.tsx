import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Setup() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
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

    const fieldConfig = {
        name: { autoCapitalize: 'words' as const, keyboardType: 'default' as const, autoCorrect: true, textContentType: 'name'},
        email: { autoCapitalize: 'none' as const, keyboardType: 'email-address' as const, autoCorrect: false, textContentType: 'emailAddress'},
        phone: { autoCapitalize: 'none' as const, keyboardType: 'phone-pad' as const, autoCorrect: false, textContentType: 'telephoneNumber'},
    };

    return (
        <View style={[
            styles.container, 
            { 
                paddingBottom: Math.max(insets.bottom, 20), 
                paddingTop: insets.top 
            }
        ]}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.title, { marginBottom: 30 }]}>Setup Profile</Text>

              {/* --- STYLE A: INDIVIDUAL PILLS --- */}
              <Text style={{ color: colors.mutedText, marginBottom: 10, fontSize: 12, fontWeight: '600' }}>INDIVIDUAL PILLS</Text>
              {['name', 'email', 'phone'].map((field, index, array) => {
                  const config = fieldConfig[field as keyof typeof fieldConfig];
                  const isLast = index === array.length - 1;

                  return (
                      <React.Fragment key={`inset-${field}`}>
                        <View key={`pill-${field}`} style={styles.inputContainer}>
                            <TextInput 
                                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                placeholderTextColor={colors.placeholderText}
                                style={styles.inputField} 
                                value={form[field as keyof typeof form]}
                                autoCapitalize={config.autoCapitalize}
                                keyboardType={config.keyboardType}
                                autoCorrect={config.autoCorrect}
                                textContentType={config.textContentType}
                                dataSet={{ 'glass-input': 'true' }}
                                onChangeText={t => setForm({...form, [field]: t})} 
                            />
                            {form[field as keyof typeof form].length > 0 && (
                                <Pressable 
                                    onPress={() => setForm({...form, [field]: ''})}
                                    style={({ pressed }) => [styles.clearIcon, getPressedStyle(pressed)]}
                                >
                                    <Text style={{ color: colors.mutedText, fontSize: 18 }}>✕</Text>
                                </Pressable>
                            )}
                        </View>
                      </React.Fragment>
                  );
                })}

                <View style={{ height: 40 }} />

                {/* --- STYLE B: INSET GROUP --- */}
                <Text style={styles.fieldGroupTitle}>Inset Group</Text>
                <View style={styles.insetGroup}>
                    {['name', 'email', 'phone'].map((field, index, array) => {
                        const config = fieldConfig[field as keyof typeof fieldConfig];
                        const isLast = index === array.length - 1;

                        const [fieldErrors, setFieldErrors] = useState({ 
                            email: '', // Store the actual message here
                            name: '',
                            phone: ''
                        });

                        return (
                            <React.Fragment key={`inset-${field}`}>
                                <View style={styles.inputRow}>
                                  <View style={styles.inputStack}>
                                      <TextInput 
                                          placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                          placeholderTextColor={colors.placeholderText}
                                          style={styles.inputField} 
                                          value={form[field as keyof typeof form]}
                                          dataSet={{ 'glass-input': 'true' }}
                                          onChangeText={t => setForm({...form, [field]: t})} 
                                          autoCapitalize={config.autoCapitalize}
                                          keyboardType={config.keyboardType}
                                          autoCorrect={config.autoCorrect}
                                          textContentType={config.textContentType}
                                      />
                                      {fieldErrors[field] ? (
                                        <Text style={styles.errorSubtext}>{fieldErrors[field]}</Text>
                                      ) : null}
                                  </View>
                                  {fieldErrors[field] ? (
                                      <View style={styles.warningIcon}>
                                          <Text style={styles.warningIconText}>⚠️</Text>
                                      </View>
                                  ) : form[field as keyof typeof form].length > 0 && (
                                      <Pressable 
                                          onPress={() => setForm({...form, [field]: ''})}
                                          style={({ pressed }) => [styles.clearIcon, getPressedStyle(pressed)]}
                                      >
                                          <Text style={{ color: colors.mutedText, fontSize: 18 }}>✕</Text>
                                      </Pressable>
                                  )}
                                </View>
                                {!isLast && <View style={styles.divider} />}
                            </React.Fragment>
                        );
                    })}
                </View>
            </ScrollView>

            {/* The Bottom Anchored Glass Button */}
            <Pressable 
                style={({ pressed }) => [
                    styles.button, 
                    getPressedStyle(pressed),
                    { backgroundColor: colors.primary }
                ]} 
                onPress={save}
            >
                <Text style={styles.buttonText}>Save & Enter</Text>
            </Pressable>
        </View>
    );
}
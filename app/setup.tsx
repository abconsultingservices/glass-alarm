import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Setup() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { styles, colors, getPressedStyle } = useThemedStyles(); 

    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', phone: '' });

    const validateField = (field: string, value: string) => {
        if (value.length === 0) return ''; 

        if (field === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) ? '' : 'Invalid email address';
        }

        if (field === 'phone') {
            // Allows: +, 0-9, hyphens, comma, semicolon, *, #
            const phoneRegex = /^[+0-9\-\,\;\*\#\s]+$/;
            return phoneRegex.test(value) ? '' : 'Invalid phone format';
        }

        if (field === 'name' && value.length < 2) {
            return 'Name is too short';
        }
        return '';
    };

    const handleTextChange = (field: keyof typeof form, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        const error = validateField(field, value);
        setFieldErrors(prev => ({ ...prev, [field]: error }));
    };

    const save = async () => {
        if (!form.name || !form.email || Object.values(fieldErrors).some(e => e !== '')) return;

        try {
            await dbService.createUser(form.name, form.email, form.phone);
            router.replace('/dashboard');
        } catch (e) {
            console.error(e);
        }
    };

    const fieldConfig = {
        name: { autoCapitalize: 'words' as const, keyboardType: 'default' as const, textContentType: 'name' as const },
        email: { autoCapitalize: 'none' as const, keyboardType: 'email-address' as const, textContentType: 'emailAddress' as const },
        phone: { autoCapitalize: 'none' as const, keyboardType: 'numbers-and-punctuation' as const, textContentType: 'telephoneNumber' as const },
    };

    const fieldKeys = ['name', 'email', 'phone'] as const;

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20), paddingTop: insets.top }]}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.title, { marginBottom: 30 }]}>Setup Profile</Text>

                {/* --- STYLE A: INDIVIDUAL PILLS --- */}
                <Text style={{ color: colors.mutedText, marginBottom: 10, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>INDIVIDUAL PILLS</Text>
                {fieldKeys.map((field) => {
                    const hasError = !!fieldErrors[field];
                    return (
                        <View key={`pill-${field}`} style={[styles.inputContainer, hasError && { borderColor: colors.error }]}>
                            <TextInput 
                                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                placeholderTextColor={colors.placeholderText}
                                style={styles.inputField} 
                                value={form[field]}
                                onChangeText={t => handleTextChange(field, t)} 
                                {...fieldConfig[field]}
                                dataSet={{ 'glass-input': 'true' }}
                            />
                            {hasError ? (
                                <Text style={{ marginRight: 10, fontSize: 18 }}>⚠️</Text>
                            ) : form[field].length > 0 && (
                                <Pressable onPress={() => handleTextChange(field, '')} style={styles.clearIcon}>
                                    <Text style={{ color: colors.mutedText, fontSize: 18 }}>✕</Text>
                                </Pressable>
                            )}
                        </View>
                    );
                })}

                <View style={{ height: 40 }} />

                {/* --- STYLE B: INSET GROUP --- */}
                <Text style={{ color: colors.mutedText, marginBottom: 10, fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>INSET GROUP</Text>
                <View style={styles.insetGroup}>
                    {fieldKeys.map((field, index) => {
                        const isLast = index === fieldKeys.length - 1;
                        const hasError = !!fieldErrors[field];

                        return (
                            <React.Fragment key={`inset-${field}`}>
                                <View style={styles.inputRow}>
                                    <View style={styles.inputStack}>
                                        <TextInput 
                                            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                            placeholderTextColor={colors.placeholderText}
                                            style={styles.inputField} 
                                            value={form[field]}
                                            onChangeText={t => handleTextChange(field, t)} 
                                            {...fieldConfig[field]}
                                            dataSet={{ 'glass-input': 'true' }}
                                        />
                                        {hasError && (
                                            <Text style={styles.errorSubtext}>{fieldErrors[field]}</Text>
                                        )}
                                    </View>
                                    {hasError ? (
                                        <View style={styles.warningIcon}>
                                            <Text style={{ fontSize: 20 }}>⚠️</Text>
                                        </View>
                                    ) : form[field].length > 0 && (
                                        <Pressable onPress={() => handleTextChange(field, '')} style={styles.clearIcon}>
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

            <Pressable 
                style={({ pressed }) => [
                    styles.button, 
                    getPressedStyle(pressed),
                    { backgroundColor: (fieldErrors.email || fieldErrors.name || !form.email || !form.name) ? colors.mutedText : colors.primary }
                ]} 
                onPress={save}
            >
                <Text style={styles.buttonText}>Save & Enter</Text>
            </Pressable>
        </View>
    );
}
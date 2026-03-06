import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { validateValue, ValidationRule } from '../utils/ValidationEngine';

interface Field {
    key: string;
    label: string;
    subtext?: string;
    validation?: ValidationRule[];
    config?: any;
    overrideFilter?: RegExp;
    // New Props for Dashboard Parity
    mode?: 'view' | 'edit'; 
    destination?: string;
}

interface Section {
    sectionType: 'pills' | 'insetGroup';
    label?: string;
    footer?: string;
    fields: Field[];
    readOnly?: boolean; // Can set entire section to Read Only
}

interface Props {
    schema: Section[];
    form: any;
    setForm: (form: any) => void;
    errors: any;
    setErrors: (errors: any) => void;
}

export const GlassFormRenderer = ({ schema, form, setForm, errors, setErrors }: Props) => {
    const { styles, colors, getPressedStyle } = useThemedStyles();
    const router = useRouter();

    const handleUpdate = (key: string, val: string, rules: ValidationRule[] = [], overrideFilter?: RegExp) => {
        let filteredVal = val;
        if (overrideFilter) {
            filteredVal = val.replace(overrideFilter, '');
        } 
        // 2. Fall back to "Smart Defaults" based on the key name
        else {
            if (key === 'email') {
                filteredVal = val.replace(/[^a-zA-Z0-9@._%+-]/g, '');
            } 
            else if (key === 'phone') {
                filteredVal = val.replace(/[^0-9+\-\(\)\s,;*#]/g, '');
            }
            else if (key === 'name') {
                // Defaults to allowing alpha, spaces, and common name punctuation
                filteredVal = val.replace(/[^a-zA-Z\s\-']/g, '');
            }
            // Add more defaults here as your app grows
        }

        setForm((prev: any) => ({ ...prev, [key]: filteredVal }));
        const errorMsg = validateValue(filteredVal, rules);
        setErrors((prev: any) => ({ ...prev, [key]: errorMsg }));
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            {schema.map((section, sIdx) => (
                <View key={`section-${sIdx}`} style={{ marginBottom: 32 }}>
                    {section.label && (
                        <Text style={styles.fieldGroupTitle}>{section.label}</Text>
                    )}

                    <View style={section.sectionType === 'insetGroup' ? styles.insetGroup : null}>
                        {section.fields.map((field, fIdx) => {
                            const isLast = fIdx === section.fields.length - 1;
                            const hasError = !!errors[field.key];
                            const isPill = section.sectionType === 'pills';
                            
                            // Determine if this specific row should be Read-Only
                            const isReadOnly = section.readOnly || field.mode === 'view';

                            if (isReadOnly) {
                                return (
                                    <View key={field.key}>
                                        <Pressable
                                            disabled={!field.destination}
                                            onPress={() => field.destination && router.push(field.destination as any)}
                                            style={({ pressed }) => [
                                                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 48 },
                                                field.destination && getPressedStyle(pressed)
                                            ]}
                                        >
                                            <Text style={{ fontSize: 17, color: colors.text }}>{field.label}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text numberOfLines={1} style={{ fontSize: 17, color: colors.mutedText, marginRight: 8 }}>
                                                    {form[field.key] || 'Not set'}
                                                </Text>
                                                {field.destination && (
                                                    <Text style={{ color: colors.mutedText, fontSize: 18, opacity: 0.5 }}>〉</Text>
                                                )}
                                            </View>
                                        </Pressable>
                                        {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                    </View>
                                );
                            }

                            // --- ORIGINAL EDITABLE MARKUP (UNCHANGED) ---
                            const inputMarkup = (
                                <View style={isPill 
                                    ? [styles.inputContainer, hasError && { borderColor: colors.error }] 
                                    : styles.inputRow
                                }>
                                    <View style={styles.inputStack}>
                                        <TextInput
                                            style={styles.inputField}
                                            value={form[field.key]}
                                            placeholder={field.label}
                                            placeholderTextColor={colors.placeholderText}
                                            onChangeText={(t) => handleUpdate(field.key, t, field.validation, field.overrideFilter)}
                                            {...field.config}
                                            dataSet={{ 'glass-input': 'true' }}
                                        />
                                        {hasError ? (
                                            <Text style={styles.errorSubtext}>{errors[field.key]}</Text>
                                        ) : field.subtext ? (
                                            <Text style={[styles.errorSubtext, { color: colors.mutedText }]}>
                                                {field.subtext}
                                            </Text>
                                        ) : null}
                                    </View>
                                    
                                    {hasError ? (
                                        <View style={styles.warningIcon}>
                                            <Text style={{ fontSize: 20 }}>⚠️</Text>
                                        </View>
                                    ) : form[field.key]?.length > 0 && (
                                        <Pressable 
                                            onPress={() => handleUpdate(field.key, '', field.validation)}
                                            style={({ pressed }) => [styles.clearIcon, getPressedStyle(pressed)]}
                                        >
                                            <Text style={{ color: colors.mutedText, fontSize: 18 }}>✕</Text>
                                        </Pressable>
                                    )}
                                </View>
                            );

                            return (
                                <View key={field.key}>
                                    {isPill ? (
                                        <View style={{ marginBottom: 12 }}>{inputMarkup}</View>
                                    ) : (
                                        <>
                                            {inputMarkup}
                                            {!isLast && <View style={styles.divider} />}
                                        </>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                    {section.footer && (
                        <Text style={styles.groupFootnote}>{section.footer}</Text>
                    )}
                </View>
            ))}
        </ScrollView>
    );
};
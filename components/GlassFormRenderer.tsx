import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { validateValue, ValidationRule } from '../utils/ValidationEngine';
import { Ionicons } from '@expo/vector-icons';

interface Field {
    key: string;
    label: string;
    type?: 'text' | 'email' | 'phone' | 'url' | 'password';
    subtext?: string;
    validation?: ValidationRule[];
    config?: any;
    overrideFilter?: RegExp;
    mode?: 'view' | 'edit'; 
    destination?: string;
}

interface Section {
    sectionType: 'pills' | 'insetGroup';
    label?: string;
    footer?: string;
    fields: Field[];
    readOnly?: boolean; 
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

    // Added 'type' parameter to handleUpdate to support smart filtering
    const handleUpdate = (key: string, val: string, rules: ValidationRule[] = [], overrideFilter?: RegExp, type?: string) => {
        let filteredVal = val;
        if (overrideFilter) {
            filteredVal = val.replace(overrideFilter, '');
        } 
        else {
            if (type === 'email' || key === 'email') {
                filteredVal = val.replace(/[^a-zA-Z0-9@._%+-]/g, '');
            } 
            else if (type === 'phone' || key === 'phone') {
                filteredVal = val.replace(/[^0-9+\-\(\)\s,;*#]/g, '');
            }
            else if (type === 'url' || key === 'url') {
                filteredVal = val.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]/g, '');
            }
            else if (type === 'password' || key === 'password') {
                filteredVal = val;
            }
            else if (key === 'name') {
                filteredVal = val.replace(/[^a-zA-Z\s\-']/g, '');
            }
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
                            const isReadOnly = section.readOnly || field.mode === 'view' || !!field.destination;

                            const { defaultValue, ...cleanConfig } = field.config || {};

                            console.log(field);

                            if (isReadOnly) {
                                return (
                                    <View key={field.key}>
                                        <Pressable
                                            disabled={!field.destination}
                                            onPress={() => field.destination && router.push(field.destination as any)}
                                            style={({ pressed }) => [
                                                { 
                                                    flexDirection: 'row', 
                                                    alignItems: 'center', 
                                                    paddingHorizontal: 16, 
                                                    minHeight: 54,
                                                    justifyContent: 'space-between'
                                                },
                                                field.destination && getPressedStyle(pressed)
                                            ]}
                                        >
                                            <Text style={{ fontSize: 17, color: colors.text }}>{field.label}</Text>
                                            <View style={{ 
                                                flexDirection: 'row', 
                                                alignItems: 'center', 
                                                justifyContent: 'flex-end',
                                                flex: 1, 
                                                marginLeft: 20 
                                            }}>
                                                <Text 
                                                    numberOfLines={1} 
                                                    style={{ 
                                                        fontSize: 17, 
                                                        color: colors.mutedText, 
                                                        textAlign: 'right',
                                                        marginRight: field.destination ? 8 : 0 
                                                    }}
                                                >
                                                    {form[field.key] || 'Not set'}
                                                </Text>
                                                {field.destination && (
                                                    <Ionicons name="chevron-forward" size={16} color={colors.mutedText} style={{ opacity: 0.5 }} />
                                                )}
                                            </View>
                                        </Pressable>
                                        {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                    </View>
                                );
                            }

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
                                            // Pass field.type to handleUpdate
                                            onChangeText={(t) => handleUpdate(field.key, t, field.validation, field.overrideFilter, field.type)}
                                            // Map field.type to native keyboard behaviors
                                            secureTextEntry={field.type === 'password'}
                                            keyboardType={
                                                field.type === 'email' ? 'email-address' : 
                                                field.type === 'phone' ? 'phone-pad' : 
                                                field.type === 'url' ? 'url' : 'default'
                                            }
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
                                    ) : (form[field.key] && form[field.key].length > 0) ? (
                                        // Only hide our custom X on iOS when the native clear button is active
                                        (Platform.OS === 'ios' && field.config?.clearButtonMode === 'while-editing') ? null : (
                                            <Pressable 
                                                onPress={() => handleUpdate(field.key, '', field.validation)}
                                                style={({ pressed }) => [styles.clearIcon, getPressedStyle(pressed)]}
                                            >
                                                <Text style={{ color: colors.mutedText, fontSize: 18 }}>✕</Text>
                                            </Pressable>
                                        )
                                    ) : null}
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
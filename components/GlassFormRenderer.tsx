import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { validateValue, ValidationRule } from '../utils/ValidationEngine';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Field {
    key: string;
    label: string;
    type?: 'text' | 'email' | 'phone' | 'url' | 'password' | 'select' | 'date' | 'time' | 'customDays' | 'switch';
    subtext?: string;
    validation?: ValidationRule[];
    config?: any;
    overrideFilter?: RegExp;
    mode?: 'view' | 'edit'; 
    destination?: string;
    options?: { label: string; value: any }[]; 
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

    const handleUpdate = (key: string, val: any, rules: ValidationRule[] = [], overrideFilter?: RegExp, type?: string) => {
        let filteredVal = val;
        
        if (typeof val === 'string' && !['date', 'time', 'switch', 'customDays'].includes(type || '')) {
            if (overrideFilter) {
                filteredVal = val.replace(overrideFilter, '');
            } else {
                if (type === 'email' || key === 'email') filteredVal = val.replace(/[^a-zA-Z0-9@._%+-]/g, '');
                else if (type === 'phone' || key === 'phone') filteredVal = val.replace(/[^0-9+\-\(\)\s,;*#]/g, '');
                else if (type === 'url' || key === 'url') filteredVal = val.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]/g, '');
                else if (key === 'name') filteredVal = val.replace(/[^a-zA-Z\s\-']/g, '');
            }
        }

        setForm((prev: any) => ({ ...prev, [key]: filteredVal }));
        const errorMsg = validateValue(filteredVal, rules);
        setErrors((prev: any) => ({ ...prev, [key]: errorMsg }));
    };

    const toggleDay = (key: string, dayIndex: number) => {
        let currentDays: number[] = [];
        try {
            currentDays = typeof form[key] === 'string' ? JSON.parse(form[key]) : (form[key] || []);
        } catch (e) { currentDays = []; }

        const nextDays = currentDays.includes(dayIndex)
            ? currentDays.filter(d => d !== dayIndex)
            : [...currentDays, dayIndex].sort();
        
        handleUpdate(key, JSON.stringify(nextDays));
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            {schema.map((section, sIdx) => (
                <View key={`section-${sIdx}`} style={{ marginBottom: 32 }}>
                    {section.label && <Text style={styles.fieldGroupTitle}>{section.label}</Text>}

                    <View style={section.sectionType === 'insetGroup' ? styles.insetGroup : null}>
                        {section.fields.map((field, fIdx) => {
                            const isLast = fIdx === section.fields.length - 1;
                            const hasError = !!errors[field.key];
                            const isPill = section.sectionType === 'pills';
                            const isReadOnly = section.readOnly || field.mode === 'view' || !!field.destination;
                            const { defaultValue, ...cleanConfig } = field.config || {};

                            // --- READ ONLY / NAVIGATION ---
                            if (isReadOnly) {
                                return (
                                    <View key={field.key}>
                                        <Pressable
                                            disabled={!field.destination}
                                            onPress={() => field.destination && router.push(field.destination as any)}
                                            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }, field.destination && getPressedStyle(pressed)]}
                                        >
                                            <Text style={{ fontSize: 17, color: colors.text }}>{field.label}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1, marginLeft: 20 }}>
                                                <Text numberOfLines={1} style={{ fontSize: 17, color: colors.mutedText, textAlign: 'right', marginRight: field.destination ? 8 : 0 }}>
                                                    {form[field.key] || 'Not set'}
                                                </Text>
                                                {field.destination && <Ionicons name="chevron-forward" size={16} color={colors.mutedText} style={{ opacity: 0.5 }} />}
                                            </View>
                                        </Pressable>
                                        {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                    </View>
                                );
                            }

                            // --Select Nav

                            if (field.type === 'select-nav') {
                                return (
                                    <View key={field.key}>
                                        <Pressable
                                            onPress={() => router.push({
                                                pathname: '/calendar/selection-view',
                                                params: { 
                                                    key: field.key, 
                                                    title: field.label, 
                                                    currentValue: form[field.key],
                                                    options: JSON.stringify(field.options) 
                                                }
                                            })}
                                            style={({ pressed }) => [
                                                { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' },
                                                getPressedStyle(pressed)
                                            ]}
                                        >
                                            <Text style={{ fontSize: 17, color: colors.text }}>{field.label}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 17, color: colors.mutedText, marginRight: 8 }}>
                                                    {field.options?.find(o => o.value === form[field.key])?.label || 'Select'}
                                                </Text>
                                                <Ionicons name="chevron-forward" size={16} color={colors.mutedText} style={{ opacity: 0.5 }} />
                                            </View>
                                        </Pressable>
                                        {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                    </View>
                                );
                            }

                            // --- SWITCH (Toggle) ---
                            if (field.type === 'switch') {
                                return (
                                    <View key={field.key}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 17, color: colors.text }}>{field.label}</Text>
                                            <Switch 
                                                value={!!form[field.key]} 
                                                onValueChange={(val) => handleUpdate(field.key, val)}
                                                trackColor={{ false: colors.glassBorder, true: colors.success }}
                                                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                                            />
                                        </View>
                                        {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                    </View>
                                );
                            }

                            // --- SELECT PILLS ---
                            if (field.type === 'select') {
                                return (
                                    <View key={field.key} style={{ padding: 16 }}>
                                        <Text style={localStyles.subLabel}>{field.label}</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {field.options?.map(opt => (
                                                <Pressable
                                                    key={opt.value}
                                                    onPress={() => handleUpdate(field.key, opt.value)}
                                                    style={({ pressed }) => [getPressedStyle(pressed), styles.glassPill, { backgroundColor: form[field.key] === opt.value ? colors.text : colors.glassBackground, paddingHorizontal: 16 }]}
                                                >
                                                    <Text style={{ color: form[field.key] === opt.value ? colors.background : colors.text, fontWeight: '600' }}>{opt.label}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                );
                            }

                            // --- CUSTOM DAYS (MWF) ---
                            if (field.type === 'customDays') {
                                const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                                const selected = typeof form[field.key] === 'string' ? JSON.parse(form[field.key] || '[]') : [];
                                return (
                                    <View key={field.key} style={{ padding: 16 }}>
                                        <Text style={localStyles.subLabel}>{field.label}</Text>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            {days.map((day, dIdx) => (
                                                <Pressable
                                                    key={dIdx}
                                                    onPress={() => toggleDay(field.key, dIdx)}
                                                    style={({ pressed }) => [getPressedStyle(pressed), { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: selected.includes(dIdx) ? colors.text : colors.glassBackground }]}
                                                >
                                                    <Text style={{ color: selected.includes(dIdx) ? colors.background : colors.text, fontWeight: '700' }}>{day}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                );
                            }

                            // --- DATE / TIME PICKERS ---
                            if (field.type === 'date' || field.type === 'time') {
                                return (
                                    <View key={field.key}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 17, color: colors.text }}>{field.label}</Text>
                                            <DateTimePicker
                                                value={new Date(form[field.key] ? (field.type === 'date' ? `${form[field.key]}T00:00:00` : `2000-01-01T${form[field.key]}`) : Date.now())}
                                                mode={field.type}
                                                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                                                onChange={(e, d) => d && handleUpdate(field.key, field.type === 'date' ? d.toISOString().split('T')[0] : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))}
                                                textColor={colors.text}
                                                themeVariant={colors.isDark ? 'dark' : 'light'}
                                            />
                                        </View>
                                        {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                    </View>
                                );
                            }

                            // --- STANDARD TEXT INPUT ---
                            return (
                                <View key={field.key} style={{ marginBottom: isPill ? (hasError ? 4 : 16) : 0 }}>
                                    <View style={isPill ? [styles.inputContainer, hasError && { borderColor: colors.error, borderWidth: 1.5 }] : [styles.inputRow, { position: 'relative' }]}>
                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                            <TextInput 
                                                style={[styles.inputField, !isPill && { paddingRight: 48 }]} 
                                                value={form[field.key] ?? ''} 
                                                placeholder={field.label} 
                                                placeholderTextColor={colors.placeholderText} 
                                                onChangeText={(t) => handleUpdate(field.key, t, field.validation, field.overrideFilter, field.type)} 
                                                secureTextEntry={field.type === 'password'} 
                                                keyboardType={field.type === 'email' ? 'email-address' : field.type === 'phone' ? 'phone-pad' : field.type === 'url' ? 'url' : 'default'} 
                                                {...cleanConfig}/>
                                        </View>
                                        <View style={{ position: 'absolute', right: isPill ? 12 : 16, flexDirection: 'row', alignItems: 'center' }}>
                                            {!!(form[field.key] && form[field.key].length > 0) && (
                                                <Pressable 
                                                    onPress={() => handleUpdate(field.key, '', field.validation)} 
                                                    style={({ pressed }) => [getPressedStyle(pressed), { padding: 4 }]}
                                                >
                                                    <Ionicons name="close-circle" size={18} color={hasError ? colors.error : colors.placeholderText} />
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>
                                    {hasError && <Text style={[styles.errorSubtext, { marginLeft: isPill ? 16 : 20 }]}>{errors[field.key]}</Text>}
                                    {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                </View>
                            );
                        })}
                    </View>
                    {section.footer && <Text style={styles.groupFootnote}>{section.footer}</Text>}
                </View>
            ))}
        </ScrollView>
    );
};

const localStyles = StyleSheet.create({
    subLabel: { color: '#888', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', fontWeight: '600' }
});
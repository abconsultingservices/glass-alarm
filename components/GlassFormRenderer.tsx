import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { validateValue, ValidationRule } from '../utils/ValidationEngine';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

interface Field {
    key: string;
    label: string;
    type?: 'text' | 'email' | 'phone' | 'url' | 'password' | 'select' | 'select-nav' | 'date' | 'time' | 'customDays' | 'switch';
    subtext?: string;
    validation?: ValidationRule[];
    config?: any;
    overrideFilter?: RegExp;
    mode?: 'view' | 'edit'; 
    destination?: string;
    options?: { label: string; value: any }[]; 
}

interface Section {
    sectionType: 'pills' | 'insetGroup' | 'tasks';
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

const formatDisplayValue = (rawValue: string, type: string) => {
    if (!rawValue) return type === 'date' ? 'yyyy-mm-dd' : '--:--';
    if (type === 'time') {
        const [h, m] = rawValue.split(':');
        const hh = parseInt(h);
        const ampm = hh >= 12 ? 'PM' : 'AM';
        const h12 = hh % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }
    return rawValue;
};

// --- MODULAR TASK LIST COMPONENT ---
const GlassTaskList = ({ tasks, onUpdate, styles, colors, getPressedStyle, setScrollEnabled }: any) => {
    return (
        <View style={{ marginBottom: 20 }}>
            <View style={styles.insetGroup}>
                <DraggableFlatList
                    data={tasks}
                    onDragBegin={() => setScrollEnabled(false)}
                    onDragEnd={({ data }) => {
                        onUpdate(data);
                        setScrollEnabled(true);
                    }}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    containerStyle={{ flex: 1 }}
                    renderItem={({ item, drag, isActive }: RenderItemParams<any>) => (
                        <ScaleDecorator>
                            <View
                                style={[
                                    styles.inputRow,
                                    { 
                                        backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                                        zIndex: isActive ? 999 : 1,
                                    } as any
                                ]}
                            >
                                <View
                                    {...(Platform.OS === 'web' ? { onMouseDown: drag } : {})}
                                    style={{ paddingLeft: 16, cursor: 'grab' }}
                                >
                                    <Pressable onPressIn={Platform.OS !== 'web' ? drag : undefined}>
                                        <Ionicons name="reorder-three" size={24} color={colors.mutedText} style={{ opacity: 0.5 }} />
                                    </Pressable>
                                </View>

                                <TextInput
                                    style={[styles.inputField, { flex: 1, paddingLeft: 12, color: colors.text }]}
                                    value={item.text}
                                    placeholder="Task description..."
                                    placeholderTextColor={colors.placeholderText}
                                    onChangeText={(text) => {
                                        const updated = tasks.map((t: any) => t.id === item.id ? { ...t, text } : t);
                                        onUpdate(updated);
                                    }}
                                />
                                
                                <Pressable 
                                    onPress={() => onUpdate(tasks.filter((t: any) => t.id !== item.id))}
                                    style={({ pressed }) => [getPressedStyle(pressed), { paddingHorizontal: 16 }]}
                                >
                                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                                </Pressable>
                            </View>
                            <View style={styles.divider} />
                        </ScaleDecorator>
                    )}
                />
                
                {/* REFINED ADD TASK BUTTON */}
                <Pressable
                    onPress={() => onUpdate([...tasks, { id: Date.now().toString(), text: '', completed: false }])}
                    style={({ pressed }) => [
                        getPressedStyle(pressed),
                        { 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            paddingVertical: 12, // Reduced height (was likely 16+ from inputRow)
                            paddingHorizontal: 16,
                            backgroundColor: 'transparent' // Removed the background tint to make it feel lighter
                        }
                    ]}
                >
                    <Ionicons name="add-circle" size={20} color={colors.text} style={{ opacity: 0.7 }} />
                    <Text style={{ 
                        color: colors.text, 
                        fontSize: 15, // Slightly smaller font (matches sub-labels better)
                        marginLeft: 8, 
                        fontWeight: '500',
                        opacity: 0.9 
                    }}>
                        Add Task
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

export const GlassFormRenderer = ({ schema, form, setForm, errors, setErrors }: Props) => {
    const { styles, colors, getPressedStyle } = useThemedStyles();
    const router = useRouter();
    const [scrollEnabled, setScrollEnabled] = useState(true);

    const handleUpdate = (key: string, val: any, rules: ValidationRule[] = [], overrideFilter?: RegExp, type?: string) => {
        let filteredVal = val;
        const nonTextTypes = ['date', 'time', 'switch', 'customDays', 'select-nav', 'select'];
        if (typeof val === 'string' && !nonTextTypes.includes(type || '')) {
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
        <ScrollView 
            scrollEnabled={scrollEnabled} 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ paddingBottom: 120 }}
            style={{ flex: 1 }}
        >
            {schema.map((section, sIdx) => (
                <View key={`section-${sIdx}`} style={{ marginBottom: 32 }}>
                    {section.label && <Text style={styles.fieldGroupTitle}>{section.label}</Text>}

                    {section.sectionType === 'tasks' ? (
                        <GlassTaskList 
                            tasks={form.tasks || []}
                            onUpdate={(newTasks: any) => setForm((prev: any) => ({ ...prev, tasks: newTasks }))}
                            styles={styles}
                            colors={colors}
                            getPressedStyle={getPressedStyle}
                            setScrollEnabled={setScrollEnabled}
                        />
                    ) : (
                        <View style={section.sectionType === 'insetGroup' ? styles.insetGroup : null}>
                            {section.fields.map((field, fIdx) => {
                                const isLast = fIdx === section.fields.length - 1;
                                const hasError = !!errors[field.key];
                                const isPill = section.sectionType === 'pills';
                                const isReadOnly = section.readOnly || field.mode === 'view' || !!field.destination;
                                const { defaultValue, ...cleanConfig } = field.config || {};

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

                                if (field.type === 'select-nav') {
                                    const activeOption = field.options?.find(o => o.value === form[field.key]);
                                    return (
                                        <View key={field.key}>
                                            <Pressable
                                                onPress={() => router.push({
                                                    pathname: '/calendar/selection-view',
                                                    params: { key: field.key, title: field.label, currentValue: form[field.key], options: JSON.stringify(field.options) }
                                                })}
                                                style={({ pressed }) => [getPressedStyle(pressed), { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }]}
                                            >
                                                <Text style={{ fontSize: 17, color: colors.text }}>{field.label}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 17, color: colors.mutedText, marginRight: 8 }}>{activeOption?.label || form[field.key] || 'Daily'}</Text>
                                                    <Ionicons name="chevron-forward" size={16} color={colors.mutedText} style={{ opacity: 0.5 }} />
                                                </View>
                                            </Pressable>
                                            {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                        </View>
                                    );
                                }

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

                                // --- SELECT (NATIVE DROP-DOWN / ZEEGO) ---
                                if (field.type === 'select') {
                                    const activeOption = field.options?.find(o => o.value === form[field.key]);
                                    
                                    return (
                                        <View key={field.key}>
                                            <Menu.Root>
                                                <Menu.Trigger>
                                                    <Pressable 
                                                        style={({ pressed }) => [
                                                            { 
                                                                flexDirection: 'row', 
                                                                alignItems: 'center', 
                                                                paddingHorizontal: 16, 
                                                                minHeight: 54, 
                                                                justifyContent: 'space-between' 
                                                            }, 
                                                            getPressedStyle(pressed)
                                                        ]}
                                                    >
                                                        <Text style={{ fontSize: 17, color: colors.text }}>{field.label}</Text>
                                                        
                                                        {/* The Liquid Glass Pill */}
                                                        <View style={{ 
                                                            backgroundColor: 'rgba(255,255,255,0.08)', 
                                                            paddingVertical: 5, 
                                                            paddingHorizontal: 10, 
                                                            borderRadius: 8, 
                                                            flexDirection: 'row', 
                                                            alignItems: 'center' 
                                                        }}>
                                                            <Text style={{ 
                                                                fontSize: 16, 
                                                                color: colors.mutedText, 
                                                                marginRight: 4 
                                                            }}>
                                                                {activeOption?.label || 'None'}
                                                            </Text>
                                                            <Ionicons 
                                                                name="chevron-expand" 
                                                                size={14} 
                                                                color={colors.mutedText} 
                                                                style={{ opacity: 0.5 }} 
                                                            />
                                                        </View>
                                                    </Pressable>
                                                </Menu.Trigger>

                                                <Menu.Content>
                                                    {field.options?.map((opt) => (
                                                        <Menu.Item 
                                                            key={opt.value} 
                                                            onSelect={() => handleUpdate(field.key, opt.value)}
                                                        >
                                                            <Menu.ItemTitle>{opt.label}</Menu.ItemTitle>
                                                            {/* Shows the native checkmark on the active item */}
                                                            {form[field.key] === opt.value && (
                                                                <Menu.ItemIndicator />
                                                            )}
                                                        </Menu.Item>
                                                    ))}
                                                </Menu.Content>
                                            </Menu.Root>
                                            {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                        </View>
                                    );
                                }

                                if (field.type === 'customDays') {
                                    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                                    const selected = typeof form[field.key] === 'string' ? JSON.parse(form[field.key] || '[]') : [];
                                    return (
                                        <View key={field.key} style={{ padding: 16 }}>
                                            <Text style={localStyles.subLabel}>{field.label}</Text>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                {days.map((day, dIdx) => (
                                                    <Pressable key={dIdx} onPress={() => toggleDay(field.key, dIdx)} style={({ pressed }) => [getPressedStyle(pressed), { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: selected.includes(dIdx) ? colors.text : colors.glassBackground }]}>
                                                        <Text style={{ color: selected.includes(dIdx) ? colors.background : colors.text, fontWeight: '700' }}>{day}</Text>
                                                    </Pressable>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                }

                                if (field.type === 'date' || field.type === 'time') {
                                    const isWeb = Platform.OS === 'web';
                                    const rawValue = form[field.key];
                                    const displayValue = formatDisplayValue(rawValue, field.type);

                                    return (
                                        <View key={field.key} style={{ position: 'relative', overflow: 'hidden' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }}>
                                                <Text style={{ fontSize: 17, color: colors.text }}>{field.label}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                    {isWeb ? (
                                                        <>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 4 }}>
                                                                <Text style={{ fontSize: 18, color: rawValue ? colors.text : colors.mutedText, marginRight: 10, fontVariant: ['tabular-nums'], letterSpacing: -0.4, fontFamily: 'system-ui, -apple-system, sans-serif' }}>{displayValue}</Text>
                                                                <Ionicons name={field.type === 'date' ? "calendar" : "time"} size={20} color={colors.mutedText} style={{ opacity: 0.8 }} />
                                                            </View>
                                                            <input type={field.type} value={rawValue || ''} onChange={(e) => handleUpdate(field.key, e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10, border: 'none', outline: 'none', WebkitAppearance: 'none' } as any} />
                                                        </>
                                                    ) : (
                                                        <DateTimePicker value={new Date(form[field.key] ? (field.type === 'date' ? `${form[field.key]}T00:00:00` : `2000-01-01T${form[field.key]}`) : Date.now())} mode={field.type} display={Platform.OS === 'ios' ? 'compact' : 'default'} onChange={(e, d) => d && handleUpdate(field.key, field.type === 'date' ? d.toISOString().split('T')[0] : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))} textColor={colors.text} themeVariant={colors.isDark ? 'dark' : 'light'} />
                                                    )}
                                                </View>
                                            </View>
                                            {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                        </View>
                                    );
                                }

                                return (
                                    <View key={field.key} style={{ marginBottom: isPill ? (hasError ? 4 : 16) : 0 }}>
                                        <View style={isPill ? [styles.inputContainer, hasError && { borderColor: colors.error, borderWidth: 1.5 }] : [styles.inputRow, { position: 'relative' }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: isPill ? 0 : 16, minHeight: 54 }}>
                                                {!isPill && <Text style={{ fontSize: 17, color: colors.text, marginRight: 10 }}>{field.label}</Text>}
                                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                                    <TextInput style={[styles.inputField, !isPill && { textAlign: 'right', paddingRight: (form[field.key] && form[field.key].length > 0) ? 32 : 0, color: colors.mutedText }]} value={form[field.key] ?? ''} placeholder={isPill ? field.label : ''} placeholderTextColor={colors.placeholderText} onChangeText={(t) => handleUpdate(field.key, t, field.validation, field.overrideFilter, field.type)} secureTextEntry={field.type === 'password'} keyboardType={field.type === 'email' ? 'email-address' : field.type === 'phone' ? 'phone-pad' : field.type === 'url' ? 'url' : 'default'} dataSet={{ 'glass-input': 'true', 'inset-input': !isPill }} {...cleanConfig} />
                                                </View>
                                                {!!(form[field.key] && form[field.key].length > 0) && (
                                                    <View style={{ position: 'absolute', right: isPill ? 12 : 16 }}>
                                                        <Pressable onPress={() => handleUpdate(field.key, '', field.validation)} style={({ pressed }) => [getPressedStyle(pressed), { padding: 4 }]}><Ionicons name="close-circle" size={18} color={hasError ? colors.error : colors.placeholderText} /></Pressable>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        {hasError && <Text style={[styles.errorSubtext, { marginLeft: isPill ? 16 : 20 }]}>{errors[field.key]}</Text>}
                                        {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                    {section.footer && <Text style={styles.groupFootnote}>{section.footer}</Text>}
                </View>
            ))}
        </ScrollView>
    );
};

const localStyles = StyleSheet.create({
    subLabel: { color: '#888', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', fontWeight: '600' }
});
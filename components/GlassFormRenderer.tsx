import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, Switch, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { validateValue, ValidationRule } from '../utils/ValidationEngine';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { BlurView } from 'expo-blur';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
import * as Crypto from 'expo-crypto';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    isRepeater?: boolean;
    repeaterKey?: string;
    config?: {
        showCheckmark?: boolean;
        enableSwipeDelete?: boolean;
    };
}

interface Props {
    schema: Section[];
    form: any;
    setForm: (form: any) => void;
    errors: any;
    setErrors: (errors: any) => void;
}

const formatDisplayValue = (rawValue: string, type: string) => {
    if (!rawValue || rawValue === '') return 'Not set';
    if (type === 'time') {
        const [h, m] = rawValue.split(':');
        const hh = parseInt(h);
        const ampm = hh >= 12 ? 'PM' : 'AM';
        const h12 = hh % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }
    return rawValue;
};

const GlassTaskList = ({ tasks, onUpdate, styles, colors, getPressedStyle, setScrollEnabled, config }: any) => {
    const showCheckmark = config?.showCheckmark !== false;
    const enableSwipeDelete = config?.enableSwipeDelete !== false;
    
    const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>, 
        dragX: Animated.AnimatedInterpolation<number>, 
        id: string
    ) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [0, 80],
            extrapolate: 'clamp',
        });

        return (
            <View style={{ 
                width: 80, 
                flexDirection: 'row',
                justifyContent: 'flex-end', 
                alignItems: 'center',
                paddingVertical: 4, 
                paddingRight: 8,
                backgroundColor: 'transparent'
            }}>
                <RectButton 
                    style={{
                        backgroundColor: colors.error,
                        width: 60,           
                        height: '85%',       
                        borderRadius: 12,    
                        justifyContent: 'center',
                        alignItems: 'center',
                    }} 
                    onPress={() => {
                        const updated = (tasks || []).filter((t: any) => t?.id !== id);
                        onUpdate(updated);
                    }}
                >
                    <Animated.View style={{ transform: [{ translateX: trans }] }}>
                        <Ionicons name="trash-outline" size={22} color="#FFF" />
                    </Animated.View>
                </RectButton>
            </View>
        );
    };

    return (
        <View style={{ marginBottom: 20 }}>
            <View style={styles.insetGroup}>
                <DraggableFlatList
                    data={tasks || []}
                    onDragBegin={() => setScrollEnabled(false)}
                    onDragEnd={({ data }) => {
                        onUpdate(data);
                        setScrollEnabled(true);
                    }}
                    keyExtractor={(item) => item?.id || Crypto.randomUUID()}
                    scrollEnabled={false}
                    renderItem={({ item, drag, isActive }: RenderItemParams<any>) => {
                        // Strict check: Only strike if showCheckmark is true, item is completed, AND text is not empty
                        const itemText = item?.text || item?.title || '';
                        const shouldStrike = showCheckmark && item?.completed && itemText.trim().length > 0;

                        const rowContent = (
                            <View style={[
                                styles.inputRow, 
                                { 
                                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.glassBackground, 
                                    zIndex: isActive ? 999 : 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    minHeight: 54,
                                    width: SCREEN_WIDTH - 32,
                                }
                            ] as any}>
                                <Pressable onLongPress={drag} delayLongPress={150} style={{ paddingLeft: 16 }}>
                                    <Ionicons name="reorder-three" size={24} color={colors.mutedText} style={{ opacity: 0.5 }} />
                                </Pressable>
                                
                                <TextInput
                                    style={[
                                        styles.inputField, 
                                        { 
                                            flex: 1, 
                                            paddingLeft: 12, 
                                            color: colors.text,
                                            textAlign: 'left',
                                            minHeight: 0,
                                            overflow: 'hidden',
                                        },
                                        shouldStrike && { textDecorationLine: 'line-through', opacity: 0.5 }
                                    ]}
                                    value={itemText}
                                    placeholder="Task description..."
                                    placeholderTextColor={colors.placeholderText}
                                    onChangeText={(text) => {
                                        const updated = tasks.map((t: any) => t?.id === item?.id ? { ...t, text, title: text } : t);
                                        onUpdate(updated);
                                    }}
                                />

                                {showCheckmark ? (
                                    <Pressable 
                                        onPress={() => {
                                            const updated = tasks.map((t: any) => 
                                                t?.id === item?.id ? { ...t, completed: !t?.completed } : t
                                            );
                                            onUpdate(updated);
                                        }} 
                                        style={({ pressed }) => [getPressedStyle(pressed), { paddingHorizontal: 16 }]}
                                    >
                                        <Ionicons 
                                            name={item?.completed ? "checkmark-circle" : "ellipse-outline"} 
                                            size={24} 
                                            color={item?.completed ? colors.success : colors.mutedText} 
                                        />
                                    </Pressable>
                                ) : (
                                    <Pressable 
                                        onPress={() => {
                                            const updated = (tasks || []).filter((t: any) => t?.id !== item?.id);
                                            onUpdate(updated);
                                        }}
                                        style={({ pressed }) => [
                                            getPressedStyle(pressed), 
                                            { 
                                                paddingHorizontal: 16,
                                                justifyContent: 'center',
                                                alignItems: 'center'
                                            }
                                        ]}
                                    >
                                        <View style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 19,
                                            backgroundColor: colors.error,
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }}>
                                            <Ionicons 
                                                name="trash-outline" 
                                                size={20} 
                                                color="#FFFFFF"
                                            />
                                        </View>
                                    </Pressable>
                                )}
                            </View>
                        );

                        return (
                            <ScaleDecorator>
                                {enableSwipeDelete ? (
                                    <Swipeable 
                                        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
                                        friction={2}
                                        rightThreshold={40}
                                        overshootRight={false}
                                        containerStyle={{ backgroundColor: 'transparent' }}
                                    >
                                        {rowContent}
                                    </Swipeable>
                                ) : (
                                    rowContent
                                )}
                                <View style={styles.divider} />
                            </ScaleDecorator>
                        );
                    }}
                />
                <Pressable
                    onPress={() => onUpdate([...(tasks || []), { id: Crypto.randomUUID(), text: '', title: '', completed: false }])}
                    style={({ pressed }) => [getPressedStyle(pressed), { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', padding: 16 }]}
                >
                    <Ionicons name="add-circle" size={20} color={colors.text} style={{ opacity: 0.7 }} />
                    <Text style={{ color: colors.text, fontSize: 15, marginLeft: 8, fontWeight: '500' }}>Add Task</Text>
                </Pressable>
            </View>
        </View>
    );
};

export const GlassFormRenderer = ({ schema, form, setForm, errors, setErrors }: Props) => {
    const { styles, colors, getPressedStyle } = useThemedStyles();
    const router = useRouter();
    const [scrollEnabled, setScrollEnabled] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);
    const [activeMenuField, setActiveMenuField] = useState<Field | null>(null);
    const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);

    const inputRefs = useRef<{[key: string]: any}>({});

    const updateTaskSection = (repeaterKey: string | undefined, index: number | undefined, newTasks: any[]) => {
        setForm((prev: any) => {
            const nextForm = { ...prev };
            if (repeaterKey && typeof index === 'number') {
                const updatedArray = [...(prev[repeaterKey] || [])];
                updatedArray[index] = { ...updatedArray[index], tasks: newTasks };
                nextForm[repeaterKey] = updatedArray;
            } else {
                nextForm.tasks = newTasks;
            }
            return nextForm;
        });
    };

    const handleUpdate = (key: string, val: any, rules: ValidationRule[] = [], overrideFilter?: RegExp, type?: string, index?: number, repeaterKey?: string) => {
        let filteredVal = val;
        const nonTextTypes = ['date', 'time', 'switch', 'customDays', 'select-nav', 'select'];
        if (typeof val === 'string' && !nonTextTypes.includes(type || '')) {
            if (overrideFilter) filteredVal = val.replace(overrideFilter, '');
            else {
                if (type === 'email' || key === 'email') filteredVal = val.replace(/[^a-zA-Z0-9@._%+-]/g, '');
                else if (type === 'phone' || key === 'phone') filteredVal = val.replace(/[^0-9+\-\(\)\s,;*#]/g, '');
                else if (type === 'url' || key === 'url') filteredVal = val.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]/g, '');
                else if (key === 'name') filteredVal = val.replace(/[^a-zA-Z\s\-']/g, '');
            }
        }

        if (repeaterKey && typeof index === 'number') {
            setForm((prev: any) => {
                const updatedArray = JSON.parse(JSON.stringify(prev[repeaterKey] || []));
                if (updatedArray[index]) {
                    updatedArray[index][key] = filteredVal;
                }
                return { ...prev, [repeaterKey]: updatedArray };
            });
            const errorKey = `${repeaterKey}.${index}.${key}`;
            const errorMsg = validateValue(filteredVal, rules);
            setErrors((prev: any) => ({ ...prev, [errorKey]: errorMsg }));
        } else {
            setForm((prev: any) => ({ ...prev, [key]: filteredVal }));
            const errorMsg = validateValue(filteredVal, rules);
            setErrors((prev: any) => ({ ...prev, [key]: errorMsg }));
        }
    };

    const toggleDay = (key: string, dayIndex: number, index?: number, repeaterKey?: string) => {
        const currentVal = (repeaterKey && typeof index === 'number') ? form[repeaterKey]?.[index]?.[key] : form[key];
        let currentDays: number[] = [];
        try { currentDays = typeof currentVal === 'string' ? JSON.parse(currentVal) : (currentVal || []); } catch (e) { currentDays = []; }
        const nextDays = currentDays.includes(dayIndex) ? currentDays.filter(d => d !== dayIndex) : [...currentDays, dayIndex].sort();
        handleUpdate(key, JSON.stringify(nextDays), [], undefined, 'customDays', index, repeaterKey);
    };

    const renderField = (field: Field, isLast: boolean, section: Section, sIdx: number, index?: number, repeaterKey?: string) => {
        if (field.key === 'customDays') {
            const currentType = (repeaterKey && typeof index === 'number') ? form[repeaterKey]?.[index]?.type : form.type;
            if (currentType !== 'custom') return null;
        }
        
        const errorKey = repeaterKey && typeof index === 'number' ? `${repeaterKey}.${index}.${field.key}` : field.key;
        const hasError = !!errors[errorKey];
        const isPill = section.sectionType === 'pills';
        const isReadOnly = section.readOnly || field.mode === 'view' || !!field.destination;
        const currentVal = (repeaterKey && typeof index === 'number') ? form[repeaterKey]?.[index]?.[field.key] : form[field.key];
        const valStr = String(currentVal ?? '');
        const hasValue = valStr.length > 0 && valStr !== '';
        
        const { defaultValue, ...cleanConfig } = field.config || {};
        const displayLabel = field.label.replace(/\(Optional\)/gi, '').trim();

        return (
            <View key={`f-row-${sIdx}-${field.key}-${index ?? 'm'}`}>
                {(() => {
                    if (isReadOnly) {
                        return (
                            <Pressable disabled={!field.destination} onPress={() => field.destination && router.push(field.destination as any)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }, field.destination && getPressedStyle(pressed)]}>
                                <Text style={{ fontSize: 17, color: colors.text }}>{displayLabel}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1, marginLeft: 20 }}>
                                    <Text numberOfLines={1} style={{ fontSize: 17, color: colors.mutedText, textAlign: 'right', marginRight: field.destination ? 8 : 0 }}>{currentVal || 'Not set'}</Text>
                                    {field.destination && <Ionicons name="chevron-forward" size={16} color={colors.mutedText} style={{ opacity: 0.5 }} />}
                                </View>
                            </Pressable>
                        );
                    }

                    if (field.type === 'date' || field.type === 'time') {
                        const isDate = field.type === 'date';
                        const isOptional = field.key.toLowerCase().includes('end');

                        if (Platform.OS === 'web') {
                            const refKey = `${field.key}-${index ?? 'main'}`;
                            return (
                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 17, color: colors.text, flex: 1 }}>{displayLabel}</Text>
                                    <Pressable 
                                        onPress={() => inputRefs.current[refKey]?.showPicker?.()} 
                                        style={({ pressed }) => [
                                            { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
                                            getPressedStyle(pressed)
                                        ]}
                                    >
                                        <Text style={{ fontSize: 17, color: hasValue ? colors.text : colors.placeholderText }}>
                                            {hasValue ? (isDate ? currentVal : formatDisplayValue(currentVal, 'time')) : 'Not set'}
                                        </Text>
                                        <input 
                                            ref={el => inputRefs.current[refKey] = el}
                                            type={field.type} 
                                            value={currentVal || ""}
                                            onChange={(e) => handleUpdate(field.key, e.target.value, [], undefined, field.type, index, repeaterKey)}
                                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                                        />
                                    </Pressable>
                                </View>
                            );
                        }

                        const dateObj = new Date(hasValue ? (isDate ? `${currentVal}T00:00:00` : `1970-01-01T${currentVal}`) : Date.now());
                        
                        return (
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 17, color: colors.text, flex: 1 }} numberOfLines={1}>{displayLabel}</Text>
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    {!hasValue ? (
                                        <Pressable 
                                            onPress={() => handleUpdate(field.key, isDate ? new Date().toISOString().split('T')[0] : '08:00', [], undefined, field.type, index, repeaterKey)}
                                            style={({ pressed }) => [getPressedStyle(pressed), { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20 }]}
                                        >
                                            <Text style={{ fontSize: 17, color: colors.placeholderText }}>Not set</Text>
                                        </Pressable>
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <DateTimePicker 
                                                value={isNaN(dateObj.getTime()) ? new Date() : dateObj} 
                                                mode={field.type} 
                                                display="compact" 
                                                onChange={(e, d) => {
                                                    if (d) {
                                                        handleUpdate(field.key, isDate ? d.toISOString().split('T')[0] : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), [], undefined, field.type, index, repeaterKey);
                                                    }
                                                }} 
                                                textColor={colors.text} 
                                                themeVariant={colors.isDark ? 'dark' : 'light'} 
                                            />
                                            {isOptional && (
                                                <Pressable 
                                                    onPress={() => handleUpdate(field.key, '', [], undefined, field.type, index, repeaterKey)}
                                                    style={({ pressed }) => [getPressedStyle(pressed), { marginLeft: 10, padding: 2 }]}
                                                >
                                                    <Ionicons name="close-circle" size={22} color={colors.mutedText} style={{ opacity: 0.6 }} />
                                                </Pressable>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    }

                    if (field.type === 'select') {
                        const activeOption = field.options?.find(o => o.value === currentVal);
                        return (
                            <Pressable onPress={() => { setActiveMenuField({ ...field }); setActiveMenuIndex(index ?? null); setMenuVisible(true); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }, getPressedStyle(pressed)]}>
                                <Text style={{ fontSize: 17, color: colors.text }}>{displayLabel}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 17, color: colors.mutedText, marginRight: 4 }}>{activeOption?.label || 'None'}</Text>
                                    <Ionicons name="chevron-expand" size={16} color={colors.mutedText} style={{ opacity: 0.6 }} />
                                </View>
                            </Pressable>
                        );
                    }

                    if (field.type === 'select-nav') {
                        const activeOption = field.options?.find(o => o.value === currentVal);
                        return (
                            <Pressable
                                onPress={() => router.push({
                                    pathname: '/calendar/selection-view',
                                    params: { 
                                        key: field.key, title: field.label, currentValue: currentVal, options: JSON.stringify(field.options),
                                        index: index !== undefined ? index.toString() : undefined,
                                        repeaterKey: repeaterKey ?? undefined
                                    }
                                })}
                                style={({ pressed }) => [getPressedStyle(pressed), { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }]}
                            >
                                <Text style={{ fontSize: 17, color: colors.text }}>{displayLabel}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 17, color: colors.mutedText, marginRight: 8 }}>{activeOption?.label || currentVal || 'Daily'}</Text>
                                    <Ionicons name="chevron-forward" size={16} color={colors.mutedText} style={{ opacity: 0.5 }} />
                                </View>
                            </Pressable>
                        );
                    }

                    if (field.type === 'switch') {
                        return (
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 54, justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 17, color: colors.text }}>{displayLabel}</Text>
                                <Switch value={!!currentVal} onValueChange={(val) => handleUpdate(field.key, val, [], undefined, 'switch', index, repeaterKey)} trackColor={{ false: colors.glassBorder, true: colors.success }} thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'} />
                            </View>
                        );
                    }

                    if (field.type === 'customDays') {
                        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                        const selected = typeof currentVal === 'string' ? JSON.parse(currentVal || '[]') : [];
                        return (
                            <View style={{ padding: 16 }}>
                                <Text style={localStyles.subLabel}>{displayLabel}</Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    {days.map((day, dIdx) => (
                                        <Pressable key={dIdx} onPress={() => toggleDay(field.key, dIdx, index, repeaterKey)} style={({ pressed }) => [getPressedStyle(pressed), { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: selected.includes(dIdx) ? colors.text : colors.glassBackground }]}>
                                            <Text style={{ color: selected.includes(dIdx) ? colors.background : colors.text, fontWeight: '700' }}>{day}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        );
                    }

                    return (
                        <View style={isPill ? [styles.inputContainer, hasError && { borderColor: colors.error, borderWidth: 1.5 }] : [styles.inputRow]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: isPill ? 0 : 16, minHeight: 54 }}>
                                {!isPill && <Text style={{ fontSize: 17, color: colors.text, marginRight: 10 }}>{displayLabel}</Text>}
                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                    <TextInput 
                                        style={[styles.inputField, !isPill && { textAlign: 'right', paddingRight: hasValue ? 30 : 0, color: colors.mutedText }]} 
                                        value={valStr} placeholder={isPill ? field.label : ''} placeholderTextColor={colors.placeholderText} 
                                        onChangeText={(t) => handleUpdate(field.key, t, field.validation, undefined, undefined, index, repeaterKey)} 
                                        dataSet={{ 'glass-input': 'true', 'inset-input': !isPill ? 'true' : 'false' }} {...cleanConfig} 
                                    />
                                </View>
                                {hasValue && (
                                    <View style={{ position: 'absolute', right: isPill ? 12 : 16 }}>
                                        <Pressable onPress={() => handleUpdate(field.key, '', field.validation, undefined, undefined, index, repeaterKey)} style={({ pressed }) => [getPressedStyle(pressed), { padding: 4 }]}>
                                            <Ionicons name="close-circle" size={18} color={hasError ? colors.error : colors.placeholderText} />
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })()}
                {hasError && <Text style={{ color: colors.error, fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 }}>{errors[errorKey]}</Text>}
                {!isLast && section.sectionType === 'insetGroup' && <View style={styles.divider} />}
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView scrollEnabled={scrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {schema.map((section, sIdx) => (
                    <View key={`s-${sIdx}`} style={{ marginBottom: 32 }}>
                        {!!section.label && <Text style={styles.fieldGroupTitle}>{section.label}</Text>}
                        
                        {section.sectionType === 'tasks' ? (
                            <GlassTaskList 
                                tasks={form.tasks || []} 
                                onUpdate={(newTasks: any) => updateTaskSection(undefined, undefined, newTasks)} 
                                styles={styles} 
                                colors={colors} 
                                getPressedStyle={getPressedStyle} 
                                setScrollEnabled={setScrollEnabled} 
                                config={section.config}
                            />
                        ) : section.isRepeater && section.repeaterKey ? (
                            <View>
                                {(form[section.repeaterKey] || []).map((item: any, rIdx: number) => (
                                    <View key={`rep-${sIdx}-${rIdx}`} style={[styles.insetGroup, { marginBottom: 12 }]}>
                                        {section.fields.map((field, fIdx) => renderField(field, fIdx === section.fields.length - 1, section, sIdx, rIdx, section.repeaterKey))}
                                        
                                        {item.hasOwnProperty('tasks') && Array.isArray(item.tasks) && (
                                            <GlassTaskList 
                                                tasks={item.tasks || []} 
                                                onUpdate={(newTasks: any) => updateTaskSection(section.repeaterKey, rIdx, newTasks)}
                                                styles={styles} 
                                                colors={colors} 
                                                getPressedStyle={getPressedStyle} 
                                                setScrollEnabled={setScrollEnabled}
                                                config={section.config}
                                            />
                                        )}

                                        <Pressable 
                                            onPress={() => {
                                                setForm((prev: any) => {
                                                    const updated = JSON.parse(JSON.stringify(prev[section.repeaterKey!] || []));
                                                    updated.splice(rIdx, 1);
                                                    return { ...prev, [section.repeaterKey!]: updated };
                                                });
                                            }}
                                            style={({ pressed }) => [getPressedStyle(pressed), { padding: 12, alignItems: 'center' }]}
                                        >
                                            <View style={{
                                                backgroundColor: 'rgba(255, 59, 48, 0.15)',
                                                borderRadius: 25,
                                                paddingHorizontal: 24,
                                                paddingVertical: 10,
                                                borderWidth: 1,
                                                borderColor: 'rgba(255, 59, 48, 0.25)'
                                            }}>
                                                <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: '600' }}>
                                                    Remove {section.label?.replace(/s$/i, '') || 'Block'}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    </View>
                                ))}
                                <Pressable 
                                    onPress={() => {
                                        setForm((prev: any) => {
                                            const newItem = section.fields.reduce((acc, curr) => ({ ...acc, [curr.key]: '' }), {
                                                id: Crypto.randomUUID(),
                                                type: 'daily',
                                                startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
                                                startDate: new Date().toISOString().split('T')[0]
                                            });
                                            return { ...prev, [section.repeaterKey!]: [...(prev[section.repeaterKey!] || []), JSON.parse(JSON.stringify(newItem))] };
                                        });
                                    }}
                                    style={({ pressed }) => [getPressedStyle(pressed), { flexDirection: 'row', alignItems: 'center', padding: 16 }]}
                                >
                                    <Ionicons name="add-circle" size={20} color={colors.text} style={{ opacity: 0.7 }} />
                                    <Text style={{ color: colors.text, fontSize: 15, marginLeft: 8, fontWeight: '500' }}>Add {section.label?.replace(/s$/i, '') || 'Block'}</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <View style={section.sectionType === 'insetGroup' ? styles.insetGroup : null}>
                                {section.fields.map((field, fIdx) => renderField(field, fIdx === section.fields.length - 1, section, sIdx))}
                            </View>
                        )}
                        {!!section.footer && <Text style={section.sectionType === 'tasks' ? [styles.groupFootnote, { marginTop: -15 }] : styles.groupFootnote}>{section.footer}</Text>}
                    </View>
                ))}
            </ScrollView>

            <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <Pressable style={localStyles.modalOverlay} onPress={() => setMenuVisible(false)}>
                    <View style={localStyles.menuWrapper}>
                        <BlurView intensity={95} tint={colors.isDark ? 'dark' : 'light'} style={localStyles.menuContainer}>
                            {activeMenuField?.options?.map((opt, i) => {
                                const repeaterSection = schema.find(s => s.isRepeater && s.fields.some(f => f.key === activeMenuField.key));
                                const repeaterKey = repeaterSection?.repeaterKey;
                                const currentVal = (repeaterKey && typeof activeMenuIndex === 'number') 
                                    ? form[repeaterKey]?.[activeMenuIndex]?.[activeMenuField.key] 
                                    : form[activeMenuField.key];

                                return (
                                    <Pressable 
                                        key={`m-${activeMenuField.key}-${opt.value}`} 
                                        onPress={() => { 
                                            handleUpdate(activeMenuField.key, opt.value, [], undefined, 'select', activeMenuIndex ?? undefined, repeaterKey); 
                                            setMenuVisible(false); 
                                        }}
                                        style={({ pressed }) => [
                                            localStyles.menuItem, 
                                            pressed && { backgroundColor: 'rgba(255,255,255,0.1)' }, 
                                            i !== 0 && { borderTopWidth: 0.5, borderTopColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                        ]}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 17, flex: 1 }}>{opt.label}</Text>
                                        {currentVal === opt.value && <Ionicons name="checkmark" size={20} color={colors.text} />}
                                    </Pressable>
                                );
                            })}
                        </BlurView>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
};

const localStyles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    menuWrapper: { width: '85%', maxWidth: 280, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
    menuContainer: { borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)' },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 48 },
    subLabel: { color: '#888', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', fontWeight: '600' },
    deleteAction: { flex: 1, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 20 }
});
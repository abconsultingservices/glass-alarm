import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, Animated, ScrollView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dbService } from '../../services/DatabaseService';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { GlassFormRenderer } from '../../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState, validateValue } from '../../utils/ValidationEngine';
import { fieldRegistry } from '../../services/FieldRegistry';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

export default function AddRoutine() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { styles, colors, getPressedStyle } = useThemedStyles(); 

    // --- DYNAMIC SCHEMA GENERATION ---
    const schema = useMemo(() => [
        {
            sectionType: 'insetGroup' as const,
            label: 'ROUTINE INFO',
            fields: [
                { key: 'name', ...fieldRegistry.routines.name },
                { key: 'duration', ...fieldRegistry.routines.duration },
                { key: 'isEnabled', ...fieldRegistry.routines.isEnabled },
                { key: 'repeatType', ...fieldRegistry.routine_schedules.repeatType },
            ]
        },
        {
            sectionType: 'insetGroup' as const,
            label: 'SCHEDULE',
            footer: 'Multi-hit routines automatically expand on your calendar.',
            fields: [
                { key: 'startDate', ...fieldRegistry.routine_schedules.startDate },
                { key: 'startTime', ...fieldRegistry.routine_schedules.startTime },
                { key: 'endDate', ...fieldRegistry.routine_schedules.endDate },
                { key: 'type', ...fieldRegistry.routine_schedules.type },
            ]
        }
    ], []);

    const [form, setForm] = useState(() => {
        const initial = getInitialFormState(schema);
        schema.forEach(section => {
            section.fields.forEach(field => {
                if (field.config?.defaultValue !== undefined) {
                    initial[field.key] = field.config.defaultValue;
                }
            });
        });

        return { 
            ...initial,
            type: initial.type || 'daily', 
            startDate: initial.startDate || new Date().toISOString().split('T')[0],
            startTime: initial.startTime || '08:00',
            duration: '30',
            tasks: [] // Initialize task list for the Tasks tab
        };
    });

    const [errors, setErrors] = useState(() => getInitialErrorState(schema));
    const [activeTab, setActiveTab] = useState('Routine'); 
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // --- SELECTION ROUND-TRIP HANDLER ---
    useFocusEffect(
        useCallback(() => {
            const checkSelections = async () => {
                const selectedType = await AsyncStorage.getItem('selection_temp_type');
                if (selectedType) {
                    setForm((prev: any) => ({ ...prev, type: selectedType }));
                    await AsyncStorage.removeItem('selection_temp_type');
                }
            };
            checkSelections();
        }, [])
    );

    // --- RE-CALCULATE SCHEMA BASED ON TAB & SELECTION ---
    const activeSchema = useMemo(() => {
        // If we are on the Tasks tab, return the task list schema
        if (activeTab === 'Tasks') {
            return [{
                sectionType: 'tasks' as const,
                label: 'ROUTINE TASKS',
                footer: 'Add steps to your routine. Long-press the handle to reorder.',
                fields: [] 
            }];
        }

        // Otherwise, return the standard Routine settings
        const base = JSON.parse(JSON.stringify(schema));
        if (form.type === 'custom') {
            base[1].fields.push({ key: 'customDays', ...fieldRegistry.routine_schedules.customDays });
        }
        base[1].fields.push({ key: 'frequencyHours', ...fieldRegistry.routine_schedules.frequencyHours });
        base[1].fields.push({ key: 'maxOccurrences', ...fieldRegistry.routine_schedules.maxOccurrences });
        return base;
    }, [form.type, schema, activeTab]);

    const hasErrors = useMemo(() => {
        const hasActiveErrors = Object.values(errors).some(e => !!e);
        const isNameMissing = !form?.name?.trim();
        const isTimeMissing = !form?.startTime;
        return hasActiveErrors || isNameMissing || isTimeMissing;
    }, [errors, form]);

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
        ]).start();
    };

    const handleSave = async () => {
        const newErrors: any = {};
        let hasValidationError = false;

        // Final validation sweep (Routine settings are mandatory)
        schema.forEach((section: any) => {
            section.fields.forEach((field: any) => {
                if (field.validation) {
                    const errorMsg = validateValue(form[field.key], field.validation);
                    if (errorMsg) {
                        newErrors[field.key] = errorMsg;
                        hasValidationError = true;
                    }
                }
            });
        });

        if (hasValidationError) {
            setActiveTab('Routine'); // Snap back to settings tab so they see what's wrong
            setErrors(newErrors);
            triggerShake();
            return;
        }

        const success = await dbService.createRoutine(form.name, parseInt(form.duration), {
            type: form.type,
            startDate: form.startDate,
            startTime: form.startTime,
            endDate: form.endDate || null,
            endTime: null,
            customDays: form.type === 'custom' ? form.customDays : null,
            frequencyHours: form.frequencyHours ? parseInt(form.frequencyHours) : null,
            maxOccurrences: form.maxOccurrences ? parseInt(form.maxOccurrences) : 1,
            tasks: form.tasks // Pass the task array to the DB service
        });

        if (success) router.back();
    };

    return (
        <View style={styles.modalContainer}>
            <View style={styles.sheetHandleContainer}><View style={styles.sheetHandle} /></View>
            
            <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.circularButton, getPressedStyle(pressed)]}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
                
                <Text style={styles.modalTitle}>New Routine</Text>

                <Pressable 
                    onPress={handleSave} 
                    style={({ pressed }) => [
                        styles.circularButton, 
                        getPressedStyle(pressed),
                        hasErrors && { backgroundColor: 'rgba(255, 69, 58, 0.15)', borderColor: colors.error }
                    ]}
                >
                    <Ionicons name="checkmark" size={24} color={hasErrors ? colors.error : colors.text} />
                </Pressable>
            </View>

            <View style={styles.segmentContainer}>
                <View style={styles.segmentBackground}>
                    {['Routine', 'Tasks'].map((tab) => (
                        <Pressable 
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[styles.segmentItem, activeTab === tab && styles.segmentItemActive]}
                        >
                            <Text style={[styles.segmentText, activeTab === tab && { fontWeight: '600' }]}>{tab}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <GlassFormRenderer 
                        schema={activeSchema}
                        form={form}
                        setForm={setForm}
                        errors={errors}
                        setErrors={setErrors}
                    />
                </Animated.View>
            </ScrollView>
        </View>
    );
}
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, Animated, ScrollView, Platform, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dbService } from '../../services/DatabaseService';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { GlassFormRenderer } from '../../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState, validateValue } from '../../utils/ValidationEngine';
import { fieldRegistry } from '../../services/FieldRegistry';
import { Ionicons } from '@expo/vector-icons';

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
            ]
        },
        {
            sectionType: 'insetGroup' as const,
            label: 'SCHEDULES',
            isRepeater: true,
            repeaterKey: 'schedules',
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
        
        // Ensure schedules is initialized as an array with one default entry
        return { 
            ...initial,
            name: '',
            duration: '30',
            schedules: [{
                type: 'daily',
                startDate: new Date().toISOString().split('T')[0],
                startTime: '08:00',
                customDays: '[]',
                frequencyHours: '',
                maxOccurrences: '1'
            }],
            tasks: [] 
        };
    });

    const [errors, setErrors] = useState(() => getInitialErrorState(schema));
    const [activeTab, setActiveTab] = useState('Routine'); 
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // --- SELECTION EVENT LISTENER (Prevents State Reset) ---
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('FORM_FIELD_UPDATE', (data) => {
            const { key, value, index, repeaterKey } = data;

            setForm((prev: any) => {
                // Deep clone to ensure no shared references
                const newForm = JSON.parse(JSON.stringify(prev));

                if (repeaterKey && typeof index === 'number') {
                    if (newForm[repeaterKey] && newForm[repeaterKey][index]) {
                        newForm[repeaterKey][index][key] = value;
                    }
                } else {
                    newForm[key] = value;
                }
                return newForm;
            });
        });

        return () => subscription.remove();
    }, []);

    // --- RE-CALCULATE SCHEMA BASED ON TAB ---
    const activeSchema = useMemo(() => {
        if (activeTab === 'Tasks') {
            return [{
                sectionType: 'tasks' as const,
                label: 'ROUTINE TASKS',
                footer: 'Add steps to your routine. Long-press the handle to reorder.',
                fields: [] 
            }];
        }

        const base = JSON.parse(JSON.stringify(schema));
        
        // Note: GlassFormRenderer handles the individual field visibility 
        // within repeater blocks, but we can augment the base definition here 
        // if we want specific fields available for all schedules
        const scheduleSection = base.find((s: any) => s.repeaterKey === 'schedules');
        if (scheduleSection) {
            scheduleSection.fields.push({ key: 'customDays', ...fieldRegistry.routine_schedules.customDays });
            scheduleSection.fields.push({ key: 'frequencyHours', ...fieldRegistry.routine_schedules.frequencyHours });
            scheduleSection.fields.push({ key: 'maxOccurrences', ...fieldRegistry.routine_schedules.maxOccurrences });
        }

        return base;
    }, [activeTab, schema]);

    const hasErrors = useMemo(() => {
        const hasActiveErrors = Object.values(errors).some(e => !!e);
        const isNameMissing = !form?.name?.trim();
        return hasActiveErrors || isNameMissing;
    }, [errors, form]);

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
        ]).start();
    };

    const handleSave = async () => {
        if (hasErrors) {
            setActiveTab('Routine');
            triggerShake();
            return;
        }

        // Pass the entire schedules array to the database service
        const success = await dbService.createRoutine(
            form.name, 
            parseInt(form.duration), 
            form.schedules, // Updated to pass Array
            form.tasks
        );

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
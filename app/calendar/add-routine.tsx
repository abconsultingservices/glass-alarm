import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, Animated, ScrollView, Platform, DeviceEventEmitter, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dbService } from '../../services/DatabaseService';
import { RoutineService } from '../../services/routineService'; // Added
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { GlassFormRenderer } from '../../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState, validateForm } from '../../utils/ValidationEngine';
import { fieldRegistry } from '../../services/FieldRegistry';
import { Ionicons } from '@expo/vector-icons';

export default function AddRoutine() {
    const router = useRouter();
    const params = useLocalSearchParams(); 
    const insets = useSafeAreaInsets();
    const { styles, colors, getPressedStyle } = useThemedStyles(); 

    const rguid = params.rguid as string; // Check if we are editing
    const isEditMode = !!rguid;

    const [loading, setLoading] = useState(isEditMode);
    const [form, setForm] = useState(() => {
        const initial = getInitialFormState([]); // Placeholder
        const contextDate = (params.selectedDate && typeof params.selectedDate === 'string') 
            ? params.selectedDate 
            : new Date().toISOString().split('T')[0];

        return { 
            name: '',
            duration: '30',
            isEnabled: true,
            schedules: [{
                type: 'daily',
                startDate: contextDate,
                startTime: '08:00',
                customDays: '[]',
                frequencyHours: '',
                maxOccurrences: '1'
            }],
            tasks: [] 
        };
    });

    // --- LOAD DATA FOR EDIT MODE ---
    useEffect(() => {
        if (isEditMode) {
            const loadData = async () => {
                // We pass a dummy date just to get the master template structure
                const today = new Date().toISOString().split('T')[0];
                const existing = await RoutineService.getRoutineById(rguid, today, 0);
                
                if (existing) {
                    // Fetch the schedule specifically for the master
                    const all = await RoutineService.getAllRoutines();
                    const masterSched = all.find(r => r.rguid === rguid);

                    setForm({
                        name: existing.name,
                        duration: String(existing.duration),
                        isEnabled: existing.isEnabled,
                        schedules: [{
                            type: masterSched?.type || 'daily',
                            startDate: masterSched?.startDate || today,
                            startTime: masterSched?.startTime || '08:00',
                            customDays: masterSched?.customDays || '[]',
                            frequencyHours: String(masterSched?.frequencyHours || ''),
                            maxOccurrences: String(masterSched?.maxOccurrences || '1')
                        }],
                        tasks: existing.tasks || []
                    });
                }
                setLoading(false);
            };
            loadData();
        }
    }, [rguid]);

    // --- SCHEMA ---
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

    const [errors, setErrors] = useState(() => getInitialErrorState(schema));
    const [activeTab, setActiveTab] = useState('Routine'); 
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const activeSchema = useMemo(() => {
        if (activeTab === 'Tasks') {
            return [{
                sectionType: 'tasks' as const,
                label: 'ROUTINE TASKS',
                footer: 'Add steps to your routine. Long-press the handle to reorder.',
                fields: [] ,
                config: { showCheckmark: false, enableSwipeDelete: true }
            }];
        }
        const base = JSON.parse(JSON.stringify(schema));
        const scheduleSection = base.find((s: any) => s.repeaterKey === 'schedules');
        if (scheduleSection) {
            scheduleSection.fields.push({ key: 'customDays', ...fieldRegistry.routine_schedules.customDays });
            scheduleSection.fields.push({ key: 'frequencyHours', ...fieldRegistry.routine_schedules.frequencyHours });
            scheduleSection.fields.push({ key: 'maxOccurrences', ...fieldRegistry.routine_schedules.maxOccurrences });
        }
        return base;
    }, [activeTab, schema]);

    const hasErrors = useMemo(() => {
        return Object.values(errors).some(e => !!e) || !form?.name?.trim();
    }, [errors, form]);

    const handleSave = async () => {
        const newErrors = validateForm(form, activeSchema);
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setActiveTab('Routine');
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
            ]).start();
            return;
        }

        let success = false;
        if (isEditMode) {
            success = await RoutineService.updateRoutine( // Use RoutineService here
                rguid,
                form.name,
                parseInt(form.duration) || 0,
                form.schedules,
                form.tasks
            );
        } else {
            success = await dbService.createRoutine(
                form.name, 
                parseInt(form.duration) || 0, 
                form.schedules, 
                form.tasks
            );
        }

        if (success) {
            DeviceEventEmitter.emit('ROUTINE_UPDATE_SUCCESS');
            router.back();
        }
    };

    if (loading) {
        return (
            <View style={[styles.modalContainer, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.text} />
            </View>
        );
    }

    return (
        <View style={styles.modalContainer}>
            <View style={styles.sheetHandleContainer}><View style={styles.sheetHandle} /></View>
            
            <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.circularButton, getPressedStyle(pressed)]}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
                
                <Text style={styles.modalTitle}>{isEditMode ? 'Edit Routine' : 'New Routine'}</Text>

                <Pressable 
                    onPress={handleSave} 
                    style={({ pressed }) => [
                        styles.circularButton, 
                        getPressedStyle(pressed)
                    ]}
                >
                    <Ionicons name="checkmark" size={24} color={hasErrors ? colors.mutedText : colors.text} />
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
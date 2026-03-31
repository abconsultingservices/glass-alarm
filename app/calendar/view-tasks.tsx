import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, Animated, ScrollView, Platform, DeviceEventEmitter, ActivityIndicator, ActionSheetIOS } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { GlassFormRenderer } from '../../components/GlassFormRenderer';
import { Ionicons } from '@expo/vector-icons';
import { RoutineService } from '../../services/routineService';

export default function ViewTasks() {
    const router = useRouter();
    const params = useLocalSearchParams(); 
    const insets = useSafeAreaInsets();
    const { styles, colors, getPressedStyle } = useThemedStyles(); 

    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<any>({ tasks: [] });
    const [initialTasksState, setInitialTasksState] = useState<string>(''); // For QoL Change Tracking
    const [errors, setErrors] = useState({});
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // --- DYNAMIC SCHEMA ---
    const taskSchema = useMemo(() => [
        {
            sectionType: 'tasks' as const,
            label: 'ROUTINE TASKS',
            footer: 'Check off items or reorder as needed.',
            fields: [],
            config: {
                showCheckmark: true,
                enableSwipeDelete: true 
            }
        }
    ], []);

    // --- LOAD DATA ---
    useEffect(() => {
        const loadRoutine = async () => {
            if (params.routineId) {
                const data = await RoutineService.getRoutineById(
                    params.routineId as string,
                    params.date as string,
                    parseInt(params.instanceIndex as string || '0')
                );
                
                if (data) {
                    setForm(data);
                    // Snapshot the loaded state to compare later
                    setInitialTasksState(JSON.stringify(data.tasks));
                }
            }
            setLoading(false);
        };
        loadRoutine();
    }, [params.routineId, params.date, params.instanceIndex]);

    // --- FORM LISTENERS ---
    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('FORM_FIELD_UPDATE', (data) => {
            const { key, value, index, repeaterKey } = data;
            setForm((prev: any) => {
                const newForm = JSON.parse(JSON.stringify(prev));
                if (repeaterKey === 'tasks' && typeof index === 'number') {
                    newForm.tasks[index][key] = value;
                } else {
                    newForm[key] = value;
                }
                return newForm;
            });
        });
        return () => subscription.remove();
    }, []);

    const handleSave = async () => {
        const currentTasksState = JSON.stringify(form.tasks);
        const hasAnyChanges = currentTasksState !== initialTasksState;

        if (!hasAnyChanges) {
            router.back();
            return;
        }

        // 2. Check for STRUCTURAL changes (Name, Order, Add/Remove)
        // We do this by creating a version of both lists where 'completed' is stripped out
        const stripStatus = (tasks: any[]) => 
            tasks.map(({ completed, ...rest }) => rest);

        const initialStructure = JSON.stringify(stripStatus(JSON.parse(initialTasksState)));
        const currentStructure = JSON.stringify(stripStatus(form.tasks));
        
        const hasStructuralChanges = initialStructure !== currentStructure;

        // Helper function for the actual service call
        const executeSave = async (scope: 'instance' | 'day' | 'future') => {
            const success = await RoutineService.updateTaskInstances(
                params.routineId as string,
                params.date as string,
                parseInt(params.instanceIndex as string || '0'),
                form.tasks,
                scope
            );

            if (success) {
                DeviceEventEmitter.emit('ROUTINE_UPDATE_SUCCESS');
                router.back();
            } else {
                Animated.sequence([
                    Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
                    Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
                ]).start();
            }
        };

        // --- THE LOGIC GATE ---
        if (!hasStructuralChanges) {
            // If only completion status changed, save for this instance only and don't nag
            await executeSave('instance');
        } else {
            // If names, order, or task count changed, ask how to propagate
            if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        options: ['Cancel', 'This Instance Only', 'All Instances Today', 'All Future Instances'],
                        cancelButtonIndex: 0,
                        title: 'Save Changes',
                        message: 'You modified the routine structure. Apply this to other times?',
                    },
                    (buttonIndex) => {
                        if (buttonIndex === 1) executeSave('instance');
                        if (buttonIndex === 2) executeSave('day');
                        if (buttonIndex === 3) executeSave('future');
                    }
                );
            } else {
                await executeSave('instance');
            }
        }
    };

    if (loading) {
        return (
            <View style={[styles.modalContainer, { justifyContent: 'center', flex: 1, backgroundColor: colors.background }]}>
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
                
                <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={1}>{params.name || form.name || 'Tasks'}</Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>{params.date}</Text>
                </View>

                <Pressable 
                    onPress={handleSave} 
                    style={({ pressed }) => [
                        styles.circularButton, 
                        getPressedStyle(pressed), 
                        { borderColor: colors.error }
                    ]}
                >
                    <Ionicons name="checkmark" size={24} color={colors.error} />
                </Pressable>
            </View>

            <ScrollView 
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} 
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ transform: [{ translateX: shakeAnim }], flex: 1 }}>
                    <GlassFormRenderer 
                        schema={taskSchema}
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
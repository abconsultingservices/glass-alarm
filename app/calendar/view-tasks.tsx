import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, Pressable, Animated, ScrollView, Platform, DeviceEventEmitter, ActivityIndicator } from 'react-native';
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
    const [errors, setErrors] = useState({});
    const shakeAnim = useRef(new Animated.Value(0)).current;

    // --- DYNAMIC SCHEMA ---
    // The GlassFormRenderer 'tasks' section handles rendering individual items.
    // We pass custom props to indicate we want "check" mode instead of "delete" mode.
    const taskSchema = useMemo(() => [
        {
            sectionType: 'tasks' as const,
            label: 'ROUTINE TASKS',
            footer: 'Check off items or reorder as needed.',
            fields: [],
            config: {
                showCheckmark: true, // Custom flag for your renderer
                enableSwipeDelete: true 
            }
        }
    ], []);

    // --- LOAD DATA ---
    useEffect(() => {
        const loadRoutine = async () => {
            if (params.routineId) {
                const data = await RoutineService.getRoutineById(params.routineId as string);
                if (data) {
                    // Ensure the tasks match the form structure (mapping 'text' from DB to 'title' for renderer)
                    setForm(data);
                }
            }
            setLoading(false);
        };
        loadRoutine();
    }, [params.routineId]);

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
        const success = await RoutineService.updateRoutineTasks(
            params.routineId as string, 
            form.tasks
        );

        if (success) {
            router.back();
        } else {
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
            ]).start();
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
                    <Text style={styles.modalTitle}>{params.name || form.name || 'Tasks'}</Text>
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
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
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
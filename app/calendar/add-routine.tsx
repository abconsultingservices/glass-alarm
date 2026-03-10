import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dbService } from '../../services/DatabaseService';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { GlassFormRenderer, Section } from '../../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState } from '../../utils/ValidationEngine';
import { Ionicons } from '@expo/vector-icons';

const ADD_SCHEMA: Section[] = [
    {
        sectionType: 'pills',
        label: 'ROUTINE DETAILS',
        fields: [
            { key: 'name', label: 'Name', validation: [{ type: 'required', errorMsg: 'Required' }] },
            { key: 'duration', label: 'Duration (Mins)', config: { keyboardType: 'number-pad' } }
        ]
    },
    {
        sectionType: 'insetGroup',
        label: 'SCHEDULE',
        footer: 'Setting "Max Hits" and "Frequency" creates the multi-bottle water effect.',
        fields: [
            { key: 'startTime', label: 'Start Time', config: { placeholder: '08:00' } },
            { key: 'type', label: 'Repeat', config: { defaultValue: 'daily' } },
            { key: 'frequencyHours', label: 'Every X Hours', config: { keyboardType: 'number-pad' } },
            { key: 'maxOccurrences', label: 'Max Daily Hits', config: { keyboardType: 'number-pad' } }
        ]
    }
];

export default function AddRoutine() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { styles, colors, getPressedStyle } = useThemedStyles(); 

    const [form, setForm] = useState(() => getInitialFormState(ADD_SCHEMA));
    const [errors, setErrors] = useState(() => getInitialErrorState(ADD_SCHEMA));
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    };

    const handleSave = async () => {
        if (!form.name || !form.startTime) {
            triggerShake();
            return;
        }

        const success = await dbService.createRoutine(form.name, parseInt(form.duration) || 30, {
            startTime: form.startTime,
            type: form.type || 'daily',
            frequencyHours: parseInt(form.frequencyHours),
            maxOccurrences: parseInt(form.maxOccurrences)
        });

        if (success) router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={[styles.calendarHeaderRow, { paddingHorizontal: 20 }]}>
                <Pressable onPress={() => router.back()} style={styles.glassPill}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
                <Text style={[styles.buttonText, { color: colors.text }]}>New Routine</Text>
                <View style={{ width: 40 }} /> 
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <GlassFormRenderer 
                    schema={ADD_SCHEMA}
                    form={form}
                    setForm={setForm}
                    errors={errors}
                    setErrors={setErrors}
                />
            </ScrollView>

            <Animated.View style={[styles.floatingButtonContainer, { bottom: Math.max(insets.bottom, 20), transform: [{ translateX: shakeAnim }] }]}>         
                <Pressable 
                    style={({ pressed }) => [styles.button, getPressedStyle(pressed), { backgroundColor: colors.primary }]} 
                    onPress={handleSave}
                >
                    <Text style={styles.buttonText}>Create Routine</Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}
import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Animated, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dbService } from '../../services/DatabaseService';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { GlassFormRenderer, Section } from '../../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState, validateValue } from '../../utils/ValidationEngine';
import { Ionicons } from '@expo/vector-icons';

const ADD_SCHEMA: Section[] = [
    {
        sectionType: 'pills',
        fields: [
            { 
                key: 'name', 
                label: 'Title', 
                validation: [{ type: 'required', errorMsg: 'Required' }], 
                config: { placeholder: 'Title' } 
            },
            { 
                key: 'location', 
                label: 'Location', 
                config: { placeholder: 'Location or Video Call' } 
            }
        ]
    },
    {
        sectionType: 'insetGroup',
        label: 'SCHEDULE',
        footer: 'Multi-hit routines (like water) will automatically expand on your calendar.',
        fields: [
            { key: 'startTime', label: 'Starts', config: { placeholder: '08:00' } },
            { key: 'duration', label: 'Duration (Mins)', config: { keyboardType: 'number-pad', placeholder: '30' } },
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
    const [activeTab, setActiveTab] = useState('Routine'); 

    const shakeAnim = useRef(new Animated.Value(0)).current;

    // Derived state for error detection
    const hasErrors = Object.values(errors).some(error => error !== null);

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
        ]).start();
    };

    const handleSave = async () => {
        // Final validation check before saving
        const newErrors: any = {};
        let validationFailed = false;

        ADD_SCHEMA.forEach(section => {
            section.fields.forEach(field => {
                if (field.validation) {
                    const errorMsg = validateValue(form[field.key], field.validation);
                    if (errorMsg) {
                        newErrors[field.key] = errorMsg;
                        validationFailed = true;
                    }
                }
            });
        });

        if (validationFailed) {
            setErrors(newErrors);
            triggerShake();
            return;
        }

        const success = await dbService.createRoutine(form.name, form.duration || '30', {
            startTime: form.startTime,
            type: form.type || 'daily',
            frequencyHours: form.frequencyHours,
            maxOccurrences: form.maxOccurrences
        });

        if (success) router.back();
    };

    return (
        <View style={styles.modalContainer}>
            <View style={styles.sheetHandleContainer}><View style={styles.sheetHandle} /></View>
            <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
                <Pressable 
                    onPress={() => router.back()} 
                    style={({ pressed }) => [styles.circularButton, getPressedStyle(pressed)]}
                >
                    <Ionicons name="close" size={20} color={colors.text} />
                </Pressable>
                
                <Text style={styles.modalTitle}>New</Text>

                <Pressable 
                    onPress={handleSave} 
                    style={({ pressed }) => [
                        styles.circularButton, 
                        getPressedStyle(pressed),
                        hasErrors && { backgroundColor: 'rgba(255, 69, 58, 0.15)' } // Subtle red glow on error
                    ]}
                >
                    <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color={hasErrors ? colors.error : colors.text} 
                    />
                </Pressable>
            </View>

            {/* --- SEGMENTED TABS (Routine | Tasks) --- */}
            <View style={styles.segmentContainer}>
                <View style={styles.segmentBackground}>
                    {['Routine', 'Tasks'].map((tab) => (
                        <Pressable 
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[
                                styles.segmentItem,
                                activeTab === tab && styles.segmentItemActive
                            ]}
                        >
                            <Text style={[
                                styles.segmentText,
                                activeTab === tab && { fontWeight: '600' }
                            ]}>
                                {tab}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <ScrollView 
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <GlassFormRenderer 
                        schema={ADD_SCHEMA}
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
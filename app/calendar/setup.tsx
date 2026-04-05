import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dbService } from '../../services/DatabaseService';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { GlassFormRenderer, Section } from '../../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState } from '../../utils/ValidationEngine';

const SETUP_SCHEMA: Section[] = [
    {
        sectionType: 'pills',
        label: 'PROFILE BASICS',
        fields: [
            { 
                key: 'firstName', 
                label: 'First Name', 
                type: 'text',
                validation: [{ type: 'required', errorMsg: 'First name is required' }],
                config: { autoCapitalize: 'words' } 
            },
            { 
                key: 'lastName', 
                label: 'Last Name', 
                type: 'text',
                validation: [{ type: 'required', errorMsg: 'Last name is required' }],
                config: { autoCapitalize: 'words' } 
            }
        ]
    },
    {
        sectionType: 'insetGroup',
        label: 'ACCOUNT & FAMILY',
        footer: 'All data remains local on this device. We never upload your routines.',
        fields: [
            { 
                key: 'email', 
                label: 'Email Address', 
                type: 'text',
                validation: [{ type: 'email', errorMsg: 'Invalid email' }],
                config: { autoCapitalize: 'none', keyboardType: 'email-address' } 
            },
            { 
                key: 'groupName', 
                label: 'Group Name', 
                type: 'text',
                validation: [{ type: 'required', errorMsg: 'A group name is required' }],
                config: { autoCapitalize: 'words', placeholder: 'e.g. The Smiths' } 
            },
        ]
    }
];

export default function Setup() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { styles, colors, getPressedStyle } = useThemedStyles(); 

    const [form, setForm] = useState(() => getInitialFormState(SETUP_SCHEMA));
    const [fieldErrors, setFieldErrors] = useState(() => getInitialErrorState(SETUP_SCHEMA));
    const [isRecovering, setIsRecovering] = useState(true);

    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const verifySession = async () => {
            await dbService.recoverSetupGuids();
            setIsRecovering(false);
        };
        verifySession();
    }, []);

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    };

    const isInvalid = !form.firstName || !form.lastName || !form.email || !form.groupName || 
                       Object.values(fieldErrors).some(e => e !== '');

    const handleSave = async () => {
        if (isInvalid) {
            triggerShake();
            return;
        }
        const success = await dbService.updateSetupData(form.firstName, form.lastName, form.email, form.groupName);
        if (success) router.replace('/calendar');
    };

    if (isRecovering) {
        return (
            <View style={[styles.modalContainer, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.text} />
            </View>
        );
    }

    return (
        <View style={styles.modalContainer}>
            {/* iOS Grabber */}
            <View style={styles.sheetHandleContainer}><View style={styles.sheetHandle} /></View>
            
            {/* Standard Header - matching add-routine */}
            <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
                <Pressable onPress={() => router.replace('/calendar')} style={({ pressed }) => [styles.circularButton, getPressedStyle(pressed)]}>
                    <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
                
                <Text style={styles.modalTitle}>Setup Profile</Text>

                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <Pressable 
                        onPress={handleSave} 
                        style={({ pressed }) => [
                            styles.circularButton, 
                            getPressedStyle(pressed),
                            !isInvalid && { backgroundColor: colors.success + '15' }
                        ]}
                    >
                        <Ionicons name="checkmark" size={24} color={isInvalid ? colors.mutedText : colors.success} />
                    </Pressable>
                </Animated.View>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 20, marginTop: 10 }}>
                <GlassFormRenderer 
                    schema={SETUP_SCHEMA}
                    form={form}
                    setForm={setForm}
                    errors={fieldErrors}
                    setErrors={setFieldErrors}
                />
            </View>
        </View>
    );
}
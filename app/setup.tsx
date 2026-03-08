import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dbService } from '../services/DatabaseService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { GlassFormRenderer, Section } from '../components/GlassFormRenderer';
import { getInitialFormState, getInitialErrorState } from '../utils/ValidationEngine';

// Define Schema at top to prevent "access before initialization" errors
const SETUP_SCHEMA: Section[] = [
    {
        sectionType: 'pills',
        label: 'INDIVIDUAL PILLS',
        fields: [
            { 
                key: 'name', 
                label: 'Name', 
                validation: [{ type: 'required', errorMsg: 'Name is required' },
                  { type: 'length', minLength: 2, errorMsg: 'Name is too short' }],
                config: { autoCapitalize: 'words', textContentType: 'name' } 
            }/*,
            {
                key: 'handle',
                label: 'User Handle',
                defaultValue: 'randomhandle',
                overrideFilter: /[^a-zA-Z0-9]/g,
                validation: [{ type: 'length', minLength: 3, errorMsg: 'Too short' }],
                config: { autoCapitalize: 'none' }
            }*/
        ]
    },
    {
        sectionType: 'insetGroup',
        label: 'INSET GROUP',
        footer: 'iPhone can securely monitor your profile data and alert you to syncing issues.',
        fields: [
            { 
                key: 'email', 
                label: 'Email', 
                validation: [{ type: 'email', errorMsg: 'Invalid email address' }],
                config: { autoCapitalize: 'none', keyboardType: 'email-address', textContentType: 'emailAddress' } 
            },
            { 
                key: 'phone', 
                label: 'Phone', 
                subtext: 'Include + and country code for international.',
                validation: [{ type: 'phone', errorMsg: 'Invalid phone format' }],
                config: { autoCapitalize: 'none', keyboardType: 'numbers-and-punctuation', textContentType: 'telephoneNumber' } 
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

    // --- Shake Animation Hook ---
    const shakeAnim = useRef(new Animated.Value(0)).current;

    const triggerShake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    };

    const isInvalid = !form.name || !form.email || Object.values(fieldErrors).some(e => e !== '');

    const handlePress = async () => {
        if (isInvalid) {
            triggerShake();
            return;
        }

        try {
            await dbService.createUser(form.name, form.email, form.phone);
            router.replace('/dashboard');
        } catch (e) { 
            console.error(e); 
        }
    };

    const handleCancel = async () => {
        await AlarmManager.cancelAllAlarms();
        alert("All alarms cancelled.");
    };

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20), paddingTop: insets.top }]}>
            <Text style={[styles.title, { marginBottom: 30 }]}>Setup Profile</Text>

            <GlassFormRenderer 
                schema={SETUP_SCHEMA}
                form={form}
                setForm={setForm}
                errors={fieldErrors}
                setErrors={setFieldErrors}
            />

            {/* Bottom Anchored Button with Shake Wrapper */}
            <Animated.View 
                style={[
                    styles.floatingButtonContainer, 
                    { 
                        bottom: Math.max(insets.bottom, 20), 
                        transform: [{ translateX: shakeAnim }] 
                    }
                ]}
            >         
                <Pressable 
                    style={({ pressed }) => [
                        styles.button, 
                        getPressedStyle(pressed),
                        { backgroundColor: isInvalid ? colors.mutedText : colors.primary }
                    ]} 
                    onPress={handlePress}
                >
                    <Text style={styles.buttonText}>Save & Enter</Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}